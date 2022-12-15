import { Relayer } from 'defender-relay-client';
import { BigNumber, Contract, ethers } from 'ethers';
import { generalConfigurations } from '../configurations/general.conf';
import { CHAINLINK_AGGREGATOR_V3 } from '../models/contracts/chainlink-aggregator-v3.abi';
import { ENSControllerABI } from '../models/contracts/ens-controller.abi';
import { ERC20ABI } from '../models/contracts/erc20.abi';
import { GPV2_ABI } from '../models/contracts/gpv2.abi';
import { MULTISEND_ABI } from '../models/contracts/multisend.abi';
import { ROLES_MODFIED_ABI } from '../models/contracts/roles-modifier.abi';
import { CowswapTradeKindEnum } from '../models/cowswap-trade-kind.enum';
import { EnvironmentsEnum } from '../models/environments.enum';
import { GnosisOperationEnum } from '../models/gnosis-operation.enum';
import { StableCoinModel } from '../models/stablecoin.model';
import { getERC20Balance, resolveAddress } from './accounts.service';
import {
  is0xAddressValid,
  isEnsAddressValid,
  isNumeric,
  isValidTimestamp,
} from './misc.service';

export async function getEthUsdRate(
  provider: any,
  environment: EnvironmentsEnum,
) {
  try {
    const chainlink = new Contract(
      generalConfigurations.chainlinkEthUsdOracleAddress[environment],
      CHAINLINK_AGGREGATOR_V3,
      provider,
    );
    const roundData = await chainlink.latestRoundData();
    if (roundData === false || roundData === null) {
      throw false;
    }
    return ((roundData as any).answer.toNumber() / 10 ** 8).toString();
  } catch (e) {
    console.log('(getEthUsdRate) An unknown error has occured', e);
    return false;
  }
}

export function calculateEthRequiredForSwap(
  stablecoinsAmount: number,
  ethUsdRate: number,
) {
  try {
    if (stablecoinsAmount < ethUsdRate) {
      return (1 / ethUsdRate) * stablecoinsAmount;
    }
    return stablecoinsAmount / ethUsdRate;
  } catch (e) {
    console.log(
      '(calculateEthRequiredForSwap) An unknown error has occured',
      e,
    );
    return false;
  }
}

export function calculateDifferenceBetweenBalanceAndDesiredAmont(
  desiredAmount: BigNumber,
  balance: BigNumber,
) {
  try {
    if (balance.gte(desiredAmount) === true) {
      return false;
    }
    return desiredAmount.sub(balance).toHexString();
  } catch (e) {
    console.log(
      '(calculateDifferenceBetweenBalanceAndDesiredAmont) An unknown error has occured',
      e,
    );
    return false;
  }
}

/**
 * Get the stablecoin balance of walletAddress
 *
 * @param provider
 * @param walletAddress
 * @param stablecoins
 * @returns
 */
export async function getAllUSDBalance(
  provider: any,
  walletAddress: string,
  stablecoins: StableCoinModel[],
) {
  try {
    const stablecoinHoldings = {} as { [token: string]: StableCoinModel };
    for await (const s of stablecoins) {
      const ensStablecoinBalance = await getERC20Balance(
        provider,
        walletAddress,
        s.address,
      );
      stablecoinHoldings[s.token] = {
        token: s.token,
        address: s.address,
        decimals: s.decimals,
        desiredAmount: s.desiredAmount,
        balance: ensStablecoinBalance,
      };
    }
    return stablecoinHoldings;
  } catch (e) {
    console.log('(getAllUSDBalance) An unknown error has occured', e);
    return false;
  }
}

/**
 * Filter stablecoins that do not have balance over desiredUsdBalanceInSourceAccount (configuration)
 *
 * @param stablecoinHoldings
 * @returns
 */
export async function filterStablcoinsBelowThreshold(stablecoinHoldings: {
  [token: string]: StableCoinModel;
}) {
  try {
    const stablecoinsQualifiedForProcessing = {} as {
      [token: string]: StableCoinModel;
    };
    for await (const s of Object.keys(stablecoinHoldings)) {
      const stablecoin = stablecoinHoldings[s];
      const baseStablecoinsDifferenceCalculation =
        calculateDifferenceBetweenBalanceAndDesiredAmont(
          stablecoin.desiredAmount as BigNumber,
          stablecoin.balance as BigNumber,
        );
      if (baseStablecoinsDifferenceCalculation === false) {
        console.log('Sufficient balance for', s);
        continue;
      }
      const deficitBalanceDecimal = ethers.utils.formatUnits(
        ethers.BigNumber.from(baseStablecoinsDifferenceCalculation),
        stablecoin.decimals,
      );
      stablecoinsQualifiedForProcessing[s] = {
        ...stablecoin,
        amountDeficit: ethers.BigNumber.from(
          baseStablecoinsDifferenceCalculation,
        ),
        amountDeficitDecimal: deficitBalanceDecimal,
      };
    }
    return stablecoinsQualifiedForProcessing;
  } catch (e) {
    console.log(
      '(filterStablcoinsBelowThreshold) An unknown error has occured',
      e,
    );
    return false;
  }
}

/**
 * Filter
 */
export function filterNonZeroStablecoinBalance(stablecoinHoldings: {
  [token: string]: StableCoinModel;
}) {
  try {
    const stablecoinsQualifiedForProcessing = {} as {
      [token: string]: StableCoinModel;
    };
    for (const s of Object.keys(stablecoinHoldings)) {
      const stablecoin = stablecoinHoldings[s];
      if (stablecoin.balance?.toString() === '0') {
        console.log('No balance for', s);
        continue;
      }
      stablecoinsQualifiedForProcessing[s] = stablecoin;
    }
    return stablecoinsQualifiedForProcessing;
  } catch (e) {
    console.log(
      '(filterNonZeroStablecoinBalance) An unknown error has occured',
      e,
    );
    return false;
  }
}

/**
 * Format the Stablecoins noted on the confiuration to model
 *
 * @param environment
 * @returns
 */
export function stablecoinConfigurationToModel(environment: EnvironmentsEnum) {
  try {
    const stablecoinsList =
      generalConfigurations.stablecoinsAddresses[environment];
    const stablecoins: StableCoinModel[] = Object.keys(
      generalConfigurations.stablecoinsAddresses[environment],
    ).map((s) => {
      const desiredAmountOfUsdInWallet = ethers.utils.parseUnits(
        generalConfigurations.desiredUsdBalanceInSourceAccount[environment][
          s
        ].toString(),
        stablecoinsList[s].decimals,
      );
      return {
        token: s,
        address: stablecoinsList[s].address,
        decimals: stablecoinsList[s].decimals,
        desiredAmount: desiredAmountOfUsdInWallet,
      } as StableCoinModel;
    });
    return stablecoins;
  } catch (e) {
    console.log(
      '(stablecoinConfigurationToModel) An unknown error has occured',
      e,
    );
    return false;
  }
}

/**
 * Convert ETH to WETH
 *
 * @param environment
 * @param provider
 * @param amountToDeposit
 * @returns
 */
export function createTxDepositETHtoWETHContract(
  environment: string,
  provider: any,
  amountToDeposit: BigNumber,
) {
  try {
    if (
      typeof amountToDeposit !== 'object' ||
      '_isBigNumber' in amountToDeposit === false ||
      '_hex' in amountToDeposit === false
    ) {
      throw 'Invalid amountToDeposit';
    }
    const weth = new Contract(
      generalConfigurations.wethAddress[environment],
      ERC20ABI,
      provider,
    );
    const depositCall = weth.interface.encodeFunctionData('deposit');
    const encodeDepositCall = ethers.utils.solidityPack(
      ['uint8', 'address', 'uint256', 'uint256', 'bytes'],
      [
        GnosisOperationEnum.CALL,
        generalConfigurations.wethAddress[environment],
        amountToDeposit,
        ethers.utils.hexDataLength(depositCall),
        depositCall,
      ],
    );
    return encodeDepositCall;
  } catch (e) {
    console.log(
      '(createTxDepositETHtoWETHContract) An unknown error has occured',
      e,
    );
    return false;
  }
}

/**
 * Approve role modifier to transfer amountToApprove of ERC20
 *
 * @param environment
 * @param provider
 * @param amountToApprove - hex string - amount to approve
 * @returns
 */
export function createTxApproveERC20Transfer(
  provider: any,
  erc20Address: string,
  ABI: any[],
  approveTo: string,
  amountToApprove: BigNumber,
) {
  try {
    if (
      typeof amountToApprove !== 'object' ||
      '_isBigNumber' in amountToApprove === false ||
      '_hex' in amountToApprove === false
    ) {
      throw 'Invalid amountToApprove';
    }
    const isEnsAddres = erc20Address.indexOf('.eth') > -1;
    if (isEnsAddres === false && is0xAddressValid(erc20Address) === false) {
      throw 'Invalid ERC20 Address';
    }
    if (isEnsAddres === true && isEnsAddressValid(erc20Address) === false) {
      throw 'Invalid ERC20 Address';
    }
    const isEnsToAddres = approveTo.indexOf('.eth') > -1;
    if (isEnsToAddres === false && is0xAddressValid(approveTo) === false) {
      throw 'Invalid ERC20 Address';
    }
    if (isEnsToAddres === true && isEnsAddressValid(approveTo) === false) {
      throw 'Invalid ERC20 Address';
    }
    const erc20 = new Contract(erc20Address, ABI, provider);
    const approveCall = erc20.interface.encodeFunctionData('approve', [
      approveTo,
      amountToApprove,
    ]);
    const encodeApproveCall = ethers.utils.solidityPack(
      ['uint8', 'address', 'uint256', 'uint256', 'bytes'],
      [
        GnosisOperationEnum.CALL,
        erc20Address,
        0,
        ethers.utils.hexDataLength(approveCall),
        approveCall,
      ],
    );
    return encodeApproveCall;
  } catch (e) {
    console.log(
      '(createTxApproveERC20Transfer) An unknown error has occured',
      e,
    );
    return false;
  }
}

/**
 * Create Transfer ERC20 transaction
 *
 * @param environment
 * @param provider
 * @param transferTo
 * @param amount
 * @returns
 */
export function createTxTransfeERC20(
  provider: any,
  erc20Address: string,
  ABI: any[],
  transferTo: string,
  amount: BigNumber,
) {
  try {
    if (
      typeof amount !== 'object' ||
      '_isBigNumber' in amount === false ||
      '_hex' in amount === false
    ) {
      throw 'Invalid amountToApprove';
    }
    const isEnsAddres = erc20Address.indexOf('.eth') > -1;
    if (isEnsAddres === false && is0xAddressValid(erc20Address) === false) {
      throw 'Invalid ERC20 Address';
    }
    if (isEnsAddres === true && isEnsAddressValid(erc20Address) === false) {
      throw 'Invalid ERC20 Address';
    }
    const isEnsToAddres = transferTo.indexOf('.eth') > -1;
    if (isEnsToAddres === false && is0xAddressValid(transferTo) === false) {
      throw 'Invalid ERC20 Address';
    }
    if (isEnsToAddres === true && isEnsAddressValid(transferTo) === false) {
      throw 'Invalid ERC20 Address';
    }
    const erc20 = new Contract(erc20Address, ABI, provider);
    const transferWethCall = erc20.interface.encodeFunctionData('transfer', [
      transferTo,
      amount,
    ]);
    const encodeTransferCall = ethers.utils.solidityPack(
      ['uint8', 'address', 'uint256', 'uint256', 'bytes'],
      [
        GnosisOperationEnum.CALL,
        erc20Address,
        0,
        ethers.utils.hexDataLength(transferWethCall),
        transferWethCall,
      ],
    );
    return encodeTransferCall;
  } catch (e) {
    console.log('(createTxTransfeERC20) An unknown error has occured', e);
    return false;
  }
}

/**
 * Create batched transaction
 *
 * @param environment
 * @param provider
 * @param rawTransactions
 * @returns
 */
export function createTxBatch(
  environment: EnvironmentsEnum,
  provider: any,
  rawTransactions: string[],
) {
  try {
    for (const t of rawTransactions) {
      if (ethers.utils.isBytesLike(t) === false) {
        throw 'Corrupt tx data';
      }
    }
    const transactions = rawTransactions.map((t) => t.substring(2)).join('');
    const zodiacRolesModifierMultisend = new Contract(
      generalConfigurations.gnosisZodiacRoleModifierMultisendAddress[
        environment
      ],
      MULTISEND_ABI,
      provider,
    );
    const zodiacRolesModifier = new Contract(
      generalConfigurations.gnosisZodiacRoleModifierAddress[environment],
      ROLES_MODFIED_ABI,
      provider,
    );
    const multisend = zodiacRolesModifierMultisend.interface.encodeFunctionData(
      'multiSend',
      ['0x' + transactions],
    );
    const zodiacBatchTxCall = zodiacRolesModifier.interface.encodeFunctionData(
      'execTransactionWithRole',
      [
        generalConfigurations.gnosisZodiacRoleModifierMultisendAddress[
          environment
        ],
        0,
        multisend,
        GnosisOperationEnum.DELEGATE_CALL,
        1,
        false,
      ],
    );
    return zodiacBatchTxCall;
  } catch (e) {
    console.log('(createTxBatch) An unknown error has occured', e);
    return false;
  }
}

export function createTxWithdrawETHFromEnsController(
  ensControllerAddress: string,
  provider: any,
) {
  try {
    const erc20 = new Contract(
      ensControllerAddress,
      ENSControllerABI,
      provider,
    );
    const withdrawCall = erc20.interface.encodeFunctionData('withdraw');
    const encodeWithdrawCall = ethers.utils.solidityPack(
      ['uint8', 'address', 'uint256', 'uint256', 'bytes'],
      [
        GnosisOperationEnum.CALL,
        ensControllerAddress,
        0,
        ethers.utils.hexDataLength(withdrawCall),
        withdrawCall,
      ],
    );
    return encodeWithdrawCall;
  } catch (e) {
    console.log(
      '(createTxWithdrawETHFromMultisig) An unknown error has occured',
      e,
    );
    return false;
  }
}

export async function getGasLimitEstimation(
  provider: any,
  to: string,
  from: string,
  data: string,
  value: string = '0x0',
) {
  try {
    const estimation = await provider.estimateGas({
      to,
      from,
      data,
      value,
    });
    if (estimation === null) {
      throw false;
    }
    return estimation;
  } catch (e) {
    console.log('(getGasLimitEstimation) An unknown error has occured', e);
    return false;
  }
}

export async function createTxApproveCowswapOrder(
  gpv2address: string,
  provider: any,
  sellToken: string,
  buyToken: string,
  receiver: string,
  sellAmount: string,
  buyAmount: string,
  validTo: number,
  feeAmount: string,
  kind: string,
  sellTokenBalance: string,
  buyTokenBalance: string,
  orderUid: string,
) {
  try {
    if (
      isNumeric(parseInt(buyAmount)) === false ||
      isNumeric(parseInt(sellAmount)) === false ||
      buyAmount === '0' ||
      parseInt(buyAmount) < 0 ||
      sellAmount === '0' ||
      parseInt(sellAmount) < 0
    ) {
      throw 'Invalid buyAmount or sellAmount';
    }
    if (ethers.utils.isBytesLike(orderUid) === false) {
      throw 'Invalid OrderUID';
    }
    if (isValidTimestamp(validTo * 1000) === false) {
      throw 'Invalid validTimeOfOrder';
    }
    const tradeKinds = Object.values(CowswapTradeKindEnum).map((k) =>
      ethers.utils.formatBytes32String(k),
    );
    if (tradeKinds.includes(kind) === false) {
      throw 'Invalid kind';
    }
    let trueSellToken: string | boolean = sellToken;
    const sellTokenIsEns = trueSellToken.indexOf('.eth') > -1;
    if (trueSellToken.indexOf('.eth') > -1) {
      trueSellToken = await resolveAddress(provider, trueSellToken);
    }
    if (
      trueSellToken === false ||
      (sellTokenIsEns === true && isEnsAddressValid(sellToken) === false) ||
      (sellTokenIsEns === false && is0xAddressValid(sellToken) === false)
    ) {
      throw 'Invalid sellToken';
    }
    let trueBuyToken: string | boolean = buyToken;
    const buyTokenIsEns = trueBuyToken.indexOf('.eth') > -1;
    if (trueBuyToken.indexOf('.eth') > -1) {
      trueBuyToken = await resolveAddress(provider, trueBuyToken);
    }
    if (
      trueBuyToken === false ||
      (buyTokenIsEns === true && isEnsAddressValid(buyToken) === false) ||
      (buyTokenIsEns === false && is0xAddressValid(buyToken) === false)
    ) {
      throw 'Invalid buyToken';
    }
    let trueReceiver: string | boolean = receiver;
    const receiverIsEns = trueReceiver.indexOf('.eth') > -1;
    if (trueReceiver.indexOf('.eth') > -1) {
      trueReceiver = await resolveAddress(provider, trueReceiver);
    }
    if (
      trueReceiver === false ||
      (buyTokenIsEns === true && isEnsAddressValid(receiver) === false) ||
      (buyTokenIsEns === false && is0xAddressValid(receiver) === false)
    ) {
      throw 'Invalid buyToken';
    }
    let trueGpv2Address = gpv2address;
    const gpv2IsEns = trueGpv2Address.indexOf('.eth') > -1;
    if (
      (gpv2IsEns === true && isEnsAddressValid(gpv2address) === false) ||
      (gpv2IsEns === false && is0xAddressValid(gpv2address) === false)
    ) {
      throw 'Invalid gpv2address';
    }
    const gpv2 = new Contract(trueGpv2Address as string, GPV2_ABI, provider);
    const gpv2Call = gpv2.interface.encodeFunctionData('approveOrder', [
      trueSellToken,
      trueBuyToken,
      trueReceiver,
      sellAmount,
      buyAmount,
      validTo,
      feeAmount,
      kind,
      sellTokenBalance,
      buyTokenBalance,
      orderUid,
    ]);
    const encodeGpv2Call = ethers.utils.solidityPack(
      ['uint8', 'address', 'uint256', 'uint256', 'bytes'],
      [
        GnosisOperationEnum.DELEGATE_CALL,
        trueGpv2Address,
        0,
        ethers.utils.hexDataLength(gpv2Call),
        gpv2Call,
      ],
    );
    return encodeGpv2Call;
  } catch (e) {
    console.log(
      '(createTxApproveCowswapOrder) An unknown error has occured',
      e,
    );
    return false;
  }
}

export async function performBatchedTransaction(
  environment: EnvironmentsEnum,
  relayerAddress: string,
  provider: any,
  batchedTransactions: string,
  relayer: Relayer,
  value = '0x0',
) {
  try {
    const to =
      generalConfigurations.gnosisZodiacRoleModifierAddress[environment];
    const from = relayerAddress;
    const gasLimit = await getGasLimitEstimation(
      provider,
      to,
      from,
      batchedTransactions,
      value,
    );
    if (gasLimit === false) {
      throw 'Invalid gas limit';
    }
    if (relayer === null || relayer === undefined) {
      throw 'Invalid relayer';
    }
    const tx = await relayer.sendTransaction({
      to: generalConfigurations.gnosisZodiacRoleModifierAddress[environment],
      value: 0,
      data: batchedTransactions as string,
      gasLimit: '2000000',
      speed: 'fast',
    });
    return tx;
  } catch (e) {
    console.log('(performBatchedTransaction) An unknown error has occured', e);
    return false;
  }
}

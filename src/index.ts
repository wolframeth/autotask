import { Relayer } from 'defender-relay-client';
import { RelayerModel, RelayerParams } from 'defender-relay-client/lib/relayer';
import { generalConfigurations } from './configurations/general.conf';
import {
  EnvironmentsEnum,
  EnvironmentsIdsEnum,
} from './models/environments.enum';
import { DefenderRelayProvider } from 'defender-relay-client/lib/ethers';
import {
  createTxApproveCowswapOrder,
  createTxApproveERC20Transfer,
  createTxBatch,
  createTxDepositETHtoWETHContract,
  createTxTransfeERC20,
  createTxWithdrawETHFromEnsController,
  filterNonZeroStablecoinBalance,
  filterStablcoinsBelowThreshold,
  getAllUSDBalance,
  getEthUsdRate,
  performBatchedTransaction,
  stablecoinConfigurationToModel,
} from './services/treasury.service';
import { BigNumber, ethers } from 'ethers';
import { ERC20ABI } from './models/contracts/erc20.abi';
import { getERC20Balance, getETHBalance } from './services/accounts.service';
import {
  getCowSwapPlaceOrder,
  getCowSwapTradeQuote,
} from './services/cowswap.service';
import { CowswapTradeKindEnum } from './models/cowswap-trade-kind.enum';
import { CowSwapSuccessResponseModel } from './models/cowswap-success-response.model';
import { EnvInfo } from './models/dot-env.type';
import { simulate } from './services/tenderly.service';

export async function handler(credentials: RelayerParams) {
  if (
    credentials === null ||
    (require.main === module &&
      ('apiKey' in credentials === false ||
        'apiKey' in credentials === null ||
        'apiSecret' in credentials === false ||
        'apiSecret' in credentials === null)) ||
    (require.main !== module &&
      ('credentials' in credentials === false ||
        'relayerARN' in credentials === false))
  ) {
    console.log('Relayer credentials are incorrect. Aborting operation.');
    return;
  }
  const provider = new DefenderRelayProvider(credentials);
  const relayer = new Relayer(credentials);
  const relayerInfo = (await relayer.getRelayer()) as RelayerModel;
  const environment = relayerInfo.network as EnvironmentsEnum;
  if (generalConfigurations.validEnvironments.includes(environment) === false) {
    console.log('Network is not supported. Aborting operation.');
    return;
  }
  const ethUsdRate = await getEthUsdRate(provider, environment);
  if (ethUsdRate === false) {
    console.log('ETH USD unresolved. Aborting operation.');
    return;
  }
  const ensWallet = generalConfigurations.ensWallet[environment];
  const ensMultisigWallet =
    generalConfigurations.gnosisSafeAddress[environment];
  const stablecoins = stablecoinConfigurationToModel(environment);
  if (stablecoins === false) {
    console.log('Stablecoins list is corrupted. Aborting operation.');
    return;
  }

  /**
   * Get all the stablecoin balances
   */
  const stablecoinHoldings = await getAllUSDBalance(
    provider,
    ensWallet,
    stablecoins,
  );
  if (stablecoinHoldings === false) {
    console.log('Stablecoin balance query failed. Aborting operation.');
    return;
  }

  /**
   * Check the stablecoin balance of wallet. and pick the non-zero ones
   */
  const stablecoinMultisigHoldings = await getAllUSDBalance(
    provider,
    ensMultisigWallet,
    stablecoins,
  );
  if (stablecoinMultisigHoldings === false) {
    console.log(
      'Stablecoin multisig balance query failed. Aborting operation.',
    );
    return;
  }
  const availableStablecoinsInMultisig = filterNonZeroStablecoinBalance(
    stablecoinMultisigHoldings,
  );
  if (availableStablecoinsInMultisig === false) {
    console.log(
      'Stablecoin multisig balance query failed. Aborting operation.',
    );
    return;
  }

  const totalStableCoinHoldings = stablecoinHoldings;
  for (const s of Object.keys(stablecoinMultisigHoldings)) {
    const stablecoin = stablecoinMultisigHoldings[s];
    totalStableCoinHoldings[s].balance = totalStableCoinHoldings[
      s
    ].balance?.add(stablecoin?.balance as BigNumber);
  }

  /**
   * Check each stablecoin reserves of treasury and filter those that ammount above or equal to desired amount
   * add into the calculation the stablecoin in the multisig
   */
  const stablecoinsShortfalls = await filterStablcoinsBelowThreshold(
    totalStableCoinHoldings,
  );
  if (stablecoinsShortfalls === false) {
    console.log(
      'An error has occured while determine stablecoin balance differences. Aborting operation.',
    );
    return;
  }

  /**
   * List all stablecoin shortfalls
   */
  if (Object.keys(stablecoinsShortfalls).length > 0) {
    for (const s of Object.keys(stablecoinsShortfalls)) {
      const stablecoin = stablecoinsShortfalls[s];
      const deficitAmount = ethers.utils.formatUnits(
        stablecoin.amountDeficit as BigNumber,
        stablecoin.decimals,
      );
      console.log(
        'ENS Wallet has a deficit of',
        deficitAmount.toLocaleLowerCase('en-gb'),
        s,
      );
    }
  }

  /**
   * Initialise the batched transactions storage
   */
  const batchedTransaction = [];

  /**
   * 1.) Compose a send tx of the stablecoins from multisig (if there is any)
   */
  // if (Object.keys(availableStablecoinsInMultisig).length > 0) {
  //   for (const s of Object.keys(availableStablecoinsInMultisig)) {
  //     const stablecoin = availableStablecoinsInMultisig[s];
  //     const tx = createTxTransfeERC20(
  //       provider,
  //       stablecoin.address,
  //       ERC20ABI,
  //       ensWallet,
  //       stablecoin.balance as BigNumber,
  //     );
  //     if (tx === false) {
  //       console.log(
  //         'Failed to create tx for stablecoin transfer. Aborting operation.',
  //       );
  //       return;
  //     }
  //     batchedTransaction.push(tx);
  //   }
  // }

  /**
   * 2.) Compose a withdraw tx on controller.ens.eth from the multisig
   */
  const performWithdrawFromEnsController = createTxWithdrawETHFromEnsController(
    generalConfigurations.ensController[environment],
    provider,
  );
  if (performWithdrawFromEnsController === false) {
    console.log(
      'Failed to create ENS Controller withdraw TX. Aborting operation.',
    );
    return;
  }
  batchedTransaction.push(performWithdrawFromEnsController);

  /**
   * 3.) Compose a deposit tx for all ETH to WETH contract to convert ETH to WETH
   */
  const multiSigETHBalance = await getETHBalance(provider, ensMultisigWallet);
  console.log(
    'Creating tx for ETH to WETH multisig balance of:',
    ethers.utils.formatEther(multiSigETHBalance),
  );
  const convertETHToWethTx = createTxDepositETHtoWETHContract(
    environment,
    provider,
    multiSigETHBalance,
  );
  if (convertETHToWethTx === false) {
    console.log(
      'Failed to create tx for ETH to WETH multisig balance conversion. Aborting operation.',
    );
    return;
  }
  batchedTransaction.push(convertETHToWethTx);

  /**
   * 4.) Get quote from Coswap to estimate WETH required to exchange for stablecoin shortfall
   * -
   * Note: Chainlink Oracles cannot be relied upon for testing since the ETH/USD rates on testnet orcales are
   * based on the ETH/USD rates on mainnet but there can be multiple stablecoins on testnet and
   * their swap rates are vastly different from mainnet quotes. Therefore, we ask Cowswap to give
   * us the market rates in the current network for X/Y instead to determine whether we have enought ETH for swaps
   * and determine whether to create a BUY or SELL (all ETH) order.
   */
  let totalAmountWethSpent;
  if (Object.keys(stablecoinsShortfalls).length > 0) {
    let swapCost;
    let swapQuotes: { [token: string]: CowSwapSuccessResponseModel } = {};
    for (const s of Object.keys(stablecoinsShortfalls)) {
      const stableCoin = stablecoinsShortfalls[s];
      const cowSwap = await getCowSwapTradeQuote(
        environment,
        generalConfigurations.gnosisSafeAddress[environment],
        generalConfigurations.wethAddress[environment],
        stableCoin.address,
        CowswapTradeKindEnum.BUY,
        stableCoin.amountDeficit as BigNumber,
        ensWallet,
      );
      if (cowSwap === false) {
        console.log('Failed to retrieve swap rates. Aborting operation.');
        return;
      }
      if (swapCost === undefined) {
        swapQuotes[s] = cowSwap as CowSwapSuccessResponseModel;
        swapCost = ethers.BigNumber.from(cowSwap.quote.sellAmount);
      } else {
        swapQuotes[s] = cowSwap as CowSwapSuccessResponseModel;
        swapCost.add(ethers.BigNumber.from(cowSwap.quote.sellAmount));
      }
    }
    const hasMultiSigEnoughBalanceForSwap = (swapCost as BigNumber).lte(
      multiSigETHBalance,
    );

    if (hasMultiSigEnoughBalanceForSwap) {
      totalAmountWethSpent = swapCost as BigNumber;
    }

    /**
     * 5.) Compose an approve Coswap GPv2Relayer to spend multisig's WETH
     */
    const approveGpv2RelayerToTransferWethTx = createTxApproveERC20Transfer(
      provider,
      generalConfigurations.wethAddress[environment],
      ERC20ABI,
      generalConfigurations.cowswapGpv2RelayerAddress[environment],
      hasMultiSigEnoughBalanceForSwap === true
        ? swapCost?.toHexString()
        : multiSigETHBalance.toHexString(),
    );
    if (approveGpv2RelayerToTransferWethTx === false) {
      console.log(
        'Failed to create approval TX for Gpv2 Relayer WETH management (SELL). Aborting operation.',
      );
      return;
    }
    batchedTransaction.push(approveGpv2RelayerToTransferWethTx);

    /**
     * 6.) Compose a BUY/SELL order on Cowswap
     */
    if (hasMultiSigEnoughBalanceForSwap === true) {
      for (const s of Object.keys(stablecoinsShortfalls)) {
        const stableCoin = stablecoinsShortfalls[s];
        const cowSwapQuote = swapQuotes[s];
        const cowSwapOrderHash = await getCowSwapPlaceOrder(
          environment,
          generalConfigurations.gnosisSafeAddress[environment],
          generalConfigurations.wethAddress[environment],
          stableCoin.address,
          cowSwapQuote.quote.sellAmount,
          cowSwapQuote.quote.buyAmount,
          cowSwapQuote.quote.feeAmount,
          cowSwapQuote.quote.validTo,
          ensWallet,
          CowswapTradeKindEnum.SELL,
        );
        if (cowSwapOrderHash === false) {
          console.log('Failed to create swap. Aborting operation.');
          return;
        }
        console.log('Cowswap order created (BUY):', cowSwapOrderHash);
        const approveOrder = await createTxApproveCowswapOrder(
          generalConfigurations.cowswapGpv2ContractsAddress[environment],
          provider,
          cowSwapQuote.quote.sellToken,
          cowSwapQuote.quote.buyToken,
          cowSwapQuote.quote.sellAmount,
          cowSwapQuote.quote.buyAmount,
          cowSwapQuote.quote.validTo,
          cowSwapQuote.quote.feeAmount,
          ethers.utils.formatBytes32String(cowSwapQuote.quote.kind),
          cowSwapQuote.quote.partiallyFillable,
          ethers.utils.formatBytes32String(cowSwapQuote.quote.sellTokenBalance),
          ethers.utils.formatBytes32String(cowSwapQuote.quote.buyTokenBalance),
        );
        if (approveOrder === false) {
          console.log('Failed to create swap approval tx. Aborting operation.');
          return;
        }
        batchedTransaction.push(approveOrder);
      }
    } else {
      const ethToBeDistributedForEachStablecoin = multiSigETHBalance.div(
        Object.keys(stablecoinsShortfalls).length,
      );
      for (const s of Object.keys(stablecoinsShortfalls)) {
        const stableCoin = stablecoinsShortfalls[s];
        const cowSwapQuote = await getCowSwapTradeQuote(
          environment,
          generalConfigurations.gnosisSafeAddress[environment],
          generalConfigurations.wethAddress[environment],
          stableCoin.address,
          CowswapTradeKindEnum.BUY,
          ethToBeDistributedForEachStablecoin as BigNumber,
          ensWallet,
        );
        if (cowSwapQuote === false) {
          console.log('Failed to retrieve swap rates. Aborting operation.');
          return;
        }
        const cowSwapOrderHash = await getCowSwapPlaceOrder(
          environment,
          generalConfigurations.gnosisSafeAddress[environment],
          generalConfigurations.wethAddress[environment],
          stableCoin.address,
          cowSwapQuote.quote.sellAmount,
          cowSwapQuote.quote.buyAmount,
          cowSwapQuote.quote.feeAmount,
          cowSwapQuote.quote.validTo,
          ensWallet,
          CowswapTradeKindEnum.SELL,
        );
        if (cowSwapOrderHash === false) {
          console.log('Failed to create swap. Aborting operation.');
          return;
        }
        console.log('Cowswap order created (SELL):', cowSwapOrderHash);
        const approveOrder = await createTxApproveCowswapOrder(
          generalConfigurations.cowswapGpv2ContractsAddress[environment],
          provider,
          cowSwapQuote.quote.sellToken,
          cowSwapQuote.quote.buyToken,
          cowSwapQuote.quote.sellAmount,
          cowSwapQuote.quote.buyAmount,
          cowSwapQuote.quote.validTo,
          cowSwapQuote.quote.feeAmount,
          ethers.utils.formatBytes32String(cowSwapQuote.quote.kind),
          cowSwapQuote.quote.partiallyFillable,
          ethers.utils.formatBytes32String(cowSwapQuote.quote.sellTokenBalance),
          ethers.utils.formatBytes32String(cowSwapQuote.quote.buyTokenBalance),
        );
        if (approveOrder === false) {
          console.log('Failed to create swap approval tx. Aborting operation.');
          return;
        }
        batchedTransaction.push(approveOrder);
      }
    }
  }

  /**
   * 7.) Compose an approve tx for transerring remaining WETH to Role Modifier addres
   */
  const wethRemainingBalance =
    totalAmountWethSpent === undefined
      ? multiSigETHBalance
      : multiSigETHBalance.sub(totalAmountWethSpent);
  const approveRoleModifierToTransferWethTx = createTxApproveERC20Transfer(
    provider,
    generalConfigurations.wethAddress[environment],
    ERC20ABI,
    generalConfigurations.gnosisZodiacRoleModifierAddress[environment],
    wethRemainingBalance.toHexString(),
  );
  if (approveRoleModifierToTransferWethTx === false) {
    console.log(
      'Failed to create approval TX for Role Modifier WETH transfer. Aborting operation.',
    );
    return;
  }
  batchedTransaction.push(approveRoleModifierToTransferWethTx);

  /**
   * 8.) Compose a send tx of all the remaining WETH to selected wallet address
   */
  const remainingWethReceipients =
    generalConfigurations.remainingWethReceipients[environment];
  if (wethRemainingBalance.gte(Object.keys(remainingWethReceipients).length)) {
    for (const recipient of Object.keys(remainingWethReceipients)) {
      const amountToSend = wethRemainingBalance
        .div(100)
        .mul(remainingWethReceipients[recipient]);
      const transferTx = createTxTransfeERC20(
        provider,
        generalConfigurations.wethAddress[environment],
        ERC20ABI,
        recipient,
        amountToSend,
      );
      if (transferTx === false) {
        console.log('Failed to create Tx for WETH split. Aborting operation.');
        return;
      }
      batchedTransaction.push(transferTx);
    }
  }

  /**
   * 9.) Remove Cowswap GPv2Relayer WETH spend approval
   */
  const removeApproveGpv2RelayerToTransferWethTx = createTxApproveERC20Transfer(
    provider,
    generalConfigurations.wethAddress[environment],
    ERC20ABI,
    generalConfigurations.cowswapGpv2RelayerAddress[environment],
    '0x0',
  );
  if (removeApproveGpv2RelayerToTransferWethTx === false) {
    console.log(
      'Failed to create approval TX for Gpv2 Relayer WETH management (SELL). Aborting operation.',
    );
    return;
  }
  batchedTransaction.push(removeApproveGpv2RelayerToTransferWethTx);

  /**
   * 10.) Remove Role Modifier's WETH spend approval
   */
  const removeAproveRoleModifierToTransferWethTx = createTxApproveERC20Transfer(
    provider,
    generalConfigurations.wethAddress[environment],
    ERC20ABI,
    generalConfigurations.gnosisZodiacRoleModifierAddress[environment],
    '0x0',
  );
  if (removeAproveRoleModifierToTransferWethTx === false) {
    console.log(
      'Failed to create approval TX for Role Modifier WETH transfer. Aborting operation.',
    );
    return;
  }
  batchedTransaction.push(removeAproveRoleModifierToTransferWethTx);

  /**
   * 11.) Sign the transaction batch and send it to Gnosis/Zodiac contract
   */
  const batchedTx = createTxBatch(environment, provider, batchedTransaction);
  if (batchedTx === false) {
    console.log('Failed to compiled batched transactions. Aborting operation.');
    return;
  }
  if (require.main === module) {
    const simEnvironment = process.argv[2] as any;
    let hasSimulationEnded = false;
    console.log('Simulating transaction on', simEnvironment, '...');
    setTimeout(async () => {
      const simulatedTx = await simulate(
        EnvironmentsIdsEnum[simEnvironment] as any,
        relayerInfo.address,
        generalConfigurations.gnosisZodiacRoleModifierAddress[environment],
        batchedTx as string,
      );
      if (simulatedTx === false) {
        console.log('Failed to simulate tranasction. Please try again.');
        return false;
      }
      console.log(
        'Simulation completed with ID:',
        simulatedTx.id,
        '(',
        simulatedTx.result === false ? 'FAILED' : 'SUCCESS',
        ').',
        'Check your dashboard for more info.',
      );
      hasSimulationEnded = true;
    }, 30000);
    const waitForSimulationToEnd = setInterval(() => {
      if (hasSimulationEnded === false) {
        return true;
      }
      clearInterval(waitForSimulationToEnd);
    }, 100);
  } else {
    const tx = await performBatchedTransaction(
      environment,
      relayerInfo.address,
      provider,
      batchedTx as string,
      relayer,
      '0x0',
    );
    if (tx === false) {
      console.log('Failed to relay transaction. Aborting operation.');
      return;
    }
    console.log(
      'Tranasction relay succeeded (hash):',
      tx,
      'Network',
      environment,
    );
    return true;
  }
}

/**
 * Allow script to run locally for testing (i.e. simulation).
 */
if (require.main === module) {
  if (
    process.argv.length <= 2 ||
    generalConfigurations.validEnvironments.includes(process.argv[2] as any) ===
      false
  ) {
    console.log(
      'No environment set or invalid environment. Provide <environment> i.e. `npm run simulate goerli` and try again.',
    );
    process.exit(0);
  }
  setInterval(() => {}, 1000);
  require('dotenv').config();
  const { RELAYER_API_KEY: apiKey, RELAYER_API_SECRET: apiSecret } =
    process.env as EnvInfo;
  handler({ apiKey, apiSecret });
}

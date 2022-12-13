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
  performBatchedTransaction,
  stablecoinConfigurationToModel,
} from './services/treasury.service';
import { BigNumber, ethers } from 'ethers';
import { ERC20ABI } from './models/contracts/erc20.abi';
import { getETHBalance, resolveAddress } from './services/accounts.service';
import {
  getCowSwapPlaceOrder,
  getCowSwapTradeQuote,
} from './services/cowswap.service';
import { CowswapTradeKindEnum } from './models/cowswap-trade-kind.enum';
import { CowSwapSuccessResponseModel } from './models/cowswap-success-response.model';
import { EnvInfo } from './models/dot-env.type';
import { simulate } from './services/tenderly.service';
import { GeneralConfigurationsModel } from './models/general-configuration.model';
import { StableCoinModel } from './models/stablecoin.model';
import { isEnsAddressValid } from './services/misc.service';

export async function createTxDepositEthToWethAndExchangeInCowSwapForStableCoinsAndDistributeRemaining(
  configuration: GeneralConfigurationsModel,
  environment: EnvironmentsEnum,
  provider: any,
  multiSigETHBalance: BigNumber,
  stablecoinsShortfalls: { [token: string]: StableCoinModel },
  ensWalletAddress: string,
) {
  try {
    if (provider === null || provider === undefined) {
      console.log(
        'Invalid provider (createTxDepositEthToWethAndExchangeInCowSwapForStableCoinsAndDistributeRemaining)',
      );
      throw false;
    }
    const batchedTransactions = [];
    console.log(
      'Creating tx for ETH to WETH multisig balance of:',
      ethers.utils.formatEther(multiSigETHBalance),
    );
    if (multiSigETHBalance.lte(0) === true) {
      console.log('Multisig has no ETH to swap for stablecoins.');
      throw false;
    }
    let ensWallet: string | boolean = ensWalletAddress;
    let ensWalletIsEns = ensWallet.indexOf('.eth') > -1;
    if (ensWallet.indexOf('.eth') > -1) {
      ensWallet = await resolveAddress(provider, ensWallet);
    }
    if (
      ensWallet === false ||
      (ensWalletIsEns === true && isEnsAddressValid(ensWalletAddress) === false)
    ) {
      throw 'Invalid ensWallet address';
    }
    const convertETHToWethTx = createTxDepositETHtoWETHContract(
      environment,
      provider,
      multiSigETHBalance,
    );
    if (convertETHToWethTx === false) {
      console.log(
        'Failed to create tx for ETH to WETH multisig balance conversion. Aborting operation.',
      );
      throw false;
    }
    batchedTransactions.push(convertETHToWethTx);

    /**
     * Get quote from Coswap to estimate WETH required to exchange for stablecoin shortfall
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
          provider,
          environment,
          configuration.gnosisSafeAddress[environment],
          configuration.wethAddress[environment],
          stableCoin.address,
          CowswapTradeKindEnum.BUY,
          stableCoin.amountDeficit as BigNumber,
          ensWallet as string,
        );
        if (cowSwap === false) {
          console.log('Failed to retrieve swap rates. Aborting operation.');
          throw false;
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

      if (
        swapCost === undefined ||
        swapCost.lte(ethers.BigNumber.from(0)) === true
      ) {
        console.log('Retrieving swap cost failed. Aborting operation');
        throw false;
      }
      if (hasMultiSigEnoughBalanceForSwap === true) {
        totalAmountWethSpent = swapCost as BigNumber;
      }

      /**
       * Compose an approve Coswap GPv2Relayer to spend multisig's WETH
       */
      const approveGpv2RelayerToTransferWethTx = createTxApproveERC20Transfer(
        provider,
        configuration.wethAddress[environment],
        ERC20ABI,
        configuration.cowswapGpv2RelayerAddress[environment],
        hasMultiSigEnoughBalanceForSwap === true
          ? swapCost
          : multiSigETHBalance,
      );
      if (approveGpv2RelayerToTransferWethTx === false) {
        console.log(
          'Failed to create approval TX for Gpv2 Relayer WETH management (SELL). Aborting operation.',
        );
        throw false;
      }
      batchedTransactions.push(approveGpv2RelayerToTransferWethTx);

      /**
       * Compose a BUY/SELL order on Cowswap
       */
      if (hasMultiSigEnoughBalanceForSwap === true) {
        for (const s of Object.keys(stablecoinsShortfalls)) {
          const stableCoin = stablecoinsShortfalls[s];
          const cowSwapQuote = swapQuotes[s];
          const cowSwapOrderHash = await getCowSwapPlaceOrder(
            provider,
            environment,
            configuration.gnosisSafeAddress[environment],
            configuration.wethAddress[environment],
            stableCoin.address,
            cowSwapQuote.quote.sellAmount,
            cowSwapQuote.quote.buyAmount,
            cowSwapQuote.quote.feeAmount,
            cowSwapQuote.quote.validTo,
            ensWallet as string,
            CowswapTradeKindEnum.SELL,
          );
          if (cowSwapOrderHash === false) {
            console.log('Failed to create swap. Aborting operation.');
            throw false;
          }
          console.log('Cowswap order created (BUY):', cowSwapOrderHash);
          const approveOrder = await createTxApproveCowswapOrder(
            configuration.cowswapGpv2ContractsAddress[environment],
            provider,
            cowSwapQuote.quote.sellToken,
            cowSwapQuote.quote.buyToken,
            ensWallet as string,
            cowSwapQuote.quote.sellAmount,
            cowSwapQuote.quote.buyAmount,
            cowSwapQuote.quote.validTo,
            cowSwapQuote.quote.feeAmount,
            ethers.utils.formatBytes32String(
              cowSwapQuote.quote.kind,
            ) as CowswapTradeKindEnum,
            cowSwapQuote.quote.partiallyFillable,
            ethers.utils.formatBytes32String(
              cowSwapQuote.quote.sellTokenBalance,
            ),
            ethers.utils.formatBytes32String(
              cowSwapQuote.quote.buyTokenBalance,
            ),
          );
          if (approveOrder === false) {
            console.log(
              'Failed to create swap approval tx. Aborting operation.',
            );
            throw false;
          }
          batchedTransactions.push(approveOrder);
        }
      } else {
        const ethToBeDistributedForEachStablecoin = multiSigETHBalance.div(
          Object.keys(stablecoinsShortfalls).length,
        );
        for (const s of Object.keys(stablecoinsShortfalls)) {
          const stableCoin = stablecoinsShortfalls[s];
          const cowSwapQuote = await getCowSwapTradeQuote(
            provider,
            environment,
            configuration.gnosisSafeAddress[environment],
            configuration.wethAddress[environment],
            stableCoin.address,
            CowswapTradeKindEnum.BUY,
            ethToBeDistributedForEachStablecoin as BigNumber,
            ensWallet as string,
          );
          if (cowSwapQuote === false) {
            console.log('Failed to retrieve swap rates. Aborting operation.');
            throw false;
          }
          const cowSwapOrderHash = await getCowSwapPlaceOrder(
            provider,
            environment,
            configuration.gnosisSafeAddress[environment],
            configuration.wethAddress[environment],
            stableCoin.address,
            cowSwapQuote.quote.sellAmount,
            cowSwapQuote.quote.buyAmount,
            cowSwapQuote.quote.feeAmount,
            cowSwapQuote.quote.validTo,
            ensWallet as string,
            CowswapTradeKindEnum.SELL,
          );
          if (cowSwapOrderHash === false) {
            console.log('Failed to create swap. Aborting operation.');
            throw false;
          }
          console.log('Cowswap order created (SELL):', cowSwapOrderHash);
          const approveOrder = await createTxApproveCowswapOrder(
            configuration.cowswapGpv2ContractsAddress[environment],
            provider,
            cowSwapQuote.quote.sellToken,
            cowSwapQuote.quote.buyToken,
            ensWallet as string,
            cowSwapQuote.quote.sellAmount,
            cowSwapQuote.quote.buyAmount,
            cowSwapQuote.quote.validTo,
            cowSwapQuote.quote.feeAmount,
            ethers.utils.formatBytes32String(cowSwapQuote.quote.kind),
            cowSwapQuote.quote.partiallyFillable,
            ethers.utils.formatBytes32String(
              cowSwapQuote.quote.sellTokenBalance,
            ),
            ethers.utils.formatBytes32String(
              cowSwapQuote.quote.buyTokenBalance,
            ),
          );
          if (approveOrder === false) {
            console.log(
              'Failed to create swap approval tx. Aborting operation.',
            );
            throw false;
          }
          batchedTransactions.push(approveOrder);
        }
      }
    }

    /**
     * Compose an approve tx for transerring remaining WETH to Role Modifier addres
     */
    const wethRemainingBalance =
      totalAmountWethSpent === undefined
        ? ethers.BigNumber.from(0)
        : multiSigETHBalance.sub(totalAmountWethSpent);
    if (wethRemainingBalance.gt(0) === true) {
      const approveRoleModifierToTransferWethTx = createTxApproveERC20Transfer(
        provider,
        configuration.wethAddress[environment],
        ERC20ABI,
        configuration.gnosisZodiacRoleModifierAddress[environment],
        wethRemainingBalance,
      );
      if (approveRoleModifierToTransferWethTx === false) {
        console.log(
          'Failed to create approval TX for Role Modifier WETH transfer. Aborting operation.',
        );
        throw false;
      }
      batchedTransactions.push(approveRoleModifierToTransferWethTx);

      /**
       * Compose a send tx of all the remaining WETH to selected wallet address
       */
      const remainingWethReceipients =
        configuration.remainingWethReceipients[environment];
      if (
        wethRemainingBalance.gte(Object.keys(remainingWethReceipients).length)
      ) {
        for (const recipient of Object.keys(remainingWethReceipients)) {
          const amountToSend = wethRemainingBalance
            .div(100)
            .mul(remainingWethReceipients[recipient]);
          const transferTx = createTxTransfeERC20(
            provider,
            configuration.wethAddress[environment],
            ERC20ABI,
            recipient,
            amountToSend,
          );
          if (transferTx === false) {
            console.log(
              'Failed to create Tx for WETH split. Aborting operation.',
            );
            throw false;
          }
          batchedTransactions.push(transferTx);
        }
      }
    }
    return batchedTransactions;
  } catch (e) {
    return false;
  }
}

export async function simulateOrSubmitToChain(
  environment: EnvironmentsEnum,
  provider: any,
  configuration: GeneralConfigurationsModel,
  batchedTransaction: string[],
  relayer: Relayer,
  relayerInfo: RelayerModel,
) {
  try {
    const batchedTx = createTxBatch(environment, provider, batchedTransaction);
    if (batchedTx === false) {
      console.log(
        'Failed to compiled batched transactions. Aborting operation.',
      );
      throw false;
    }
    if (require.main === module) {
      const simEnvironment = process.argv[2] as any;
      let hasSimulationEnded = false;
      console.log('Simulating transaction on', simEnvironment, '...');
      setTimeout(async () => {
        const simulatedTx = await simulate(
          EnvironmentsIdsEnum[simEnvironment] as any,
          relayerInfo.address,
          configuration.gnosisZodiacRoleModifierAddress[environment],
          batchedTx as string,
        );
        if (simulatedTx === false) {
          console.log('Failed to simulate tranasction. Please try again.');
          throw false;
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
        throw false;
      }
      console.log(
        'Tranasction relay succeeded (hash):',
        tx,
        'Network',
        environment,
      );
      return true;
    }
  } catch (e) {
    return false;
  }
}

export async function app(
  credentials: RelayerParams,
  configuration: GeneralConfigurationsModel,
  defenderEnvironment = true,
) {
  try {
    if (
      credentials === null ||
      ((defenderEnvironment === false || require.main === module) &&
        ('apiKey' in credentials === false ||
          'apiKey' in credentials === null ||
          'apiSecret' in credentials === false ||
          'apiSecret' in credentials === null)) ||
      ((defenderEnvironment === true || require.main !== module) &&
        ('credentials' in credentials === false ||
          'relayerARN' in credentials === false))
    ) {
      console.log('Relayer credentials are incorrect. Aborting operation.');
      throw 'false';
    }
    const provider = new DefenderRelayProvider(credentials);
    const relayer = new Relayer(credentials);
    const relayerInfo = (await relayer.getRelayer()) as RelayerModel;
    const environment = relayerInfo.network as EnvironmentsEnum;
    if (configuration.validEnvironments.includes(environment) === false) {
      console.log('Network is not supported. Aborting operation.');
      throw false;
    }
    const ensWallet = configuration.ensWallet[environment];
    const ensMultisigWallet = configuration.gnosisSafeAddress[environment];
    const stablecoins = stablecoinConfigurationToModel(environment);
    if (stablecoins === false) {
      console.log('Stablecoins list is corrupted. Aborting operation.');
      throw false;
    }

    /**
     * 1.) Get all the stablecoin balances
     */
    const stablecoinHoldings = await getAllUSDBalance(
      provider,
      ensWallet,
      stablecoins,
    );
    if (stablecoinHoldings === false) {
      console.log('Stablecoin balance query failed. Aborting operation.');
      throw false;
    }

    /**
     * 2.) Check the stablecoin balance of the multisig and pick the non-zero ones
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
      throw false;
    }

    const totalStableCoinHoldings = stablecoinHoldings;
    for (const s of Object.keys(stablecoinMultisigHoldings)) {
      const stablecoin = stablecoinMultisigHoldings[s];
      totalStableCoinHoldings[s].balance = totalStableCoinHoldings[
        s
      ].balance?.add(stablecoin?.balance as BigNumber);
    }

    /**
     * 3.) Check each stablecoin reserves of treasury and filter those that ammount above or equal to desired amount
     * add into the calculation the stablecoin in the multisig
     */
    const stablecoinsShortfalls = await filterStablcoinsBelowThreshold(
      totalStableCoinHoldings,
    );
    if (stablecoinsShortfalls === false) {
      console.log(
        'An error has occured while determine stablecoin balance differences. Aborting operation.',
      );
      throw false;
    }

    /**
     * 4.) List all stablecoin shortfalls
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
    let batchedTransaction = [];

    /**
     * 5.) Compose a send tx of the stablecoins from multisig (if there is any)
     */
    const availableStablecoinsInMultisig = filterNonZeroStablecoinBalance(
      stablecoinMultisigHoldings,
    );
    if (availableStablecoinsInMultisig === false) {
      console.log(
        'Stablecoin multisig balance query failed. Aborting operation.',
      );
      throw false;
    }
    if (Object.keys(availableStablecoinsInMultisig).length > 0) {
      for (const s of Object.keys(availableStablecoinsInMultisig)) {
        const stablecoin = availableStablecoinsInMultisig[s];
        const tx = createTxTransfeERC20(
          provider,
          stablecoin.address,
          ERC20ABI,
          ensWallet,
          stablecoin.balance as BigNumber,
        );
        if (tx === false) {
          console.log(
            'Failed to create tx for stablecoin transfer. Aborting operation.',
          );
          throw false;
        }
        batchedTransaction.push(tx);
      }
    }

    /**
     * 6.) Compose a withdraw tx on controller.ens.eth from the multisig
     */
    const performWithdrawFromEnsController =
      createTxWithdrawETHFromEnsController(
        configuration.ensController[environment],
        provider,
      );
    if (performWithdrawFromEnsController === false) {
      console.log(
        'Failed to create ENS Controller withdraw TX. Aborting operation.',
      );
      throw false;
    }
    batchedTransaction.push(performWithdrawFromEnsController);

    /**
     * 7.) Compose a deposit tx for all ETH to WETH contract to convert ETH to WETH
     */
    const multiSigETHBalance = await getETHBalance(provider, ensMultisigWallet);
    if (multiSigETHBalance === false) {
      console.log(
        'Failed to get multisig ETH balance for WETH deposit. Aborting operation.',
      );
      throw false;
    }
    if ((multiSigETHBalance as BigNumber).gt(0) === true) {
      const depositAndExchangeTx =
        await createTxDepositEthToWethAndExchangeInCowSwapForStableCoinsAndDistributeRemaining(
          configuration,
          environment,
          provider,
          multiSigETHBalance,
          stablecoinsShortfalls,
          ensWallet,
        );
      if (depositAndExchangeTx !== false) {
        batchedTransaction = [...batchedTransaction, ...depositAndExchangeTx];
      }
    }

    /**
     * 8.) Remove Cowswap GPv2Relayer WETH spend approval
     */
    const removeApproveGpv2RelayerToTransferWethTx =
      createTxApproveERC20Transfer(
        provider,
        configuration.wethAddress[environment],
        ERC20ABI,
        configuration.cowswapGpv2RelayerAddress[environment],
        ethers.BigNumber.from(0),
      );
    if (removeApproveGpv2RelayerToTransferWethTx === false) {
      console.log(
        'Failed to create approval TX for Gpv2 Relayer WETH management (SELL). Aborting operation.',
      );
      throw false;
    }
    batchedTransaction.push(removeApproveGpv2RelayerToTransferWethTx);

    /**
     * 9.) Remove Role Modifier's WETH spend approval
     */
    const removeAproveRoleModifierToTransferWethTx =
      createTxApproveERC20Transfer(
        provider,
        configuration.wethAddress[environment],
        ERC20ABI,
        configuration.gnosisZodiacRoleModifierAddress[environment],
        ethers.BigNumber.from(0),
      );
    if (removeAproveRoleModifierToTransferWethTx === false) {
      console.log(
        'Failed to create approval TX for Role Modifier WETH transfer. Aborting operation.',
      );
      throw false;
    }
    batchedTransaction.push(removeAproveRoleModifierToTransferWethTx);

    /**
     * 10.) Commit TX
     */
    const tx = await simulateOrSubmitToChain(
      environment,
      provider,
      configuration,
      batchedTransaction,
      relayer,
      relayerInfo,
    );
    return tx;
  } catch (e) {
    console.log(
      'An error has occured while running the app. Aborting operation.',
    );
    return false;
  }
}
export async function handler(credentials: RelayerParams) {
  await app(credentials, generalConfigurations);
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
  app({ apiKey, apiSecret }, generalConfigurations, false);
}

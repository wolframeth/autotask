import { ethers } from 'ethers';
import { generalConfigurations } from './configurations/general.conf';
import {
  app,
  createTxDepositEthToWethAndExchangeInCowSwapForStableCoinsAndDistributeRemaining,
} from './index';
import { EnvironmentsEnum } from './models/environments.enum';
import { StableCoinModel } from './models/stablecoin.model';

describe('Main app tests', () => {
  const provider = new ethers.providers.InfuraProvider('goerli');
  const environment = EnvironmentsEnum.GOERLI;
  const configuration = generalConfigurations;
  const ensWallet = configuration.ensWallet[environment];
  test('Expect failure on invalid Relayer credentials parameters', async () => {
    const newApp = await app({} as any, generalConfigurations, false);
    expect(newApp).toEqual(false);
  });

  test('Expect failure - false return - no ETH from muiltisig to exchange (createTxDepositEthToWethAndExchangeInCowSwapForStableCoinsAndDistributeRemaining)', async () => {
    const multiSigETHBalance = ethers.BigNumber.from(0);
    const stablecoinsShortfalls = {
      COW: {
        token: 'COW',
        address: configuration.stablecoinsAddresses[environment]['COW'].address,
        decimals:
          configuration.stablecoinsAddresses[environment]['COW'].decimals,
        balance: ethers.BigNumber.from(1000),
        desiredAmount: ethers.BigNumber.from(1000),
        amountDeficit: ethers.BigNumber.from(1000),
        amountDeficitDecimal: ethers.utils.formatUnits(
          ethers.BigNumber.from(1000),
          configuration.stablecoinsAddresses[environment]['COW'].decimals,
        ),
      } as StableCoinModel,
    };
    const tx =
      await createTxDepositEthToWethAndExchangeInCowSwapForStableCoinsAndDistributeRemaining(
        configuration,
        environment,
        provider,
        multiSigETHBalance,
        stablecoinsShortfalls,
        ensWallet,
      );
    expect(tx).toEqual(false);
  });

  test('Expect failure - false return - no provider (createTxDepositEthToWethAndExchangeInCowSwapForStableCoinsAndDistributeRemaining)', async () => {
    const multiSigETHBalance = ethers.BigNumber.from(10000);
    const stablecoinsShortfalls = {
      COW: {
        token: 'COW',
        address: configuration.stablecoinsAddresses[environment]['COW'].address,
        decimals:
          configuration.stablecoinsAddresses[environment]['COW'].decimals,
        balance: ethers.BigNumber.from(1000),
        desiredAmount: ethers.BigNumber.from(1000),
        amountDeficit: ethers.BigNumber.from(1000),
        amountDeficitDecimal: ethers.utils.formatUnits(
          ethers.BigNumber.from(1000),
          configuration.stablecoinsAddresses[environment]['COW'].decimals,
        ),
      } as StableCoinModel,
    };
    const tx =
      await createTxDepositEthToWethAndExchangeInCowSwapForStableCoinsAndDistributeRemaining(
        configuration,
        environment,
        null,
        multiSigETHBalance,
        stablecoinsShortfalls,
        ensWallet,
      );
    expect(tx).toEqual(false);
  });

  test('Expect failure - false return - invalid ENS wallet address (createTxDepositEthToWethAndExchangeInCowSwapForStableCoinsAndDistributeRemaining)', async () => {
    const multiSigETHBalance = ethers.BigNumber.from(10000);
    const invalidEnsAddress = 'ens-/.wallet.eth';
    const invalid0xAddress = 'ef1e6A9f8cd9Dc5731B3Be74B3321288';
    const stablecoinsShortfalls = {
      COW: {
        token: 'COW',
        address: configuration.stablecoinsAddresses[environment]['COW'].address,
        decimals:
          configuration.stablecoinsAddresses[environment]['COW'].decimals,
        balance: ethers.BigNumber.from(1000),
        desiredAmount: ethers.BigNumber.from(1000),
        amountDeficit: ethers.BigNumber.from(1000),
        amountDeficitDecimal: ethers.utils.formatUnits(
          ethers.BigNumber.from(1000),
          configuration.stablecoinsAddresses[environment]['COW'].decimals,
        ),
      } as StableCoinModel,
    };
    const tx =
      await createTxDepositEthToWethAndExchangeInCowSwapForStableCoinsAndDistributeRemaining(
        configuration,
        environment,
        null,
        multiSigETHBalance,
        stablecoinsShortfalls,
        invalidEnsAddress,
      );
    const tx0x =
      await createTxDepositEthToWethAndExchangeInCowSwapForStableCoinsAndDistributeRemaining(
        configuration,
        environment,
        null,
        multiSigETHBalance,
        stablecoinsShortfalls,
        invalid0xAddress,
      );
    expect(tx).toEqual(false);
    expect(tx0x).toEqual(false);
  });

  test('Expect success - (createTxDepositEthToWethAndExchangeInCowSwapForStableCoinsAndDistributeRemaining)', async () => {
    const multiSigETHBalance = ethers.BigNumber.from(1000);
    const stablecoinsShortfalls = {
      COW: {
        token: 'COW',
        address: configuration.stablecoinsAddresses[environment]['COW'].address,
        decimals:
          configuration.stablecoinsAddresses[environment]['COW'].decimals,
        balance: ethers.BigNumber.from(1000),
        desiredAmount: ethers.BigNumber.from(1000),
        amountDeficit: ethers.BigNumber.from(1000),
        amountDeficitDecimal: ethers.utils.formatUnits(
          ethers.BigNumber.from(1000),
          configuration.stablecoinsAddresses[environment]['COW'].decimals,
        ),
      } as StableCoinModel,
    };
    const tx =
      await createTxDepositEthToWethAndExchangeInCowSwapForStableCoinsAndDistributeRemaining(
        configuration,
        environment,
        provider,
        multiSigETHBalance,
        stablecoinsShortfalls,
        ensWallet,
      );
    expect(tx).not.toEqual(false);
    expect(typeof tx).toEqual('object');
    expect((tx as string[]).length > 4).toEqual(true);
  });
});

import { ethers } from 'ethers';
import { generalConfigurations } from './configurations/general.conf';
import {
  app,
  createTxDepositEthToWethAndExchangeInCowSwapForStableCoins,
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

  test('Expect failure - false return - no ETH from muiltisig to exchange (createTxDepositEthToWethAndExchangeInCowSwapForStableCoins)', async () => {
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
    const tx = await createTxDepositEthToWethAndExchangeInCowSwapForStableCoins(
      configuration,
      environment,
      provider,
      multiSigETHBalance,
      stablecoinsShortfalls,
      ensWallet,
    );
    expect(tx).toEqual(false);
  });

  test('Expect failure - false return - no provider (createTxDepositEthToWethAndExchangeInCowSwapForStableCoins)', async () => {
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
    const tx = await createTxDepositEthToWethAndExchangeInCowSwapForStableCoins(
      configuration,
      environment,
      null,
      multiSigETHBalance,
      stablecoinsShortfalls,
      ensWallet,
    );
    expect(tx).toEqual(false);
  });

  test('Expect success - (createTxDepositEthToWethAndExchangeInCowSwapForStableCoins)', async () => {
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
    const tx = await createTxDepositEthToWethAndExchangeInCowSwapForStableCoins(
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

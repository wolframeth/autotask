import { BigNumber, ethers, Wallet } from 'ethers';
import {
  calculateDifferenceBetweenBalanceAndDesiredAmont,
  calculateEthRequiredForSwap,
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
  getGasLimitEstimation,
  stablecoinConfigurationToModel,
} from './treasury.service';
import { EnvironmentsEnum } from '../models/environments.enum';
import { isNumeric } from './misc.service';
import { StableCoinModel } from '../models/stablecoin.model';
import { parseUnits } from 'ethers/lib/utils';
import { generalConfigurations } from '../configurations/general.conf';
import { ERC20ABI } from '../models/contracts/erc20.abi';
import { CowswapTradeKindEnum } from '../models/cowswap-trade-kind.enum';
import { getCowSwapTradeQuote } from './cowswap.service';

describe('Treasury services tests', () => {
  const env = EnvironmentsEnum.GOERLI;
  const provider = new ethers.providers.InfuraProvider('goerli');
  test('Expect ETH/USD rate to be accurate', async () => {
    const ethUsdRate = await getEthUsdRate(provider, env);
    const isNumber = isNumeric(ethUsdRate as string);
    expect(isNumber).toEqual(true);
  });
  test('Expect USD to ETH conversion', async () => {
    const ethUsdRate = await getEthUsdRate(provider, env);
    const ethConversion = calculateEthRequiredForSwap(
      parseInt(ethUsdRate as string),
      parseInt(ethUsdRate as string),
    );
    expect(ethConversion).toEqual(1);
  });
  test('Expect amount needed for balance to reach desired amount', async () => {
    const desiredAmount = ethers.BigNumber.from(10);
    const balance = ethers.BigNumber.from(1);
    const deficit = calculateDifferenceBetweenBalanceAndDesiredAmont(
      desiredAmount,
      balance,
    );
    expect(ethers.BigNumber.from(9).toHexString()).toEqual(deficit);
  });
  test('Expect false if balance is sufficient', async () => {
    const desiredAmount = ethers.BigNumber.from(10);
    const balance = ethers.BigNumber.from(10);
    const result = calculateDifferenceBetweenBalanceAndDesiredAmont(
      desiredAmount,
      balance,
    );
    expect(result).toEqual(false);
  });
  test('Expect stablecoin balances of given wallet', async () => {
    const stableCoins = [
      {
        token: 'USDC',
        address: '0xd87ba7a50b2e7e660f678a895e4b72e7cb4ccd9c',
        decimals: 'mwei',
      },
      {
        token: 'DAI',
        address: '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60',
        decimals: 'ether',
      },
    ] as StableCoinModel[];
    const vanityAddressToCheck = '0x96237A8958Cd96e3DEa180c1F64C244d383cAB39';
    const balances = await getAllUSDBalance(
      provider,
      vanityAddressToCheck,
      stableCoins,
    );
    expect(balances).not.toEqual(false);
    for (const b of Object.keys(balances)) {
      const stable = (balances as any)[b] as StableCoinModel;
      for (const s of stableCoins) {
        const stablecoin = s;
        if (stablecoin.token === stable.token) {
          expect(stable.balance).not.toEqual(undefined);
          expect((stable.balance as BigNumber).toString()).toEqual(
            parseUnits('1', stablecoin.decimals).toString(),
          );
        }
      }
    }
  });
  test('Expect a list of stablecoins of which amount do not exceed the desired amount', async () => {
    const stableCoins = {
      USDC: {
        token: 'USDC',
        address: '0xd87ba7a50b2e7e660f678a895e4b72e7cb4ccd9c',
        decimals: 'mwei',
        balance: ethers.BigNumber.from(1),
        desiredAmount: ethers.BigNumber.from(10),
      },
      DAI: {
        token: 'DAI',
        address: '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60',
        decimals: 'ether',
        balance: ethers.BigNumber.from(10),
        desiredAmount: ethers.BigNumber.from(10),
      },
    };
    const qualifiedStablecoins = await filterStablcoinsBelowThreshold(
      stableCoins,
    );
    expect(qualifiedStablecoins).not.toEqual(false);
    expect(Object.keys(qualifiedStablecoins).length).toEqual(1);
    expect(
      'USDC' in (qualifiedStablecoins as { [token: string]: StableCoinModel }),
    ).toEqual(true);
  });

  test('Expect a list of stablecoins of which balance is greater than 0', async () => {
    const stableCoins = {
      USDC: {
        token: 'USDC',
        address: '0xd87ba7a50b2e7e660f678a895e4b72e7cb4ccd9c',
        decimals: 'mwei',
        balance: ethers.BigNumber.from(0),
      },
      DAI: {
        token: 'DAI',
        address: '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60',
        decimals: 'ether',
        balance: ethers.BigNumber.from(1),
      },
    };
    const qualifiedStablecoins = filterNonZeroStablecoinBalance(stableCoins);
    expect(qualifiedStablecoins).not.toEqual(false);
    expect(Object.keys(qualifiedStablecoins).length).toEqual(1);
    expect(
      'DAI' in (qualifiedStablecoins as { [token: string]: StableCoinModel }),
    ).toEqual(true);
  });
  test('Expect a list of stablecoins taken from configuration encapsulated in StableCoinsModel', async () => {
    const stableCoins = generalConfigurations.stablecoinsAddresses[env];
    const qualifiedStablecoins = stablecoinConfigurationToModel(env);
    expect(qualifiedStablecoins).not.toEqual(false);
    const qualifiedStablecoinsList = (
      qualifiedStablecoins as StableCoinModel[]
    ).map((qs) => {
      return qs.token;
    });
    expect((qualifiedStablecoins as StableCoinModel[]).length).toEqual(
      Object.keys(stableCoins).length,
    );
    for (const qs of Object.keys(stableCoins)) {
      expect(qualifiedStablecoinsList.includes(qs)).toEqual(true);
    }
  });
  test('Expect bytecode returned for createTxDepositETHtoWETHContract', async () => {
    const query = createTxDepositETHtoWETHContract(
      env,
      provider,
      ethers.BigNumber.from(1),
    );
    expect(ethers.utils.isBytesLike(query)).toEqual(true);
  });
  test('Expect false returned for createTxDepositETHtoWETHContract', async () => {
    const query = createTxDepositETHtoWETHContract(env, provider, '1' as any);
    expect(ethers.utils.isBytesLike(query)).toEqual(false);
  });

  test('Expect bytecode returned for createTxApproveERC20Transfer', async () => {
    const vanityAddress = '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60';
    const query = createTxApproveERC20Transfer(
      provider,
      ethers.constants.AddressZero,
      ERC20ABI,
      vanityAddress,
      ethers.BigNumber.from(1),
    );
    expect(ethers.utils.isBytesLike(query)).toEqual(true);
  });
  test('Expect false returned for createTxApproveERC20Transfer (invalid address)', async () => {
    const vanityAddress = 'Ee1784292379Fbb2964b3B9C4124D8F89C60';
    const query = createTxApproveERC20Transfer(
      provider,
      ethers.constants.AddressZero,
      ERC20ABI,
      vanityAddress,
      ethers.BigNumber.from(1),
    );
    expect(ethers.utils.isBytesLike(query)).toEqual(false);
  });
  test('Expect false returned for createTxApproveERC20Transfer (invalid amount to approve)', async () => {
    const vanityAddress = 'Ee1784292379Fbb2964b3B9C4124D8F89C60';
    const query = createTxApproveERC20Transfer(
      provider,
      ethers.constants.AddressZero,
      ERC20ABI,
      vanityAddress,
      '1' as any,
    );
    expect(ethers.utils.isBytesLike(query)).toEqual(false);
  });

  test('Expect bytecode returned for createTxTransfeERC20', async () => {
    const vanityAddress = '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60';
    const query = createTxTransfeERC20(
      provider,
      ethers.constants.AddressZero,
      ERC20ABI,
      vanityAddress,
      ethers.BigNumber.from(1),
    );
    expect(ethers.utils.isBytesLike(query)).toEqual(true);
  });
  test('Expect false returned for createTxTransfeERC20 (invalid address)', async () => {
    const vanityAddress = 'Ee1784292379Fbb2964b3B9C4124D8F89C60';
    const query = createTxTransfeERC20(
      provider,
      ethers.constants.AddressZero,
      ERC20ABI,
      vanityAddress,
      ethers.BigNumber.from(1),
    );
    expect(ethers.utils.isBytesLike(query)).toEqual(false);
  });
  test('Expect false returned for createTxTransfeERC20 (invalid amount to approve)', async () => {
    const vanityAddress = '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60';
    const query = createTxTransfeERC20(
      provider,
      ethers.constants.AddressZero,
      ERC20ABI,
      vanityAddress,
      '1' as any,
    );
    expect(ethers.utils.isBytesLike(query)).toEqual(false);
  });

  test('Expect bytes returned (createTxBatch)', async () => {
    const vanityAddress = '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60';
    const approve = createTxApproveERC20Transfer(
      provider,
      ethers.constants.AddressZero,
      ERC20ABI,
      vanityAddress,
      ethers.BigNumber.from(1),
    );
    const send = createTxTransfeERC20(
      provider,
      ethers.constants.AddressZero,
      ERC20ABI,
      vanityAddress,
      ethers.BigNumber.from(1),
    );
    const batch = createTxBatch(env, provider, [
      approve as string,
      send as string,
    ]);
    expect(batch).not.toEqual(false);
    expect(ethers.utils.isHexString(batch)).toEqual(true);
  });
  test('Expect false returned (createTxBatch) for invalid tx', async () => {
    const vanityAddress = '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60';
    const approve = createTxApproveERC20Transfer(
      provider,
      ethers.constants.AddressZero,
      ERC20ABI,
      vanityAddress,
      ethers.BigNumber.from(1),
    );
    const send = createTxTransfeERC20(
      provider,
      ethers.constants.AddressZero,
      ERC20ABI,
      vanityAddress,
      ethers.BigNumber.from(1),
    );
    const batch = createTxBatch(env, provider, [
      approve as string,
      send as string,
      'invalid_tx_data',
    ]);
    expect(batch).toEqual(false);
  });

  test('Expect bytes returned (createTxWithdrawETHFromEnsController)', async () => {
    const vanityAddress = '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60';
    const tx = createTxWithdrawETHFromEnsController(vanityAddress, provider);
    expect(tx).not.toEqual(false);
    expect(ethers.utils.isHexString(tx)).toEqual(true);
  });
  test('Expect false returned (createTxWithdrawETHFromEnsController) for invalid tx', async () => {
    const vanityAddress = 'e1784292379Fbb2964b3B9C4124D8F89C60';
    const tx = createTxWithdrawETHFromEnsController(vanityAddress, provider);
    expect(tx).toEqual(false);
  });

  const vanityGpV2Address = '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6';
  const inivalidVanityGpV2Address = 'Bf7B91A5ded31805e42b2208d6';
  const trader = '0xEd03c484f4e22095CA89BF41c2eb2c4B23a443bD';
  const sellToken = '0x91056D4A53E1faa1A84306D4deAEc71085394bC8';
  const buyToken = '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6';
  const amountToTrade = ethers.BigNumber.from(1000000);
  const invalidTrader = 'Ed03c484f4e2209';
  const properQuote = {
    environment: env,
    trader: trader,
    sellToken: sellToken,
    buyToken: buyToken,
    orderType: CowswapTradeKindEnum.BUY,
    tradeAmount: amountToTrade,
  };
  test('Create a cowswap order', async () => {
    const quote = await getCowSwapTradeQuote(
      provider,
      properQuote.environment,
      properQuote.trader,
      properQuote.sellToken,
      properQuote.buyToken,
      properQuote.orderType,
      properQuote.tradeAmount,
    );
    const newOrder = {
      environment: env,
      trader: trader,
      sellToken: sellToken,
      buyToken: buyToken,
      sellAmount: quote.quote.sellAmount,
      buyAmount: quote.quote.buyAmount,
      feeAmount: quote.quote.feeAmount,
      validTimeOfOrder: quote.quote.validTo,
      destination: trader,
      tradeKind: quote.quote.kind,
    };
    const order = await createTxApproveCowswapOrder(
      vanityGpV2Address,
      provider,
      newOrder.sellToken,
      newOrder.buyToken,
      newOrder.sellAmount,
      newOrder.buyAmount,
      newOrder.validTimeOfOrder,
      newOrder.feeAmount,
      ethers.utils.formatBytes32String(newOrder.tradeKind),
      quote.quote.partiallyFillable,
      ethers.utils.formatBytes32String(quote.quote.sellTokenBalance),
      ethers.utils.formatBytes32String(quote.quote.buyTokenBalance),
    );
    expect(order).not.toEqual(false);
    const isResultProper = ethers.utils.isHexString(
      (order as string).replace(new RegExp('"', 'g'), ''),
    );
    expect(isResultProper).toEqual(true);
  });

  test('Create an improper cowswap order', async () => {
    const quote = await getCowSwapTradeQuote(
      provider,
      properQuote.environment,
      properQuote.trader,
      properQuote.sellToken,
      properQuote.buyToken,
      properQuote.orderType,
      properQuote.tradeAmount,
    );
    const newOrder = {
      environment: env,
      trader: invalidTrader,
      sellToken: sellToken,
      buyToken: buyToken,
      sellAmount: quote.quote.sellAmount,
      buyAmount: quote.quote.buyAmount,
      feeAmount: quote.quote.feeAmount,
      validTimeOfOrder: quote.quote.validTo,
      destination: trader,
      tradeKind: quote.quote.kind,
    };
    const order = await createTxApproveCowswapOrder(
      inivalidVanityGpV2Address,
      provider,
      newOrder.sellToken,
      newOrder.buyToken,
      newOrder.sellAmount,
      newOrder.buyAmount,
      newOrder.validTimeOfOrder,
      newOrder.feeAmount,
      ethers.utils.formatBytes32String(newOrder.tradeKind),
      quote.quote.partiallyFillable,
      ethers.utils.formatBytes32String(quote.quote.sellTokenBalance),
      ethers.utils.formatBytes32String(quote.quote.buyTokenBalance),
    );
    expect(order).toEqual(false);
  });

  test('Expect bytes returned (getGasLimitEstimation)', async () => {
    const tx = {
      provider,
      to: await Wallet.createRandom().getAddress(),
      from: await Wallet.createRandom().getAddress(),
      data: '0x',
      value: '0x0',
    };
    const gasLimitEstimation = await getGasLimitEstimation(
      provider,
      tx.to,
      tx.from,
      tx.data,
      tx.value,
    );
    expect(gasLimitEstimation).not.toEqual(false);
    expect(isNumeric(gasLimitEstimation)).toEqual(true);
    expect(gasLimitEstimation.toString()).toEqual('21000');
  });
});

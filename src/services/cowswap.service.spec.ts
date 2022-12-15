import { EnvironmentsEnum } from '../models/environments.enum';
import { CowswapTradeKindEnum } from '../models/cowswap-trade-kind.enum';
import { cowSwapPlaceOrder, getCowSwapTradeQuote } from './cowswap.service';
import { ethers } from 'ethers';

describe('Cowswap services tests', () => {
  const env = EnvironmentsEnum.GOERLI;
  const provider = new ethers.providers.InfuraProvider('goerli');
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
  const abnormalQuote = {
    environment: env,
    trader: invalidTrader,
    sellToken: sellToken,
    buyToken: buyToken,
    orderType: CowswapTradeKindEnum.BUY,
    tradeAmount: amountToTrade,
  };
  test('Create a proper cowswap quote', async () => {
    const quote = await getCowSwapTradeQuote(
      provider,
      properQuote.environment,
      properQuote.trader,
      properQuote.sellToken,
      properQuote.buyToken,
      properQuote.orderType,
      properQuote.tradeAmount,
    );
    expect(quote).not.toEqual(false);
    expect(quote).toHaveProperty('quote');
  });
  test('Create an improper cowswap quote', async () => {
    const quote = await getCowSwapTradeQuote(
      provider,
      abnormalQuote.environment,
      abnormalQuote.trader,
      abnormalQuote.sellToken,
      abnormalQuote.buyToken,
      abnormalQuote.orderType,
      abnormalQuote.tradeAmount,
    );
    expect(quote).toEqual(false);
  });
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
    const properOrder = {
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
    const order = await cowSwapPlaceOrder(
      provider,
      env,
      properOrder.trader,
      properOrder.sellToken,
      properOrder.buyToken,
      properOrder.sellAmount,
      properOrder.buyAmount,
      properOrder.feeAmount,
      properOrder.validTimeOfOrder,
      properOrder.destination,
      properOrder.tradeKind,
    );
    expect(order).not.toEqual(false);
    const isResultProper = ethers.utils.isHexString(
      (order as string).replace(new RegExp('"', 'g'), ''),
    );
    expect(isResultProper).toEqual(true);
  });

  test('Create an improper cowswap order (invalid trader)', async () => {
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
    const order = await cowSwapPlaceOrder(
      provider,
      env,
      newOrder.trader,
      newOrder.sellToken,
      newOrder.buyToken,
      newOrder.sellAmount,
      newOrder.buyAmount,
      newOrder.feeAmount,
      newOrder.validTimeOfOrder,
      newOrder.destination,
      newOrder.tradeKind,
    );
    expect(order).toEqual(false);
  });
});

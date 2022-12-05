import { BigNumber, ethers } from 'ethers';
import { generalConfigurations } from '../configurations/general.conf';
import { CowswapTradeKindEnum } from '../models/cowswap-trade-kind.enum';
import { EnvironmentsEnum } from '../models/environments.enum';
import { resolveAddress } from './accounts.service';
import { isEnsAddressValid } from './misc.service';

function isValidTimestamp(dateTimestamp: number) {
  var minDate = new Date('1970-01-01 00:00:01').getTime();
  var maxDate = new Date('3000-01-19 00:00:00').getTime();
  return dateTimestamp > minDate && dateTimestamp < maxDate;
}

function isNumeric(n: number) {
  return !isNaN(parseFloat(n.toString())) && isFinite(n);
}

export enum CowSwapAPIEndpointsEnum {
  ORDERS_V1 = 'api/v1/orders',
  QUOTE_V1 = 'api/v1/quote',
}

export async function getCowSwapPlaceOrder(
  provider: any,
  environment: EnvironmentsEnum,
  trader: string,
  sellToken: string,
  buyToken: string,
  sellAmount: string,
  buyAmount: string,
  feeAmount: string,
  validTimeOfOrder: number,
  destination: string,
  tradeKind: CowswapTradeKindEnum,
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
    console.log(validTimeOfOrder, isValidTimestamp(validTimeOfOrder * 1000));
    if (isValidTimestamp(validTimeOfOrder * 1000) === false) {
      throw 'Invalid validTimeOfOrder';
    }
    const tradeKinds = Object.values(CowswapTradeKindEnum).map((k) => k);
    if (tradeKinds.includes(tradeKind) === false) {
      throw 'Invalid tradeKind';
    }
    let trueDestination: string | boolean = destination;
    let trueDestinationIsEns = trueDestination.indexOf('.eth') > -1;
    if (trueDestination.indexOf('.eth') > -1) {
      trueDestination = await resolveAddress(provider, trueDestination);
    }
    if (
      trueDestination === false ||
      (trueDestinationIsEns === true &&
        isEnsAddressValid(destination) === false)
    ) {
      throw 'Invalide distination address';
    }
    let trueTrader: string | boolean = trader;
    let trueTraderIsEns = trueTrader.indexOf('.eth') > -1;
    if (trueTrader.indexOf('.eth') > -1) {
      trueTrader = await resolveAddress(provider, trueTrader);
    }
    if (
      trueTrader === false ||
      (trueTraderIsEns === true && isEnsAddressValid(trader) === false)
    ) {
      throw 'Invalid trader address';
    }
    let trueSellToken: string | boolean = sellToken;
    let sellTokenIsEns = trueSellToken.indexOf('.eth') > -1;
    if (trueSellToken.indexOf('.eth') > -1) {
      trueSellToken = await resolveAddress(provider, trueSellToken);
    }
    if (
      trueSellToken === false ||
      (sellTokenIsEns === true && isEnsAddressValid(sellToken) === false)
    ) {
      throw 'Invalid sellToken';
    }
    let trueBuyToken: string | boolean = buyToken;
    let buyTokenIsEns = trueBuyToken.indexOf('.eth') > -1;
    if (trueBuyToken.indexOf('.eth') > -1) {
      trueBuyToken = await resolveAddress(provider, trueBuyToken);
    }
    if (
      trueBuyToken === false ||
      (buyTokenIsEns === true && isEnsAddressValid(buyToken) === false)
    ) {
      throw 'Invalid buyToken';
    }
    const coswapAPI = generalConfigurations.cowswapAPI[environment];
    const call = [coswapAPI, CowSwapAPIEndpointsEnum.ORDERS_V1].join('/');
    const quoteParams: any = {
      sellToken: trueSellToken,
      buyToken: trueBuyToken,
      sellAmount: sellAmount,
      buyAmount: buyAmount,
      validTo: validTimeOfOrder,
      appData: ethers.constants.HashZero,
      feeAmount: feeAmount,
      kind: tradeKind,
      partiallyFillable: false,
      receiver: trueDestination,
      signature: '0x',
      from: trueTrader,
      sellTokenBalance: 'erc20',
      buyTokenBalance: 'erc20',
      signingScheme: 'presign',
    };
    const fetchCall = await fetch(call, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify(quoteParams),
    });
    if (fetchCall.status !== 200 && fetchCall.status !== 201) {
      const result = await fetchCall.text();
      throw result;
    }
    const parsedData = await fetchCall.text();
    return parsedData;
  } catch (e) {
    console.log('(getCowSwapPlaceOrder) An unknown error has occured', e);
    return false;
  }
}

export async function getCowSwapTradeQuote(
  provider: any,
  environment: EnvironmentsEnum,
  trader: string,
  sellToken: string,
  buyToken: string,
  orderType: CowswapTradeKindEnum,
  tradeAmount: BigNumber,
  destination: string = ethers.constants.AddressZero,
) {
  try {
    if (
      typeof tradeAmount !== 'object' ||
      '_isBigNumber' in tradeAmount === false ||
      '_hex' in tradeAmount === false
    ) {
      throw 'Invalid tradeAmount';
    }
    const tradeKinds = Object.values(CowswapTradeKindEnum).map((k) => k);
    if (tradeKinds.includes(orderType) === false) {
      throw false;
    }

    let trueDestination: string | boolean = destination;
    let trueDestinationIsEns = trueDestination.indexOf('.eth') > -1;
    if (trueDestination.indexOf('.eth') > -1) {
      trueDestination = await resolveAddress(provider, trueDestination);
    }
    if (
      trueDestination === false ||
      (trueDestinationIsEns === true &&
        isEnsAddressValid(destination) === false)
    ) {
      throw 'Invalid destination address';
    }

    let trueTrader: string | boolean = trader;
    let trueTraderIsEns = trueTrader.indexOf('.eth') > -1;
    if (trueTrader.indexOf('.eth') > -1) {
      trueTrader = await resolveAddress(provider, trueTrader);
    }
    if (
      trueTrader === false ||
      (trueTraderIsEns === true && isEnsAddressValid(trader) === false)
    ) {
      throw 'Invalid trader address';
    }
    let trueSellToken: string | boolean = sellToken;
    let sellTokenIsEns = trueSellToken.indexOf('.eth') > -1;
    if (trueSellToken.indexOf('.eth') > -1) {
      trueSellToken = await resolveAddress(provider, trueSellToken);
    }
    if (
      trueSellToken === false ||
      (sellTokenIsEns === true && isEnsAddressValid(sellToken) === false)
    ) {
      throw 'Invalid sellToken adderss';
    }
    let trueBuyToken: string | boolean = buyToken;
    let buyTokenIsEns = trueBuyToken.indexOf('.eth') > -1;
    if (trueBuyToken.indexOf('.eth') > -1) {
      trueBuyToken = await resolveAddress(provider, trueBuyToken);
    }
    if (
      trueBuyToken === false ||
      (buyTokenIsEns === true && isEnsAddressValid(buyToken) === false)
    ) {
      throw 'Invalid buyToken address';
    }
    const validTimeForOrder = parseInt(
      ((new Date().getTime() + 3600000) / 1000).toString(),
    );
    const coswapAPI = generalConfigurations.cowswapAPI[environment];
    const call = [coswapAPI, CowSwapAPIEndpointsEnum.QUOTE_V1].join('/');
    const quoteParams: any = {
      sellToken: trueSellToken,
      buyToken: trueBuyToken,
      receiver: trueDestination,
      validTo: validTimeForOrder,
      appData: ethers.constants.HashZero,
      partiallyFillable: false,
      sellTokenBalance: 'erc20',
      buyTokenBalance: 'erc20',
      from: trader,
      kind: orderType,
    };
    if (orderType === CowswapTradeKindEnum.BUY) {
      quoteParams['buyAmountAfterFee'] = tradeAmount.toString();
    } else {
      quoteParams['sellAmountBeforeFee'] = tradeAmount.toString();
    }
    const fetchCall = await fetch(call, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify(quoteParams),
    });
    if (fetchCall.status !== 200 && fetchCall.status !== 201) {
      const result = await fetchCall.text();
      throw result;
    }
    const parsedData = await fetchCall.json();
    return parsedData;
  } catch (e) {
    console.log('(getCowSwapTradeQuote) An unknown error has occured', e);
    return false;
  }
}

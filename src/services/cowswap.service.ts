import { BigNumber, ethers } from 'ethers';
import { generalConfigurations } from '../configurations/general.conf';
import { CowswapTradeKindEnum } from '../models/cowswap-trade-kind.enum';
import { EnvironmentsEnum } from '../models/environments.enum';

export enum CowSwapAPIEndpointsEnum {
  ORDERS_V1 = 'api/v1/orders',
  QUOTE_V1 = 'api/v1/quote',
}

export async function getCowSwapPlaceOrder(
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
    const coswapAPI = generalConfigurations.cowswapAPI[environment];
    const call = [coswapAPI, CowSwapAPIEndpointsEnum.ORDERS_V1].join('/');
    const quoteParams: any = {
      sellToken: sellToken,
      buyToken: buyToken,
      sellAmount: sellAmount,
      buyAmount: buyAmount,
      validTo: validTimeOfOrder,
      appData: ethers.constants.HashZero,
      feeAmount: feeAmount,
      kind: tradeKind,
      partiallyFillable: false,
      receiver: destination,
      signature: '0x',
      from: trader,
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
  environment: EnvironmentsEnum,
  trader: string,
  sellToken: string,
  buyToken: string,
  orderType: CowswapTradeKindEnum,
  tradeAmount: BigNumber,
  destination: string = ethers.constants.AddressZero,
) {
  try {
    const validTimeForOrder = parseInt(
      ((new Date().getTime() + 3600000) / 1000).toString(),
    );
    const coswapAPI = generalConfigurations.cowswapAPI[environment];
    const call = [coswapAPI, CowSwapAPIEndpointsEnum.QUOTE_V1].join('/');
    const quoteParams: any = {
      sellToken,
      buyToken,
      receiver: destination,
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

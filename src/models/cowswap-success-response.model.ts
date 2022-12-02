export interface CowSwapSuccessResponseModel {
  quote: {
    sellToken: string;
    buyToken: string;
    receiver: string;
    sellAmount: string;
    buyAmount: string;
    validTo: number;
    appData: string;
    feeAmount: string;
    kind: string;
    partiallyFillable: false;
    sellTokenBalance: string;
    buyTokenBalance: string;
    signingScheme: string;
  };
  from: string;
  expiration: string;
  id: number;
}

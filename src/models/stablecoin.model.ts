import { BigNumber } from 'ethers';

export interface StableCoinModel {
  token: string;
  address: string;
  decimals: string;
  balance?: BigNumber;
  desiredAmount?: BigNumber;
  amountDeficit?: BigNumber;
  amountDeficitDecimal?: string;
}

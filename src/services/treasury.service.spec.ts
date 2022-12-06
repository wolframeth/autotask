import { ethers } from 'ethers';
import { calculateEthRequiredForSwap, getEthUsdRate } from './treasury.service';
import { EnvironmentsEnum } from '../models/environments.enum';
import { isNumeric } from './misc.service';

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
});

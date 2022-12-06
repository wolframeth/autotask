import { BigNumber, ethers } from 'ethers';
import {
  calculateDifferenceBetweenBalanceAndDesiredAmont,
  calculateEthRequiredForSwap,
  getAllUSDBalance,
  getEthUsdRate,
} from './treasury.service';
import { EnvironmentsEnum } from '../models/environments.enum';
import { isNumeric } from './misc.service';
import { StableCoinModel } from '../models/stablecoin.model';
import { parseUnits } from 'ethers/lib/utils';

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
});

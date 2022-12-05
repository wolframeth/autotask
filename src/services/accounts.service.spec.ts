import { ethers } from 'ethers';
import {
  getERC20Balance,
  getETHBalance,
  resolveAddress,
} from './accounts.service';

describe('Account services tests', () => {
  const provider = new ethers.providers.InfuraProvider('goerli');
  const ensAddressToCheck = 'ens.eth';
  const stableCoinAddress = '0xd87ba7a50b2e7e660f678a895e4b72e7cb4ccd9c';
  const abnormalEnsAddressToCheck = '0x--invalid.eth';
  const oxAddressToCheck = '0x0904Dac3347eA47d208F3Fd67402D039a3b99859';
  const abnormal0xAddressToCheck = 'Ed03c484f4e22095';
  beforeAll((done) => {
    done();
  });
  test('Resolve ENS name to address', async () => {
    const addressResolved = await resolveAddress(provider, ensAddressToCheck);
    expect(addressResolved).toHaveLength(42);
    expect(addressResolved.substring(0, 2)).toEqual('0x');
  });
  test('Check if string to resolve is ENS', async () => {
    const addressResolved = await resolveAddress(provider, oxAddressToCheck);
    expect(addressResolved).toEqual(oxAddressToCheck);
  });
  test('Check if ENS is rejected', async () => {
    const result = await resolveAddress(provider, abnormalEnsAddressToCheck);
    expect(result).toEqual(false);
  });
  test('Check if 0x address is rejected', async () => {
    const result = await resolveAddress(provider, abnormal0xAddressToCheck);
    expect(result).toEqual(false);
  });
  test('Must return balance like value (ETH)', async () => {
    const result = await getETHBalance(provider, oxAddressToCheck);
    expect(typeof result).toEqual('object');
    expect(result).toHaveProperty('_isBigNumber');
    expect(result).toHaveProperty('_hex');
  });
  test('Must not return balance like (ERC20)', async () => {
    const result = await getETHBalance(provider, abnormalEnsAddressToCheck);
    expect(result).toEqual(false);
    expect(result).not.toHaveProperty('_isBigNumber');
    expect(result).not.toHaveProperty('_hex');
  });
  test('Must return balance like value (ERC20)', async () => {
    const result = await getERC20Balance(
      provider,
      oxAddressToCheck,
      stableCoinAddress,
    );
    expect(typeof result).toEqual('object');
    expect(result).toHaveProperty('_isBigNumber');
    expect(result).toHaveProperty('_hex');
  });
  test('Must not return balance (ERC20) like value - must return error', async () => {
    const result = await getERC20Balance(
      provider,
      abnormalEnsAddressToCheck,
      stableCoinAddress,
    );
    expect(result).toEqual(false);
    expect(result).not.toHaveProperty('_isBigNumber');
    expect(result).not.toHaveProperty('_hex');
  });
});

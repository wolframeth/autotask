import { Contract } from 'ethers';
import { ERC20ABI } from '../models/contracts/erc20.abi';

export async function resolveAddress(provider: any, address: string) {
  try {
    const addressResolved =
      address.indexOf('.eth') > -1
        ? await provider.resolveName(address)
        : address;
    return addressResolved;
  } catch (e) {
    console.log('(resolveAddress) An unknown error has occured', e);
    return false;
  }
}

export async function getETHBalance(provider: any, address: string) {
  try {
    const addressResolved = resolveAddress(provider, address);
    const userBalance = await provider.getBalance(addressResolved);
    return userBalance;
  } catch (e) {
    console.log('(getETHBalance) An unknown error has occured', e);
    return false;
  }
}

export async function getERC20Balance(
  provider: any,
  address: string,
  erc20Address: string,
) {
  try {
    const erc20 = new Contract(erc20Address, ERC20ABI, provider);
    const addressResolved = resolveAddress(provider, address);
    const userBalance = await erc20.balanceOf(addressResolved);
    return userBalance;
  } catch (e) {
    console.log('(getERC20Balance) An unknown error has occured', e);
    return false;
  }
}

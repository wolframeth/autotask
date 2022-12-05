import { Contract, ethers } from 'ethers';
import { ERC20ABI } from '../models/contracts/erc20.abi';
import { is0xAddressValid, isEnsAddressValid } from './misc.service';

export async function resolveAddress(provider: any, address: string) {
  try {
    const isENS = address.indexOf('.eth') > -1;
    if (isENS === true && isEnsAddressValid(address) === false) {
      throw false;
    }
    if (isENS === false && is0xAddressValid(address) === false) {
      throw false;
    }
    const addressResolved =
      isENS === true ? await provider.resolveName(address) : address;
    return addressResolved;
  } catch (e) {
    console.log('(resolveAddress) An unknown error has occured', e);
    return false;
  }
}

export async function getETHBalance(provider: any, address: string) {
  try {
    const isENS = address.indexOf('.eth') > -1;
    if (isENS === true && isEnsAddressValid(address) === false) {
      throw false;
    }
    if (isENS === false && is0xAddressValid(address) === false) {
      throw false;
    }
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
    const isENS = address.indexOf('.eth') > -1;
    if (isENS === true && isEnsAddressValid(address) === false) {
      throw false;
    }
    if (isENS === false && is0xAddressValid(address) === false) {
      throw false;
    }
    const isENSERCAddress = address.indexOf('.eth') > -1;
    if (isENSERCAddress === true && isEnsAddressValid(erc20Address) === false) {
      throw false;
    }
    if (isENSERCAddress === false && is0xAddressValid(erc20Address) === false) {
      throw false;
    }
    const erc20 = new Contract(erc20Address, ERC20ABI, provider);
    const addressResolved = resolveAddress(provider, address);
    const userBalance = await erc20.balanceOf(addressResolved);
    return userBalance;
  } catch (e) {
    console.log('(getERC20Balance) An unknown error has occured', e);
    return false;
  }
}

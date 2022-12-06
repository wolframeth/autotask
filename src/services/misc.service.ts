import { ethers } from 'ethers';
import { ensNormalize } from '@ethersproject/hash';

export function is0xAddressValid(address: string) {
  try {
    if (address.length < 42) {
      throw false;
    }
    if (!/^(0x)?[0-9a-f]{40}$/i.test(address)) {
      throw false;
    } else if (
      /^(0x)?[0-9a-f]{40}$/.test(address) ||
      /^(0x)?[0-9A-F]{40}$/.test(address)
    ) {
      return true;
    } else {
      return true;
    }
  } catch (e) {
    return false;
  }
}

export function isEnsAddressValid(ens: string) {
  try {
    ensNormalize(ens);
    return true;
  } catch (e) {
    return false;
  }
}

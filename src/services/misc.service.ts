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

export function isValidTimestamp(dateTimestamp: number) {
  var minDate = new Date('1970-01-01 00:00:01').getTime();
  var maxDate = new Date('3000-01-19 00:00:00').getTime();
  return dateTimestamp > minDate && dateTimestamp < maxDate;
}

export function isNumeric(n: number | string) {
  return (
    !isNaN(parseFloat(typeof n === 'number' ? n.toString() : n)) &&
    isFinite(typeof n === 'number' ? n : parseFloat(n))
  );
}

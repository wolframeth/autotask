import { is0xAddressValid, isEnsAddressValid } from './misc.service';

describe('Misc service tests.', () => {
  const validEnsAddress = 'ens.eth';
  const invalidEnsAddress = 'ens eth';
  const validEnsSubdomainAddress = 'wallet.ens.eth';
  const invalidEnsSubdomainAddress = 'ens-/.wallet.eth';
  const valid0xAddress = '0x3c8499F3ef1e6A9f8cd9Dc5731B3Be74B3321288';
  const invalid0xAddres = 'ef1e6A9f8cd9Dc5731B3Be74B3321288';
  test('Check valid ens address', async () => {
    const addressIsValid = isEnsAddressValid(validEnsAddress);
    expect(addressIsValid).toEqual(true);
  });
  test('Check invalid ens address', async () => {
    const addressIsValid = isEnsAddressValid(invalidEnsAddress);
    expect(addressIsValid).toEqual(false);
  });
  test('Check valid ens subdomain address', async () => {
    const addressIsValid = isEnsAddressValid(validEnsSubdomainAddress);
    expect(addressIsValid).toEqual(true);
  });
  test('Check invalid ens subdomain address', async () => {
    const addressIsValid = isEnsAddressValid(invalidEnsSubdomainAddress);
    expect(addressIsValid).toEqual(false);
  });
  test('Check valid 0x address', async () => {
    const addressIsValid = is0xAddressValid(valid0xAddress);
    expect(addressIsValid).toEqual(true);
  });
  test('Check invalid 0x address', async () => {
    const addressIsValid = is0xAddressValid(invalid0xAddres);
    expect(addressIsValid).toEqual(false);
  });
});

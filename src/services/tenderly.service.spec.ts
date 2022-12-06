import { ethers } from 'ethers';
import { EnvironmentsIdsEnum } from '../models/environments.enum';
import { simulate } from './tenderly.service';
describe('test', () => {
  const vanityFromAddress = '0x96237A8958Cd96e3DEa180c1F64C244d383cAB39';
  const badRequet = {
    network_id: EnvironmentsIdsEnum.goerli,
    from: vanityFromAddress,
    input: '0x0',
    to: ethers.constants.AddressZero,
    block_number: null,
    save: true,
  };
  const goodRequet = {
    network_id: EnvironmentsIdsEnum.goerli,
    from: vanityFromAddress,
    input: '0x',
    to: ethers.constants.AddressZero,
    block_number: null,
    save: true,
  };
  test('Expect tenderly to succeed.', async () => {
    const tenderlyTest = await simulate(
      goodRequet.network_id,
      goodRequet.from,
      goodRequet.to,
      goodRequet.input,
    );
    expect(tenderlyTest).not.toEqual(false);
  });
  test('Expect tenderly to fail.', async () => {
    const tenderlyTest = await simulate(
      badRequet.network_id,
      badRequet.from,
      badRequet.to,
      badRequet.input,
    );
    expect(tenderlyTest).toEqual(false);
  });
});

import { ethers } from 'ethers';
import { EnvironmentsIdsEnum } from '../models/environments.enum';
import { simulate } from './tenderly.service';
describe('Tenderly services tests', () => {
  const vanityFromAddress = '0x96237A8958Cd96e3DEa180c1F64C244d383cAB39';
  const invalidVanityFromAddress = '0x96237A8958Cd96e3DEa180c1F64C244d383cAB39';
  const badRequest = {
    network_id: EnvironmentsIdsEnum.goerli,
    from: invalidVanityFromAddress,
    input: '0x0',
    to: ethers.constants.AddressZero,
    block_number: null,
    save: true,
  };
  const goodRequest = {
    network_id: EnvironmentsIdsEnum.goerli,
    from: vanityFromAddress,
    input: '0x',
    to: vanityFromAddress,
    block_number: null,
    value: 1,
    save: true,
  };
  test('Expect tenderly to succeed.', async () => {
    const tenderlyTest = await simulate(
      goodRequest.network_id,
      goodRequest.from,
      goodRequest.to,
      goodRequest.input,
      goodRequest.value,
    );
    expect(tenderlyTest).not.toEqual(false);
  });
  test('Expect tenderly to fail.', async () => {
    const tenderlyTest = await simulate(
      badRequest.network_id,
      badRequest.from,
      badRequest.to,
      badRequest.input,
    );
    expect(tenderlyTest).toEqual(false);
  });
});

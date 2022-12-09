import { generalConfigurations } from './configurations/general.conf';
import { app } from './index';

describe('Main app tests', () => {
  test('Expect failure on invalid Relayer credentials parameters', async () => {
    const newApp = await app({} as any, generalConfigurations, false);
    expect(newApp).toEqual(false);
  });
});

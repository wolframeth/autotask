import { generalConfigurations } from '../configurations/general.conf';
import { EnvInfo } from '../models/dot-env.type';
import { EnvironmentsIdsEnum } from '../models/environments.enum';
import axios from 'axios';

export async function simulate(
  environment: EnvironmentsIdsEnum,
  callerAddress: string,
  targetAddress: string,
  txData: string,
  blockNumber = null,
) {
  try {
    require('dotenv').config();
    const { TENDERLY_USER, TENDERLY_PROJECT, TENDERLY_ACCESS_KEY } =
      process.env as EnvInfo;

    const SIMULATE_API =
      generalConfigurations.tenderlyAPI +
      '/api/v1/account/' +
      TENDERLY_USER +
      '/project/' +
      TENDERLY_PROJECT +
      '/simulate';

    const transaction = {
      network_id: environment,
      from: callerAddress,
      input: txData,
      to: targetAddress,
      block_number: blockNumber,
      save: true,
    };
    const opts = {
      headers: {
        'X-Access-Key': TENDERLY_ACCESS_KEY || '',
      },
    };
    const fetchCall = await axios.post(SIMULATE_API, transaction, opts);
    if (fetchCall.status !== 200 && fetchCall.status !== 201) {
      throw false;
    }
    if (
      'code' in fetchCall === true &&
      (fetchCall as any).code === 'ERR_BAD_REQUEST'
    ) {
      throw 'Bad request';
    }
    const simId = fetchCall.data.simulation.id;
    const simResult = fetchCall.data.simulation.status;
    return { id: simId, result: simResult };
  } catch (e) {
    console.log('(simulate) An unknown error has occured');
    return false;
  }
}

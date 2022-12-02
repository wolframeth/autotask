import { AutotaskClient } from 'defender-autotask-client';

type EnvInfo = {
  TEAM_API_KEY: string;
  TEAM_API_SECRET: string;
  AUTOTASK_ID: string;
};

async function deployer() {
  require('dotenv').config();
  const {
    AUTOTASK_ID: autoTask,
    TEAM_API_KEY: apiKey,
    TEAM_API_SECRET: apiSecret,
  } = process.env as EnvInfo;
  const client = new AutotaskClient({ apiKey, apiSecret });
  const result = (await client.updateCodeFromFolder(autoTask, './dist')) as any;
  if (result.message?.indexOf('updated') > -1) {
    console.log('Deployment complete.');
    return;
  }
  console.log('Deployment failed.');
}

deployer();

import { EnvironmentsEnum } from './environments.enum';

export interface GeneralConfigurationsModel {
  validEnvironments: EnvironmentsEnum[];
  tenderlyAPI: string;
  cowswapAPI: {
    [environment: string]: string;
  };
  cowswapGpv2RelayerAddress: {
    [environment: string]: string;
  };
  cowswapGpv2ContractsAddress: {
    [environment: string]: string;
  };
  gnosisSafeAddress: {
    [environment: string]: string;
  };
  gnosisZodiacRoleModifierAddress: {
    [environment: string]: string;
  };
  gnosisZodiacRoleModifierMultisendAddress: {
    [environment: string]: string;
  };
  remainingWethReceipients: {
    [environment: string]: { [wallet: string]: number };
  };
  ensWallet: {
    [environment: string]: string;
  };
  ensController: {
    [environment: string]: string;
  };
  stablecoinsAddresses: {
    [environment: string]: {
      [stablecoin: string]: { address: string; decimals: string };
    };
  };
  desiredUsdBalanceInSourceAccount: {
    [environment: string]: {
      [stablecoin: string]: number;
    };
  };
  maxEthToExchange: {
    [environment: string]: number;
  };
  wethAddress: {
    [environment: string]: string;
  };
  chainlinkEthUsdOracleAddress: {
    [environment: string]: string;
  };
}

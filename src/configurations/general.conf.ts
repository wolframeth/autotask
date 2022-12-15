import { EnvironmentsEnum } from '../models/environments.enum';
import { GeneralConfigurationsModel } from '../models/general-configuration.model';

export const generalConfigurations = {
  validEnvironments: [EnvironmentsEnum.MAINNET, EnvironmentsEnum.GOERLI],

  /**
   * API endpoints host for Tenderly simulations
   */
  tenderlyAPI: 'https://api.tenderly.co',

  /**
   * API endpoints host for Cowswap
   */
  cowswapAPI: {
    [EnvironmentsEnum.MAINNET]: 'https://api.cow.fi/mainnet',
    [EnvironmentsEnum.GOERLI]: 'https://api.cow.fi/goerli',
  },

  /**
   * Cowswap contract that spends on behalf of an account (in this case, the multisig gnosisSafeAddress)
   */
  cowswapGpv2RelayerAddress: {
    [EnvironmentsEnum.MAINNET]: '0xC92E8bdf79f0507f65a392b0ab4667716BFE0110',
    [EnvironmentsEnum.GOERLI]: '0xC92E8bdf79f0507f65a392b0ab4667716BFE0110',
  },

  /**
   * Cowswap contract that spends on behalf of an account
   */
  cowswapGpv2ContractsAddress: {
    [EnvironmentsEnum.MAINNET]: '',
    [EnvironmentsEnum.GOERLI]: '0xc6229Eabcea8EA3eA5A06C1Cdf24e02F5eF8Ad99',
  },

  /**
   * Address to the multisig
   */
  gnosisSafeAddress: {
    [EnvironmentsEnum.MAINNET]: '',
    [EnvironmentsEnum.GOERLI]: '0x38d957AF5535f717C2b8f5120a0fc5bcF931B8Ba',
  },

  /**
   * Address to the multisig's zodiac role modifier contract
   */
  gnosisZodiacRoleModifierAddress: {
    [EnvironmentsEnum.MAINNET]: '',
    [EnvironmentsEnum.GOERLI]: '0x3b48298b3cB80bE091D1b8c13280032eA2Cf5c1a',
  },

  /**
   * Address to the multisig's zodiac role modifier multisend tx batcher contract
   */
  gnosisZodiacRoleModifierMultisendAddress: {
    [EnvironmentsEnum.MAINNET]: '',
    [EnvironmentsEnum.GOERLI]: '0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761',
  },

  /**
   * Recepients of remaining WETH and their share (in percent)
   * -
   * Valid values: Integers
   */
  remainingWethReceipients: {
    [EnvironmentsEnum.MAINNET]: {
      '0x0904dac3347ea47d208f3fd67402d039a3b99859': 100,
    },
    [EnvironmentsEnum.GOERLI]: {
      '0x2fC8771F52377eC1a819cf87c5dDaCc4F8a89F10': 100,
    },
  },

  /**
   * The source of stablecoins to take from for swap
   * - ENS addresses are acceptable
   * - Pure hex addresses are acceptable
   */
  ensWallet: {
    [EnvironmentsEnum.MAINNET]: '0xFe89cc7aBB2C4183683ab71653C4cdc9B02D44b7',
    [EnvironmentsEnum.GOERLI]: '0x0904Dac3347eA47d208F3Fd67402D039a3b99859',
  },

  /**
   * ENS Controller address
   */
  ensController: {
    [EnvironmentsEnum.MAINNET]: '0x283Af0B28c62C092C9727F1Ee09c02CA627EB7F5',
    [EnvironmentsEnum.GOERLI]: '0x73dF0611886067015E83f0eB97bC6F1cb0ce4499',
  },

  /**
   * Desired amount of ETH in ensWallet, the rest are exchanged into stablecoins
   * -
   * Valid values: Integers - in decimals not atomic portions i.e. 10000 = 10,000 USDC
   */
  desiredUsdBalanceInSourceAccount: {
    [EnvironmentsEnum.MAINNET]: {
      USDC: 1,
    },
    [EnvironmentsEnum.GOERLI]: {
      COW: 4000,
    },
  },

  /**
   * The list of stablecoins that are approved for ETH swap on cowswap
   * - ENS addresses are acceptable
   * - Pure hex addresses are acceptable
   * See: https://docs.ethers.io/v5/api/utils/display-logic/#display-logic for the correct Decimal notation on your entry
   */
  stablecoinsAddresses: {
    [EnvironmentsEnum.MAINNET]: {
      USDC: {
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        decimals: 'mwei',
      },
    },
    [EnvironmentsEnum.GOERLI]: {
      COW: {
        address: '0x91056D4A53E1faa1A84306D4deAEc71085394bC8',
        decimals: 'ether',
      },
    },
  },

  /**
   * WETH address by network
   */
  wethAddress: {
    [EnvironmentsEnum.MAINNET]: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    [EnvironmentsEnum.GOERLI]: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
  },

  /**
   * Chainlink Oracle for resolving ETH/USD rates
   */
  chainlinkEthUsdOracleAddress: {
    [EnvironmentsEnum.MAINNET]: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
    [EnvironmentsEnum.GOERLI]: '0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e',
  },
} as GeneralConfigurationsModel;

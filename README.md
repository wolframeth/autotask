# Autotask

### About

This is an Autotask application for OpenZepplin Defender platform to automatically exchange and manage incoming revenue from ENS name registrations. This Autotask will be responsible for sweeping funds from the .eth registrar controller, and automatically converting it to stablecoins as necessary, before sending it to the ENS DAO.

### Installation

To get started, run `npm install` then configure the application as per Recommended Workflow (below).

### Recommended Workflow

#### 1.) Create a OpenZepplin Defender Account

Go to https://www.openzeppelin.com/defender and create an account.

#### 2.) Setup an Autotask in OpenZepplin Defender

Setup an Autotask in Defender and note down the Autotask ID (guid format).

#### 3.) Setup a Relayer in OpenZepplin Defender

Setup a Relayer in Defender and note down the API Keys

#### 4.) Create a Team API Credentials in OpenZepplin Defender

Create a Team API Credential and note down the Key and Secret.

#### 5.) Create a Tenderly Account

Create a Tenderly Account.

#### 6.) Create a Tenderly Project

Setup a new Tenderly Project (one is provided already by default - this can b repurposed by change the settings and customising the project details). Note down your `username` and the ` project` name.

When you select a project from, the URL will indicate these information: https://dashboard.tenderly.co/**wolfram**/**project**/project-dashboard

#### 7.) Create Tenderly API Credentials

Go to your account settings and create and note down your Tenderly API Access Key.

#### 8.) Editing .env files

Configure your .env file by copying the .env-exampleand renamig it `.env`. Fill out the keys with the information you've collected in the prior stages. It is not necessary to encapsulate the values in quotes inside the `.env` file.

```
AUTOTASK_ID=AUTOTASK_ID_HERE
RELAYER_API_KEY=RELAYER_API_KEY_HERE
RELAYER_API_SECRET=RELAYER_API_SECRET_HERE
TEAM_API_KEY=TEAM_API_KEY_HERE
TEAM_API_SECRET=TEAM_API_SECRET_HERE
TENDERLY_PROJECT=TENDERLY_PROJECT
TENDERLY_USER=TENDERLY_USER
TENDERLY_ACCESS_KEY=TENDER_ACCESS_KEY_HERE
```

#### 9.) Configure your Gnosis Safe Zodiac Module

- Create a Role Modifier in the Zodiac Module.

- Add your OpenZepplin Relayer address to the Role Members.

- Add a target to the WETH contract with `Allow all calls to target` option enabled and `Send` execution type.

- Add a target to the Role Modifier's Multisend contract with `Allow all calls to target` option enabed and `DelegateCall` execution type.

- - You can find the Role Modifier's Multisend contract by going to the Zodiac Dashboard and clicking on the module and `read` seciton of the contract.

- - **Note:** make sure that the Multisend contract allows delegate calls. You will find this in the Multisend contract code.

- Add a target to the ENS Controller contract with `Withdraw` call option enabled.

- Add a target to the CowswapOrderApprover contract with `approveOrder` call option enabled on `DelegateCall` execution type.

- Add a target to the ENS Wallet Treasury (wallet.ensdao.eth) with `Send` execution type.

- Add a target for each stablecoin address that will be utilised in the Autotask with `Send` execution type.

#### 10.) Configure the app

Please take a look at configurations/general.conf.ts for ready-made examples.

| Configuration                            | Value                                                                                                                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| validEnvironments                        | A list of valid networks                                                                                                                                                             |
| tenderlyAPI                              | Tenderly.co main API endpoint                                                                                                                                                        |
| cowswapAPI                               | Cow.fi main API endpoints                                                                                                                                                            |
| cowswapGpv2RelayerAddress                | The contract that performs the exchange of weth/tokens                                                                                                                               |
| cowswapGpv2ContractsAddress              | The contract that performs pre-signature signing of cowswap exchange orders                                                                                                          |
| gnosisSafeAddress                        | The ENS gnosis safe address                                                                                                                                                          |
| gnosisZodiacRoleModifierAddress          | The address of Role modifier contract of ENS gnosis safe addres                                                                                                                      |
| gnosisZodiacRoleModifierMultisendAddress | The multisend address (which supports DelegateCall) of the ENS gnosis safe address                                                                                                   |
| remainingWethReceipients                 | The list of recipients of the remaining WETH that are not used on the Cowswap order - if the order is SELL (sell all ETH), there are no remaining WETH                               |
| ensWallet                                | The ENS wallet (wallet.ensdao.eth)                                                                                                                                                   |
| ensController                            | The ENS Registrar, the contract that facilitates domain registration and stores the fees                                                                                             |
| stablecoinsAddresses                     | The list of stablecoins that will be tracked and used for Cowswap exchange                                                                                                           |
| desiredUsdBalanceInSourceAccount         | The amount of stablecoin balance desired to be kept in the ensWallet - if the ensWallet balance is below the desired amount, and ETH to Stablecoin exchange Cowswap order is created |
| wethAddress                              | Address of WETH contract                                                                                                                                                             |
| chainlinkEthUsdOracleAddress             | Address of Chainlink Aggreegator contract to obtain ETH/USD rates                                                                                                                    |

#### 11.) Simulate

You can use the app to simulate transactions on Tenderly using `npm run simulate <network - goerli, mainnet>`, this is only available locally. It isnot necessary to build the Autotask to perform the simulations.

#### 12.) Build

Build your Autotask using `npm run build` before deploying. This will deploy the Autotask script (index.js) to `dist`.

#### 13.) Deploy

Deploy your Autotask to Defender using `npm run deploy`. Confirm your deployment by going to Defender and check the code of the Autotask.

### Scripts

#### `npm install`

Install the dependencies required to use the application.

#### `npm run simulate <network - goerli, mainnet>`

Local only, not usable on Defender Autotask - Simulate built-in transactions using Tenderly API - check your Tenderly dashboard for results.

#### `npm run build`

Builds the Autotask at `dist`, cleaning the folder first. Creates all the temporary files in `tmp` before bundling all files in `dist`.

#### `npm run deploy`

Deploy your Autotask to OpenZepplin to Defender. Deploys the `index.js` file in `dist` to Defender.

#### `npm run test`

Run the `jest` tests in watch mode, waiting for file changes.

#### `npm run prettier-format`

Format your code.

#### `npm run prettier-watch`

Format your code in watch mode, waiting for file changes.

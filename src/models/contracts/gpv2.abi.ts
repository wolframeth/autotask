export const GPV2_ABI = [
  {
    inputs: [
      {
        internalType: 'contract IERC20',
        name: 'sellToken',
        type: 'address',
      },
      {
        internalType: 'contract IERC20',
        name: 'buyToken',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'receiver',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'sellAmount',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'buyAmount',
        type: 'uint256',
      },
      {
        internalType: 'uint32',
        name: 'validTo',
        type: 'uint32',
      },
      {
        internalType: 'uint256',
        name: 'feeAmountBP',
        type: 'uint256',
      },
      {
        internalType: 'bytes32',
        name: 'kind',
        type: 'bytes32',
      },
      {
        internalType: 'bool',
        name: 'partiallyFillable',
        type: 'bool',
      },
      {
        internalType: 'bytes32',
        name: 'sellTokenBalance',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 'buyTokenBalance',
        type: 'bytes32',
      },
    ],
    name: 'approveOrder',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [],
    name: 'signing',
    outputs: [
      {
        internalType: 'contract GPv2Signing',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

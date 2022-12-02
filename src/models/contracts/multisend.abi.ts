export const MULTISEND_ABI = [
  { inputs: [], stateMutability: 'nonpayable', type: 'constructor' },
  {
    inputs: [{ internalType: 'bytes', name: 'transactions', type: 'bytes' }],
    name: 'multiSend',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
];

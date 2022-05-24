require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");

module.exports = {
  solidity: {
    version: "0.8.12",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    artifacts: './artifacts'
  },
  networks: {
    hardhat: {
      chainId: 1337
    },
  },
  gasReporter: {
    currency: 'EUR',
    gasPrice: 81,
    token: 'ETH',
    coinmarketcap: '05774374-7d61-41b7-87b6-21169e270674'
  }
};
 
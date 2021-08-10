# sushi uni arbitrage with dYdX flashloan

A sample triangular arbitrage application with a dYdX flashloan via Sushi & Uni.
 
## Disclaimer
This repo is not either an investment advice or a recommendation or solicitation to buy or sell any investment and should not be used in the evaluation of the merits of making any investment decision. It should not be relied upon for accounting, legal or tax advice or investment recommendations. The contents reflected herein are subject to change without being updated.

The codes are written for informational and educational purpose only, https and websocket endpoints might not work well if those endpoint have been depreciated. Please find other available endpoints in that case. Thanks for your understanding.
  
## software version

Ensure your `node` and `brownie` version is higher than mine:
```sh
$ node -v
v13.7.0
$ brownie version
Brownie v1.12.4 - Python development framework for Ethereum

Invalid command. Try 'brownie --help' for available commands.
```
   
## environment variables
 
```
TRADE_AMOUNT=100
WALLET_ADDRESS=0x<your wallet address>
PRIVATE_KEY=<private key>
INFURA_MAIN_URL=wss://mainnet.infura.io/ws/v3/<mainnet infura account>
INFURA_HTTP_URL=https://mainnet.infura.io/v3/<mainnet infura account>
```
 
## setup steps
  
1. Rename `.env.template` to `.env` and fill out required information. 
2. Configure `brownie-config.yaml` with appropriate parameters as required. 
3. Install packages and compile Solidity code.
```sh
$ npm install
$ brownie compile
```
4. Deploy the contract to the network if needed
  
## License

This library is licensed under the MIT License.

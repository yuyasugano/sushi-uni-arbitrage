# sushi uni arbitrage with dYdX flashloan

A sample triangular arbitrage application with a dYdX flashloan via Sushi & Uni.
 
## software version

Ensure your `node` and `truffle` version is higher than mine:
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

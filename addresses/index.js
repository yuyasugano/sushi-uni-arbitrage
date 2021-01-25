const sushiswapMainnet = require('./sushiswap-mainnet.json');
const uniswapMainnet = require('./uniswap-mainnet.json');
const dydxMainnet = require('./dydx-mainnet.json');
const tokensMainnet = require('./tokens-mainnet.json');

module.exports = {
    mainnet: {
        sushiswap: sushiswapMainnet,
        uniswap: uniswapMainnet,
        dydx: dydxMainnet,
        tokens: tokensMainnet
    }
};

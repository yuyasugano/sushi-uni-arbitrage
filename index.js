require('dotenv').config();
const Web3 = require('web3');
const web3 = new Web3(
    new Web3.providers.WebsocketProvider(process.env.INFURA_URL)
);

const interfaces = require('./abis');
const { mainnet: addresses } = require('./addresses');
const { address: admin } = web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY);
const BigNumber = require('bignumber.js');

// compile and confirm the file exists
const Flashloan = require('./build/contracts/Flashloan.json');

// use @sushiswap/sdk@3.0.0
const {
    ChainId: sChainId,
    Token: sToken,
    WETH: sWETH,
    Fetcher: sFetcher,
    Trade: sTrade,
    Route: sRoute,
    TokenAmount: sTokenAmount,
    TradeType: sTradeType } = require('@sushiswap/sdk');

// use @uniswap/sdk@3.0.0
const {
    ChainId: uChainId,
    Token: uToken,
    WETH: uWETH,
    Fetcher: uFetcher,
    Trade: uTrade,
    Route: uRoute,
    TokenAmount: uTokenAmount,
    TradeType: uTradeType } = require('@uniswap/sdk');

/* use sdk instead of calling of each contract, just preserved
const sushiswapRouter = new web3.eth.Contract(
    interfaces.sushiswap.sushiswapRouter,
    addresses.sushiswap.sushiswapRouter
);
const sushiswapFactory = new web3.eth.Contract(
    interfaces.sushiswap.sushiswapFactory,
    addresses.sushiswap.sushiswapFactory
);

const uniswapRouter = new web3.eth.Contract(
    interfaces.uniswap.uniswapRouter,
    addresses.uniswap.uniswapRouter
);
const uniswapFactory = new web3.eth.Contract(
    interfaces.uniswap.uniswapFactory,
    addresses.uniswap.uniswapFactory
); */

// to provide initial token amount
const amount = process.env.TRADE_AMOUNT;

const init = async () => {
    const networkId = await web3.eth.net.getId();
    const flashloan = new web3.eth.Contract(
        Flashloan.abi,
        Flashloan.networks[networkId].address
    );

    // leverage Fetcher by the SDK
    // https://uniswap.org/docs/v2/javascript-SDK/fetching-data/
    const [sDai, sWeth, sUsdt, sUsdc, sWbtc, sComp, sLink, sRari, sSnx, sYfi] = await Promise.all(
        [
            addresses.tokens.dai,
            addresses.tokens.weth,
            addresses.tokens.usdt,
            addresses.tokens.usdc,
            addresses.tokens.wbtc,
            addresses.tokens.comp,
            addresses.tokens.link,
            addresses.tokens.rari,
            addresses.tokens.snx,
            addresses.tokens.yfi
        ]
        .map(tokenAddress => (
            sFetcher.fetchTokenData(
                sChainId.MAINNET,
                tokenAddress,
            )
        ))
    );

    // same Fetcher by the SDK
    // https://uniswap.org/docs/v2/javascript-SDK/fetching-data/
    const [uDai, uWeth, uUsdt, uUsdb, uWbtc, uComp, uLink, uRari, uSnx, uYfi] = await Promise.all(
        [
            addresses.tokens.dai,
            addresses.tokens.weth,
            addresses.tokens.usdt,
            addresses.tokens.usdc,
            addresses.tokens.wbtc,
            addresses.tokens.comp,
            addresses.tokens.link,
            addresses.tokens.rari,
            addresses.tokens.snx,
            addresses.tokens.yfi
        ]
        .map(tokenAddress => (
            uFetcher.fetchTokenData(
                uChainId.MAINNET,
                tokenAddress,
            )
        ))
    );

    const tokenPairs = [
        ['WETH', 'DAI', 'LINK']
    ];
    const tokenFetchers = [
        [uWeth, uDai, sDai, sWeth, sLink, uLink, uWeth]
    ];

    let subscription = web3.eth.subscribe('newBlockHeaders', (error, result) => {
        if (!error) {
            // console.log(result);
            return;
        }
        console.error(error);
    })
    .on("connected", subscriptionId => {
        console.log(`You are connected on ${subscriptionId}`);
    })
    .on('data', async block => {
        console.log('-------------------------------------------------------------');
        console.log(`New block received. Block # ${block.number}`);
        console.log(`GasLimit: ${block.gasLimit} and Timestamp: ${block.timestamp}`);

        for (let i = 0; i < tokenPairs.length; i++) {
            console.log(`Investigation path: ${tokenPairs[i][0]} -> ${tokenPairs[i][1]} -> ${tokenPairs[i][2]}`);
            // 0. Prepare a trading amout from environmental variable
            const unit0 = await new BigNumber(amount).toString(); // BigNumber
            const amount0 = await BigInt(new BigNumber(unit0).shiftedBy(tokenFetchers[i][0].decimals).toString());

            // 1. Sell A for B at Uniswap
            const uAtoB = await uFetcher.fetchPairData(
                tokenFetchers[i][1],
                tokenFetchers[i][0]
            );
            const route1 = await new uRoute([uAtoB], tokenFetchers[i][0]);
            const trade1 = await new uTrade(
                route1,
                new uTokenAmount(tokenFetchers[i][0], amount0),
                uTradeType.EXACT_INPUT
            );
            const rate1 = await new BigNumber(trade1.executionPrice.toSignificant(6)).toString();
            console.log(`Putting ${unit0} ${tokenPairs[i][0]} into Uniswap pool`);
            console.log(`Rate ${tokenPairs[i][0]}/${tokenPairs[i][1]}: ${rate1}`);
            console.log(`Sell ${tokenPairs[i][0]} for ${tokenPairs[i][1]} at Uniswap: ${rate1 * unit0}`);

            // 2. Sell B for C at Sushiswap
            const unit1 = await new BigNumber(rate1).times(unit0).toString(); // BigNumber
            const amount1 = await BigInt(new BigNumber(rate1).times(unit0).shiftedBy(tokenFetchers[i][2].decimals).toFixed()); // BigInt
            // indirect path from B to C, refer to the pricing chapter
            // https://uniswap.org/docs/v2/javascript-SDK/pricing/
            const sBtoWeth = await sFetcher.fetchPairData(
                tokenFetchers[i][3],
                tokenFetchers[i][2]
            );
            const sWethtoC = await sFetcher.fetchPairData(
                tokenFetchers[i][4],
                tokenFetchers[i][3]
            );
            const route2 = await new sRoute([sBtoWeth, sWethtoC], tokenFetchers[i][2]);
            const trade2 = await new sTrade(
                route2,
                new sTokenAmount(tokenFetchers[i][2], amount1),
                sTradeType.EXACT_INPUT
            );
            const rate2 = await new BigNumber(trade2.executionPrice.toSignificant(6)).toString();
            console.log(`Putting ${unit1} ${tokenPairs[i][1]} into Sushiswap pool`);
            console.log(`Rate ${tokenPairs[i][1]} for ${tokenPairs[i][2]}: ${rate2}`);
            console.log(`Sell ${tokenPairs[i][1]} for ${tokenPairs[i][2]} at Sushiswap: ${rate2 * unit1}`);

            // 3. Sell C for A at Uniswap
            const unit2 = await new BigNumber(rate2).times(unit1).toString(); // BigNumber
            const amount2 = await BigInt(new BigNumber(rate2).times(unit1).shiftedBy(tokenFetchers[i][4].decimals).toFixed()); // BigInt
            const uCtoA = await uFetcher.fetchPairData(
                tokenFetchers[i][6],
                tokenFetchers[i][5]
            );
            const route3 = await new uRoute([uCtoA], tokenFetchers[i][5]);
            const trade3 = await new uTrade(
                route3,
                new uTokenAmount(tokenFetchers[i][5], amount2),
                uTradeType.EXACT_INPUT
            );
            const rate3 = await new BigNumber(trade3.executionPrice.toSignificant(6)).toString();
            console.log(`Putting ${unit2} ${tokenPairs[i][2]} into Uniswap pool`);
            console.log(`Rate ${tokenPairs[i][2]} for ${tokenPairs[i][0]}: ${rate3}`);
            console.log(`Sell ${tokenPairs[i][2]} for ${tokenPairs[i][0]} at Uniswap: ${rate3 * unit2}`);

            const unit4 = await new BigNumber(rate3).times(unit2).toString(); // BigNumber
            let profit = await new BigNumber(unit4).minus(unit0).toString();
            console.log(`Initial supply from a flashloan: ${unit0}`);
            console.log(`Obtained amount after an arbitrage: ${unit4}`);
            console.log(`Profit: ${profit}`);

            if (profit > 0) {
                
                const tx = flashloan.methods.initiateFlanLoan(
                    addresses.dydx.solo,
                    addresses.tokens.weth,
                    addresses.tokens.dai,
                    addresses.tokens.link,
                    amountOut
                );

                const [gasPrice, gasCost] = await Promise.all([
                    web3.eth.getGasPrice(),
                    tx.estimateGas({from: admin}),
                ]);

                const txCost = web3.utils.toBN(gasCost) * web3.utils.toBN(gasPrice);
                const profit = amountIn - amountOut - txCost; */
                if (profit > 0) {
                    console.log(`Block # ${block.number}: Arbitrage opportunity found! Expected profit: ${profit}`);
                    const data = tx.encodeABI();
                    const txData = {
                        from: admin,
                        to: flashloan.options.address,
                        data,
                        gas: gasCost,
                        gasPrice
                    };
                    const receipt = await web3.eth.sendTransaction(txData);
                    console.log(`Transaction hash: ${receipt.transactionHash}`);
                } else {
                    console.log(`Block # ${block.number}: Arbitrage opportunity not found. Expected profit: ${profit}`);
                }
            }
        }
    })
    .on('error', error => {
        console.log(error);
    });
}

init();


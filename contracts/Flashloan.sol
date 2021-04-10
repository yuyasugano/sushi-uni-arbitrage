pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../node_modules/@studydefi/money-legos/dydx/contracts/DydxFlashloanBase.sol";
import "../node_modules/@studydefi/money-legos/dydx/contracts/ICallee.sol";
import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";

import './IUniswapV2Router01.sol';
import './IUniswapV2Router02.sol';
import './IWeth.sol';

contract Flashloan is ICallee, DydxFlashloanBase {
    struct DexArbitrage {
        address a;
        address b;
        address c;
        uint256 repayAmount;
    }

    event FlashLoanEmitted(
        address a,
        address b,
        address c,
        uint256 repayAmount
    );

    address private owner;
    address constant wethAddress = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant uniswapAddress = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address constant sushiswapAddress = 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F;

    IWeth weth = IWeth(wethAddress);
    IUniswapV2Router02 uniswap = IUniswapV2Router02(uniswapAddress);
    IUniswapV2Router02 sushiswap = IUniswapV2Router02(sushiswapAddress);

    constructor() public {
        owner = msg.sender;
    }

    // This is the function that will be called postLoan
    // i.e. Encode the logic to handle your flashloaned funds here
    function callFunction(
        address sender,
        Account.Info memory account,
        bytes memory data
    ) public {
        DexArbitrage memory dex = abi.decode(data, (DexArbitrage));
        address[] memory path1 = new address[](2);
        address[] memory path2 = new address[](3);

        uint256 amountIna = IERC20(dex.a).balanceOf(address(this));
        IERC20(dex.a).approve(address(uniswap), amountIna);
        path1[0] = address(dex.a);
        path1[1] = address(dex.b);
        uniswap.swapExactTokensForTokens(amountIna, 0, path1, address(this), block.timestamp);

        uint256 amountInb = IERC20(dex.b).balanceOf(address(this));
        IERC20(dex.b).approve(address(sushiswap), amountInb);
        path2[0] = address(dex.b);
        path2[1] = address(address(weth));
        path2[2] = address(dex.c);
        sushiswap.swapExactTokensForTokens(amountInb, 0, path2, address(this), block.timestamp);

        uint256 amountInc = IERC20(dex.c).balanceOf(address(this));
        IERC20(dex.c).approve(address(uniswap), amountInc);
        path1[0] = address(dex.c);
        path1[1] = address(dex.a);
        uniswap.swapExactTokensForTokens(amountInc, 0, path1, address(this), block.timestamp);

        uint256 profit = IERC20(dex.a).balanceOf(address(this)) - dex.repayAmount;
        // Note that you can ignore the line below
        // if your dydx account (this contract in this case)
        // has deposited at least ~2 Wei of assets into the account
        // to balance out the collaterization ratio
        require(
            profit > 0,
            "Not enough funds to repay dydx loan!"
        );

        // transfer the profit to the owner address
        IERC20(dex.a).transfer(owner, profit);

        // TODO: Encode your logic here
        // E.g. arbitrage, liquidate accounts, etc
        // revert("Hello, you haven't encoded your logic");
        emit FlashLoanEmitted(dex.a, dex.b, dex.c, dex.repayAmount);
    }

    function initiateFlashLoan(address _solo, address _a, address _b, address _c, uint256 _amount)
        external
    {
        ISoloMargin solo = ISoloMargin(_solo);

        // Get marketId from token address
        // _a must be a token that dYdX can lend
        uint256 marketId = _getMarketIdFromTokenAddress(_solo, _a);

        // Calculate repay amount (_amount + (2 wei))
        // Approve transfer from
        uint256 repayAmount = _getRepaymentAmountInternal(_amount);
        IERC20(_a).approve(_solo, repayAmount);

        // 1. Withdraw $
        // 2. Call callFunction(...)
        // 3. Deposit back $
        Actions.ActionArgs[] memory operations = new Actions.ActionArgs[](3);

        operations[0] = _getWithdrawAction(marketId, _amount);
        operations[1] = _getCallAction(
            abi.encode(DexArbitrage({a: _a, b: _b, c: _c, repayAmount: repayAmount}))
        );
        operations[2] = _getDepositAction(marketId, repayAmount);

        Account.Info[] memory accountInfos = new Account.Info[](1);
        accountInfos[0] = _getAccountInfo();

        solo.operate(accountInfos, operations);
    }

    // need to be payable to receive a small fee for reimbursement
    function() external payable {}
}


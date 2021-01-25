import pytest
import click

@pytest.fixture(scope='function', autouse=True)
def isolation(fn_isolation):
    pass

def test_dydx(accounts, interface, chain, Flashloan):
    # prepare contracts
    user = accounts[0]
    flashloan = Flashloan.deploy({'from': user})
    wethAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
    daiAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
    linkAddress = '0x514910771af9ca656af840dff83e8264ecf986ca'
    weth = interface.WETH(wethAddress)

    # deposit & obtain WETH and transfer to the Flashloan contract address for repayment
    user.transfer(wethAddress, "1 ether")
    wethBalance = weth.balanceOf(user)
    weth.transfer(flashloan.address, wethBalance, {'from': user})
    before = weth.balanceOf(flashloan.address)

    # execute a flashloan for 100 WETH
    tx = flashloan.initiateFlashLoan('0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e', wethAddress, daiAddress, linkAddress, 100 * 10 ** weth.decimals())
    tx.info()
    after = weth.balanceOf(flashloan.address)
    print(click.style(f'remained weth in wei: {after} {weth.symbol()}', fg='green', bold=True))
    assert after - before > 2, 'Not enough funds to repay dydx loan!'


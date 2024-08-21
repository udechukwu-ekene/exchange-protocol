const { formatUnits, parseEther } = require("ethers/lib/utils");
const { artifacts, contract } = require("hardhat");
const { assert, expect, use } = require("chai");
const { BN, constants, expectEvent, expectRevert, time } = require("@openzeppelin/test-helpers");

const MockERC20 = artifacts.require("./utils/MockERC20.sol");
const CactusFactory = artifacts.require("./CactusFactory.sol");
const CactusPair = artifacts.require("./CactusPair.sol");
const CactusRouter = artifacts.require("./CactusRouter.sol");
const WBNB = artifacts.require("./WBNB.sol");

use(require("chai-as-promised"))
  .should()

contract("CactusX", ([alice, bob, carol, david, erin]) => {
  let pairAB;
  let pairBC;
  let pairAC;
  let cactusRouter;
  let cactusFactory;
  let tokenA;
  let tokenC;
  let wrappedBNB;

  before(async () => {
    // Deploy Factory
    cactusFactory = await CactusFactory.new(alice, { from: alice });

    // Deploy Wrapped BNB
    wrappedBNB = await WBNB.new("Wrapped BNB", "BNB", parseEther("10000000000000"), { from: alice });;

    // Deploy Router
    cactusRouter = await CactusRouter.new(cactusFactory.address, wrappedBNB.address, { from: alice });

    // Deploy ERC20s
    tokenA = await MockERC20.new("Token A", "TA", parseEther("10000000"), { from: alice });
    tokenC = await MockERC20.new("Token C", "TC", parseEther("10000000"), { from: alice });

    // Create 3 LP tokens
    let result = await cactusFactory.createPair(tokenA.address, wrappedBNB.address, { from: alice });
    pairAB = await CactusPair.at(result.logs[0].args[2]);

    result = await cactusFactory.createPair(wrappedBNB.address, tokenC.address, { from: alice });
    pairBC = await CactusPair.at(result.logs[0].args[2]);

    result = await cactusFactory.createPair(tokenA.address, tokenC.address, { from: alice });
    pairAC = await CactusPair.at(result.logs[0].args[2]);

    assert.equal(String(await pairAB.totalSupply()), parseEther("0").toString());
    assert.equal(String(await pairBC.totalSupply()), parseEther("0").toString());
    assert.equal(String(await pairAC.totalSupply()), parseEther("0").toString());

    // Mint and approve all contracts
    for (let thisUser of [alice, bob, carol, david, erin]) {
      await tokenA.mintTokens(parseEther("2000000"), { from: thisUser });
      await tokenC.mintTokens(parseEther("2000000"), { from: thisUser });

      await tokenA.approve(cactusRouter.address, constants.MAX_UINT256, {
        from: thisUser,
      });

      await tokenC.approve(cactusRouter.address, constants.MAX_UINT256, {
        from: thisUser,
      });

      await wrappedBNB.approve(cactusRouter.address, constants.MAX_UINT256, {
        from: thisUser,
      });
    }
  });

  describe("Normal cases for liquidity provision", async () => {
    it("User adds liquidity to LP tokens", async function () {
      const deadline = new BN(await time.latest()).add(new BN("100"));

      /* Add liquidity (Cactus Router)
       * address tokenB,
       * uint256 amountADesired,
       * uint256 amountBDesired,
       * uint256 amountAMin,
       * uint256 amountBMin,
       * address to,
       * uint256 deadline
       */

      // 1 A = 1 C
      let result = await cactusRouter.addLiquidity(
        tokenC.address,
        tokenA.address,
        parseEther("1000000"), // 1M token A
        parseEther("1000000"), // 1M token B
        parseEther("1000000"),
        parseEther("1000000"),
        bob,
        deadline,
        { from: bob }
      );

      expectEvent.inTransaction(result.receipt.transactionHash, tokenA, "Transfer", {
        from: bob,
        to: pairAC.address,
        value: parseEther("1000000").toString(),
      });

      expectEvent.inTransaction(result.receipt.transactionHash, tokenC, "Transfer", {
        from: bob,
        to: pairAC.address,
        value: parseEther("1000000").toString(),
      });

      assert.equal(String(await pairAC.totalSupply()), parseEther("1000000").toString());
      assert.equal(String(await tokenA.balanceOf(pairAC.address)), parseEther("1000000").toString());
      assert.equal(String(await tokenC.balanceOf(pairAC.address)), parseEther("1000000").toString());

      // 1 BNB = 100 A
      result = await cactusRouter.addLiquidityETH(
        tokenA.address,
        parseEther("100000"), // 100k token A
        parseEther("100000"), // 100k token A
        parseEther("1000"), // 1,000 BNB
        bob,
        deadline,
        { from: bob, value: parseEther("1000").toString() }
      );

      expectEvent.inTransaction(result.receipt.transactionHash, tokenA, "Transfer", {
        from: bob,
        to: pairAB.address,
        value: parseEther("100000").toString(),
      });

      assert.equal(String(await pairAB.totalSupply()), parseEther("10000").toString());
      assert.equal(String(await wrappedBNB.balanceOf(pairAB.address)), parseEther("1000").toString());
      assert.equal(String(await tokenA.balanceOf(pairAB.address)), parseEther("100000").toString());

      // 1 BNB = 100 C
      result = await cactusRouter.addLiquidityETH(
        tokenC.address,
        parseEther("100000"), // 100k token C
        parseEther("100000"), // 100k token C
        parseEther("1000"), // 1,000 BNB
        bob,
        deadline,
        { from: bob, value: parseEther("1000").toString() }
      );

      expectEvent.inTransaction(result.receipt.transactionHash, tokenC, "Transfer", {
        from: bob,
        to: pairBC.address,
        value: parseEther("100000").toString(),
      });

      assert.equal(String(await pairBC.totalSupply()), parseEther("10000").toString());
      assert.equal(String(await wrappedBNB.balanceOf(pairBC.address)), parseEther("1000").toString());
      assert.equal(String(await tokenC.balanceOf(pairBC.address)), parseEther("100000").toString());
    });
  });
});

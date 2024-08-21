import { ethers, network, run } from "hardhat";

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const CactusERC20 = await ethers.getContractFactory("CactusERC20");
  const CactusFactory = await ethers.getContractFactory("CactusFactory");
  const CactusPair = await ethers.getContractFactory("CactusPair");
  const CactusRouter = await ethers.getContractFactory("CactusRouter");

  const cactLP = await CactusERC20.deploy();
  const ctFactory = await CactusFactory.deploy('0xC08969b99547cb5F83a462ACdAEfC5F577Ec7676');
  const ctPair = await CactusPair.deploy();
  const ctRouter = await CactusRouter.deploy(ctFactory.address, '0x094616F0BdFB0b526bD735Bf66Eca0Ad254ca81F');

  await cactLP.deployed();

  console.log("deployed ct:", cactLP.address, '::', ctFactory.address, ':::', '::', ctPair.address, '::', ctRouter.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
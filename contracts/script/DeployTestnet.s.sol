// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {AttesterRegistry} from "../src/AttesterRegistry.sol";
import {RatingRegistry} from "../src/RatingRegistry.sol";
import {FeeRouter} from "../src/FeeRouter.sol";
import {MinRatingPolicy} from "../src/MinRatingPolicy.sol";
import {SafeRatingGuard} from "../src/SafeRatingGuard.sol";
import {ArenaBounty} from "../src/ArenaBounty.sol";
import {DevTimelock} from "../src/mocks/DevTimelock.sol";
import {MockERC20} from "../src/mocks/Mocks.sol";

/// @notice Robinhood Chain TESTNET (46630) deploy, backend doc §10 order adapted for testnet:
///         test tokens instead of USDG/$BLRD and a 10-minute DevTimelock instead of the 48h BollardTimelock.
///
///   MULTISIG=0x<brand Safe> forge script script/DeployTestnet.s.sol \
///     --rpc-url rhc_testnet --account <deployer> --broadcast
///
/// Writes addresses and the governance calls the Safe must schedule to deployments/rhc-testnet.json.
/// Never use this script for a mainnet: it deploys open-mint tokens.
contract DeployTestnet is Script {
    uint256 internal constant CHAIN_ID = 46630;

    // Verified on RHC testnet with eth_getCode on 2026-11-02.
    address internal constant IDENTITY_8004 = 0x8004A818BFB912233c491871b3d84c89A494BD9e;
    address internal constant REPUTATION_8004 = 0x8004B663056A597Dffe9eCcC1965A193B7388713;
    address internal constant ALLOWANCE_MODULE = 0xAA46724893dedD72658219405185Fb0Fc91e091C;
    address internal constant MULTI_SEND_141 = 0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526;
    address internal constant MULTI_SEND_CALL_ONLY_141 = 0x9641d764fc13c8B624c04430C7356C1C7C8102e2;

    // §3.2 launch parameters (testnet bond sizes are arbitrary test-token amounts)
    uint256 internal constant MIN_BOND = 1_000e18;
    uint256 internal constant CHALLENGE_BOND = 100e18;
    uint64 internal constant UNBOND_DELAY = 10 days;
    uint64 internal constant KEY_WINDOW = 24 hours;
    uint256 internal constant RUN_FEE = 300e6;
    uint256 internal constant PLAN_PRICE = 99e6;
    uint256 internal constant ATTEMPT_BURN = 1e18;
    uint64 internal constant ATTEMPT_WINDOW = 1 hours;
    uint64 internal constant GUARD_DELAY = 24 hours;
    uint64 internal constant TIMELOCK_DELAY = 10 minutes;

    struct Deployed {
        address tUSDG;
        address tBLRD;
        address timelock;
        address feeRouter;
        address attesters;
        address registry;
        address policy;
        address guard;
        address arena;
        uint256 startBlock;
    }

    function params() public pure returns (RatingRegistry.Params memory) {
        return RatingRegistry.Params({
            quorum: 2,
            minSeeds: 8,
            scoreTolerance: 10,
            criticalMask: 0xB7,
            requiredTestedMask: 0xFF,
            maxTtl: 30 days,
            maxReportAge: 1 days,
            disputeWindow: 72 hours,
            tiebreakWindow: 72 hours,
            requestTtl: 14 days,
            runFee: RUN_FEE,
            disputeSlashAmount: MIN_BOND
        });
    }

    function run() external returns (Deployed memory d) {
        require(block.chainid == CHAIN_ID, "not Robinhood Chain testnet");
        address multisig = vm.envAddress("MULTISIG");
        address stakerSink = vm.envOr("STAKER_SINK", multisig);
        address burnSink = vm.envOr("BURN_SINK", multisig);
        address workerPool = vm.envOr("WORKER_POOL", multisig);

        d.startBlock = block.number;
        vm.startBroadcast();
        d.tUSDG = address(new MockERC20("Bollard Test USDG", "tUSDG", 6));
        d.tBLRD = address(new MockERC20("Bollard Test BLRD", "tBLRD", 18));
        d.timelock = address(new DevTimelock(multisig, TIMELOCK_DELAY));
        d.feeRouter = address(new FeeRouter(d.timelock, multisig, stakerSink, burnSink, workerPool, d.tUSDG, PLAN_PRICE));
        d.attesters = address(
            new AttesterRegistry(d.tBLRD, d.timelock, multisig, MIN_BOND, UNBOND_DELAY, KEY_WINDOW, CHALLENGE_BOND)
        );
        d.registry = address(
            new RatingRegistry(
                d.attesters, d.feeRouter, d.tUSDG, d.timelock, multisig, IDENTITY_8004, REPUTATION_8004, params()
            )
        );
        d.policy = address(new MinRatingPolicy(d.registry));
        address[] memory sends = new address[](2);
        sends[0] = MULTI_SEND_141;
        sends[1] = MULTI_SEND_CALL_ONLY_141;
        d.guard = address(new SafeRatingGuard(d.registry, ALLOWANCE_MODULE, GUARD_DELAY, sends));
        d.arena = address(new ArenaBounty(d.tBLRD, d.feeRouter, ATTEMPT_BURN, ATTEMPT_WINDOW));
        vm.stopBroadcast();

        _write(d, multisig);
    }

    /// @dev Records addresses plus the first governance call the Safe must schedule through the timelock.
    ///      OS/compose allowlists and publishCorpus are added once the harness image and corpus exist.
    function _write(Deployed memory d, address multisig) internal {
        string memory g = "governance";
        vm.serializeAddress(g, "target_setSlasher", d.attesters);
        string memory gov = vm.serializeBytes(g, "data_setSlasher", abi.encodeCall(AttesterRegistry.setSlasher, (d.registry)));

        string memory o = "deployment";
        vm.serializeUint(o, "chainId", CHAIN_ID);
        vm.serializeUint(o, "startBlock", d.startBlock);
        vm.serializeAddress(o, "multisig", multisig);
        vm.serializeAddress(o, "identity8004", IDENTITY_8004);
        vm.serializeAddress(o, "reputation8004", REPUTATION_8004);
        vm.serializeAddress(o, "tUSDG", d.tUSDG);
        vm.serializeAddress(o, "tBLRD", d.tBLRD);
        vm.serializeAddress(o, "timelock", d.timelock);
        vm.serializeAddress(o, "feeRouter", d.feeRouter);
        vm.serializeAddress(o, "attesterRegistry", d.attesters);
        vm.serializeAddress(o, "ratingRegistry", d.registry);
        vm.serializeAddress(o, "minRatingPolicy", d.policy);
        vm.serializeAddress(o, "safeRatingGuard", d.guard);
        vm.serializeAddress(o, "arenaBounty", d.arena);
        string memory json = vm.serializeString(o, "pendingGovernance", gov);
        vm.writeJson(json, "./deployments/rhc-testnet.json");
        console2.log("RatingRegistry", d.registry);
        console2.log("Wrote deployments/rhc-testnet.json");
    }
}

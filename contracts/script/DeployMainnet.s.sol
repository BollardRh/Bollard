// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {AttesterRegistry} from "../src/AttesterRegistry.sol";
import {RatingRegistry} from "../src/RatingRegistry.sol";
import {FeeRouter} from "../src/FeeRouter.sol";
import {MinRatingPolicy} from "../src/MinRatingPolicy.sol";
import {SafeRatingGuard} from "../src/SafeRatingGuard.sol";
import {ArenaBounty} from "../src/ArenaBounty.sol";
import {BollardTimelock} from "../src/BollardTimelock.sol";

/// @notice Robinhood Chain MAINNET (4663) deploy. Real USDG for fees, attester bonds and arena attempts
///         ($BLRD launches later), and the 48h BollardTimelock with the brand Safe as proposer and guardian.
///
///   MULTISIG=0x<brand Safe> forge script script/DeployMainnet.s.sol \
///     --rpc-url rhc_mainnet --private-key $DEPLOYER_PRIVATE_KEY --broadcast
///
/// Writes addresses to deployments/rhc-mainnet.json. Governance (slasher, OS/compose allowlists, corpus)
/// is scheduled afterwards by the Safe through the timelock.
contract DeployMainnet is Script {
    uint256 internal constant CHAIN_ID = 4663;

    // Verified on RHC mainnet with eth_getCode on 2026-11-06. USDG: Paxos "Global Dollar", 6 decimals.
    address internal constant USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;
    address internal constant IDENTITY_8004 = 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432;
    address internal constant REPUTATION_8004 = 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63;
    address internal constant ALLOWANCE_MODULE = 0xAA46724893dedD72658219405185Fb0Fc91e091C;
    address internal constant MULTI_SEND_141 = 0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526;
    address internal constant MULTI_SEND_CALL_ONLY_141 = 0x9641d764fc13c8B624c04430C7356C1C7C8102e2;

    // Launch parameters, all in USDG (6 decimals). Bonds can be raised later through the timelock.
    uint256 internal constant MIN_BOND = 100e6;
    uint256 internal constant CHALLENGE_BOND = 10e6;
    uint64 internal constant UNBOND_DELAY = 10 days;
    uint64 internal constant KEY_WINDOW = 24 hours;
    uint256 internal constant RUN_FEE = 300e6;
    uint256 internal constant PLAN_PRICE = 99e6;
    uint256 internal constant ATTEMPT_BURN = 0.1e6; // arena anti-spam fee, burned; USDG until $BLRD exists
    uint64 internal constant ATTEMPT_WINDOW = 1 hours;
    uint64 internal constant GUARD_DELAY = 24 hours;
    uint64 internal constant TIMELOCK_DELAY = 48 hours;

    struct Deployed {
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
        require(block.chainid == CHAIN_ID, "not Robinhood Chain mainnet");
        address multisig = vm.envAddress("MULTISIG");
        require(multisig.code.length > 0, "MULTISIG must be a deployed Safe");

        d.startBlock = block.number;
        vm.startBroadcast();
        d.timelock = address(new BollardTimelock(multisig, TIMELOCK_DELAY));
        d.feeRouter = address(new FeeRouter(d.timelock, multisig, multisig, multisig, multisig, USDG, PLAN_PRICE));
        d.attesters =
            address(new AttesterRegistry(USDG, d.timelock, multisig, MIN_BOND, UNBOND_DELAY, KEY_WINDOW, CHALLENGE_BOND));
        d.registry = address(
            new RatingRegistry(d.attesters, d.feeRouter, USDG, d.timelock, multisig, IDENTITY_8004, REPUTATION_8004, params())
        );
        d.policy = address(new MinRatingPolicy(d.registry));
        address[] memory sends = new address[](2);
        sends[0] = MULTI_SEND_141;
        sends[1] = MULTI_SEND_CALL_ONLY_141;
        d.guard = address(new SafeRatingGuard(d.registry, ALLOWANCE_MODULE, GUARD_DELAY, sends));
        d.arena = address(new ArenaBounty(USDG, d.feeRouter, ATTEMPT_BURN, ATTEMPT_WINDOW));
        vm.stopBroadcast();

        string memory o = "deployment";
        vm.serializeUint(o, "chainId", CHAIN_ID);
        vm.serializeUint(o, "startBlock", d.startBlock);
        vm.serializeAddress(o, "multisig", multisig);
        vm.serializeAddress(o, "identity8004", IDENTITY_8004);
        vm.serializeAddress(o, "reputation8004", REPUTATION_8004);
        vm.serializeAddress(o, "usdg", USDG);
        vm.serializeAddress(o, "timelock", d.timelock);
        vm.serializeAddress(o, "feeRouter", d.feeRouter);
        vm.serializeAddress(o, "attesterRegistry", d.attesters);
        vm.serializeAddress(o, "ratingRegistry", d.registry);
        vm.serializeAddress(o, "minRatingPolicy", d.policy);
        vm.serializeAddress(o, "safeRatingGuard", d.guard);
        string memory json = vm.serializeAddress(o, "arenaBounty", d.arena);
        vm.writeJson(json, "./deployments/rhc-mainnet.json");
        console2.log("RatingRegistry", d.registry);
        console2.log("Wrote deployments/rhc-mainnet.json");
    }
}

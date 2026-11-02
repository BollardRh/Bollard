// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {BaseTest} from "./Base.t.sol";
import {RatingReport} from "../src/lib/RatingTypes.sol";
import {IIdentityRegistry8004} from "../src/interfaces/IExternal.sol";

interface IIdentityRegister {
    function register(string calldata agentURI) external returns (uint256 agentId);
}

/// @notice Runs the rating flow against the live ERC-8004 registries on Robinhood Chain testnet (46630).
///         Opt-in because it needs network access:  RHC_FORK=true forge test --match-contract Fork8004Test
///         Verified 2026-11-02: identity impl 0x7274e874… and reputation impl 0x16e0fa7f… are the same
///         implementations the backend doc checked on mainnet.
contract Fork8004Test is BaseTest {
    address internal constant IDENTITY = 0x8004A818BFB912233c491871b3d84c89A494BD9e;
    address internal constant REPUTATION = 0x8004B663056A597Dffe9eCcC1965A193B7388713;
    address internal constant VALIDATION = 0x8004Cb1BF31DAf7788923b405b754f57acEB4272;

    bool internal enabled;
    uint256 internal liveAgentId;

    event ExternalWriteFailed(bytes32 indexed what, uint256 indexed ratingId);

    function setUp() public override {
        enabled = vm.envOr("RHC_FORK", false);
        if (!enabled) return;
        vm.createSelectFork("rhc_testnet");
        assertEq(block.chainid, 46630);
        super.setUp();
        vm.prank(gov);
        registry.set8004(IDENTITY, REPUTATION, address(0));
        vm.prank(agentOwner);
        liveAgentId = IIdentityRegister(IDENTITY).register("ipfs://bollard-fork-test-agent");
        _addAttesters(2);
    }

    function test_fork_selectorsLive() public {
        vm.skip(!enabled);
        IIdentityRegistry8004 id = IIdentityRegistry8004(IDENTITY);
        assertEq(id.ownerOf(liveAgentId), agentOwner);
        assertTrue(id.isAuthorizedOrOwner(agentOwner, liveAgentId));
        assertFalse(id.isAuthorizedOrOwner(makeAddr("stranger"), liveAgentId));
        id.getAgentWallet(liveAgentId); // must not revert
    }

    function test_fork_ratingWritesLiveReputation() public {
        vm.skip(!enabled);
        vm.prank(agentOwner);
        uint256 req = registry.requestRun(IDENTITY, liveAgentId, VERSION, bytes32(0));
        RatingReport memory r = _report(req);
        r.agentRegistry = IDENTITY;
        r.agentId = liveAgentId;

        vm.recordLogs();
        _post(r, _ids(0, 1));
        bytes32 failedTopic = keccak256("ExternalWriteFailed(bytes32,uint256)");
        VmLog[] memory logs = _logs();
        for (uint256 i; i < logs.length; ++i) {
            if (logs[i].emitter == address(registry)) {
                assertTrue(logs[i].topics[0] != failedTopic, "live giveFeedback reverted");
            }
        }
        (bool ok,,) = registry.check(IDENTITY, liveAgentId, 5, 0xFF);
        assertTrue(ok);
    }

    struct VmLog {
        bytes32[] topics;
        bytes data;
        address emitter;
    }

    function _logs() internal returns (VmLog[] memory out) {
        // forge-std Vm.Log has the same layout
        bytes memory raw = abi.encode(vm.getRecordedLogs());
        out = abi.decode(raw, (VmLog[]));
    }
}

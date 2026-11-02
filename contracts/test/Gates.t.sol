// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {BaseTest} from "./Base.t.sol";
import {MinRatingPolicy} from "../src/MinRatingPolicy.sol";
import {SafeRatingGuard} from "../src/SafeRatingGuard.sol";
import {ISafeGuard, PackedUserOperation} from "../src/interfaces/IAccounts.sol";
import {RatingReport} from "../src/lib/RatingTypes.sol";
import {MockSafe, MockAllowanceModule, MockMultiSend} from "../src/mocks/Mocks.sol";

/// @notice PDF §3.13 test/Gates.t.sol — Kernel policy and Safe guard.
contract GatesTest is BaseTest {
    MinRatingPolicy internal policy;
    SafeRatingGuard internal guard;
    MockAllowanceModule internal am;
    MockMultiSend internal ms;
    MockSafe internal safe;

    address internal account = makeAddr("kernelAccount");
    address internal safeOwner = makeAddr("safeOwner");
    bytes32 internal constant PID = keccak256("permission-1");
    uint64 internal constant GUARD_DELAY = 24 hours;

    RatingReport internal rated;
    uint256 internal ratingId;

    function setUp() public override {
        super.setUp();
        _addAttesters(4);
        policy = new MinRatingPolicy(address(registry));
        am = new MockAllowanceModule();
        ms = new MockMultiSend();
        address[] memory sends = new address[](1);
        sends[0] = address(ms);
        guard = new SafeRatingGuard(address(registry), address(am), GUARD_DELAY, sends);
        safe = new MockSafe(safeOwner);
    }

    /// @dev Posts a rating for the fixture agent with the given score and failed families.
    function _rate(uint8 score, uint32 failed, uint8 grade) internal {
        RatingReport memory r = _report(_request());
        r.score = score;
        r.failedMask = failed;
        r.grade = grade;
        ratingId = _post(r, _ids(0, 1));
        rated = r;
    }

    // ---------------------------------------------------------------- policy
    function _install(uint8 minGrade, uint32 mask) internal {
        vm.prank(account);
        policy.onInstall(abi.encodePacked(PID, abi.encode(address(identity), agentId, minGrade, mask)));
    }

    function _userOp() internal view returns (PackedUserOperation memory op) {
        op.sender = account;
    }

    function test_policy_passReturnsExpiry() public {
        _rate(96, 0, 5);
        _install(4, 0xFF);
        uint256 v = policy.checkUserOpPolicy(PID, _userOp());
        assertEq(v, uint256(rated.expiresAt) << 160);
        vm.prank(account);
        assertEq(policy.checkSignaturePolicy(PID, address(0), bytes32(0), ""), uint256(rated.expiresAt) << 160);
        assertTrue(policy.isInitialized(account));
        assertTrue(policy.isModuleType(5));
        assertFalse(policy.isModuleType(1));
    }

    function test_policy_belowFloor() public {
        _rate(75, 0, 3);
        _install(4, 0);
        assertEq(policy.checkUserOpPolicy(PID, _userOp()), 1);
    }

    function test_policy_stale() public {
        _rate(96, 0, 5);
        _install(3, 0);
        vm.prank(agentOwner);
        registry.declareVersion(address(identity), agentId, keccak256("v2"));
        assertEq(policy.checkUserOpPolicy(PID, _userOp()), 1);
    }

    function test_policy_expired() public {
        _rate(96, 0, 5);
        _install(3, 0);
        vm.warp(rated.expiresAt);
        assertEq(policy.checkUserOpPolicy(PID, _userOp()), 1);
    }

    function test_policy_disputed() public {
        _rate(96, 0, 5);
        _install(3, 0);
        RatingReport memory c = _copy(rated);
        c.score = 40;
        c.failedMask = 1;
        c.grade = 1;
        (address[] memory ks, bytes[] memory sigs) = _quorum(c, _ids(2, 3));
        registry.disputeRating(ratingId, c, ks, sigs);
        assertEq(policy.checkUserOpPolicy(PID, _userOp()), 1);
    }

    function test_policy_notInstalled() public {
        _rate(96, 0, 5);
        assertEq(policy.checkUserOpPolicy(PID, _userOp()), 1);
    }

    function test_policy_badConfigAndReinstall() public {
        vm.startPrank(account);
        vm.expectRevert(MinRatingPolicy.BadConfig.selector);
        policy.onInstall(abi.encodePacked(PID, abi.encode(address(identity), agentId, uint8(0), uint32(0))));
        vm.expectRevert(MinRatingPolicy.BadConfig.selector);
        policy.onInstall(abi.encodePacked(PID, abi.encode(address(identity), agentId, uint8(6), uint32(0))));
        policy.onInstall(abi.encodePacked(PID, abi.encode(address(identity), agentId, uint8(3), uint32(0))));
        vm.expectRevert(MinRatingPolicy.AlreadyInstalled.selector);
        policy.onInstall(abi.encodePacked(PID, abi.encode(address(identity), agentId, uint8(3), uint32(0))));
        policy.onUninstall(abi.encodePacked(PID));
        assertFalse(policy.isInitialized(account));
        vm.expectRevert(MinRatingPolicy.NotInstalled.selector);
        policy.onUninstall(abi.encodePacked(PID));
        vm.stopPrank();
    }

    // ------------------------------------------------------------ safe guard
    function _exec(address to, bytes memory data, uint8 op) internal {
        vm.prank(safeOwner);
        safe.exec(to, 0, data, op);
    }

    function _wire(uint8 minGrade, uint32 mask) internal {
        _exec(address(guard), abi.encodeCall(SafeRatingGuard.configure, (minGrade, mask)), 0);
        _exec(address(guard), abi.encodeCall(SafeRatingGuard.bindDelegate, (agentWallet, address(identity), agentId)), 0);
        _exec(address(safe), abi.encodeCall(MockSafe.setGuard, (address(guard))), 0);
        _exec(address(safe), abi.encodeCall(MockSafe.enableModule, (address(guard))), 0);
    }

    function _addDelegate(address d) internal pure returns (bytes memory) {
        return abi.encodeCall(MockAllowanceModule.addDelegate, (d));
    }

    function _packTx(uint8 op, address to, bytes memory data) internal pure returns (bytes memory) {
        return abi.encodePacked(op, to, uint256(0), uint256(data.length), data);
    }

    function _multiSend(bytes memory packed) internal pure returns (bytes memory) {
        return abi.encodeCall(MockMultiSend.multiSend, (packed));
    }

    function _failed(uint8 code) internal pure returns (bytes memory) {
        return abi.encodeWithSelector(SafeRatingGuard.RatingCheckFailed.selector, code);
    }

    function test_guard_passingAgentAdded() public {
        _rate(96, 0, 5);
        _wire(4, 0xFF);
        _exec(address(am), _addDelegate(agentWallet), 0);
        assertTrue(am.isDelegate(address(safe), agentWallet));
        _exec(address(am), abi.encodeCall(MockAllowanceModule.setAllowance, (agentWallet, address(usdg), 100e6, 0, 0)), 0);
        assertEq(am.allowanceOf(address(safe), agentWallet, address(usdg)), 100e6);
    }

    function test_guard_belowFloor() public {
        _rate(90, 0, 4);
        _wire(5, 0);
        vm.prank(safeOwner);
        vm.expectRevert(_failed(5));
        safe.exec(address(am), 0, _addDelegate(agentWallet), 0);
    }

    function test_guard_noBinding() public {
        _rate(96, 0, 5);
        _wire(3, 0);
        vm.prank(safeOwner);
        vm.expectRevert(SafeRatingGuard.NoBinding.selector);
        safe.exec(address(am), 0, _addDelegate(makeAddr("unbound")), 0);
    }

    function test_guard_setAllowanceForUnboundDelegate() public {
        _rate(96, 0, 5);
        _wire(3, 0);
        bytes memory data =
            abi.encodeCall(MockAllowanceModule.setAllowance, (makeAddr("unbound"), address(usdg), 1, 0, 0));
        vm.prank(safeOwner);
        vm.expectRevert(SafeRatingGuard.NoBinding.selector);
        safe.exec(address(am), 0, data, 0);
    }

    function test_guard_bindWalletMismatch() public {
        vm.prank(address(safe));
        vm.expectRevert(SafeRatingGuard.WalletMismatch.selector);
        guard.bindDelegate(makeAddr("notTheWallet"), address(identity), agentId);
    }

    function test_guard_notConfigured() public {
        _rate(96, 0, 5);
        _exec(address(safe), abi.encodeCall(MockSafe.setGuard, (address(guard))), 0);
        vm.prank(safeOwner);
        vm.expectRevert(SafeRatingGuard.NotConfigured.selector);
        safe.exec(address(am), 0, _addDelegate(agentWallet), 0);
    }

    // ------------------------------------------------------- bypass attempts
    function test_bypass_addDelegateInsideMultiSend() public {
        _rate(90, 0, 4);
        _wire(5, 0);
        bytes memory data = _multiSend(_packTx(0, address(am), _addDelegate(agentWallet)));
        vm.prank(safeOwner);
        vm.expectRevert(_failed(5));
        safe.exec(address(ms), 0, data, 1);
    }

    function test_bypass_nestedMultiSend() public {
        _rate(90, 0, 4);
        _wire(5, 0);
        bytes memory inner = _multiSend(_packTx(0, address(am), _addDelegate(agentWallet)));
        bytes memory outer = _multiSend(_packTx(1, address(ms), inner));
        vm.prank(safeOwner);
        vm.expectRevert(_failed(5));
        safe.exec(address(ms), 0, outer, 1);
    }

    function test_bypass_delegatecallToUnknown() public {
        _rate(96, 0, 5);
        _wire(3, 0);
        address evil = makeAddr("evilLib");
        vm.prank(safeOwner);
        vm.expectRevert(abi.encodeWithSelector(SafeRatingGuard.UnknownDelegatecall.selector, evil));
        safe.exec(evil, 0, hex"12345678", 1);
    }

    function test_bypass_delegatecallInsideBatchToUnknown() public {
        _rate(96, 0, 5);
        _wire(3, 0);
        address evil = makeAddr("evilLib");
        bytes memory data = _multiSend(_packTx(1, evil, hex"12345678"));
        vm.prank(safeOwner);
        vm.expectRevert(abi.encodeWithSelector(SafeRatingGuard.UnknownDelegatecall.selector, evil));
        safe.exec(address(ms), 0, data, 1);
    }

    function test_bypass_malformedPacking() public {
        _rate(96, 0, 5);
        _wire(3, 0);
        bytes memory call_ = _addDelegate(agentWallet);
        bytes memory packed = abi.encodePacked(uint8(0), address(am), uint256(0), uint256(call_.length + 10), call_);
        vm.prank(safeOwner);
        vm.expectRevert(SafeRatingGuard.MalformedBatch.selector);
        safe.exec(address(ms), 0, _multiSend(packed), 1);
    }

    function test_bypass_truncatedHeader() public {
        _rate(96, 0, 5);
        _wire(3, 0);
        bytes memory packed = abi.encodePacked(uint8(0), address(am), uint256(0)); // 53 bytes, header needs 85
        vm.prank(safeOwner);
        vm.expectRevert(SafeRatingGuard.MalformedBatch.selector);
        safe.exec(address(ms), 0, _multiSend(packed), 1);
    }

    function test_bypass_wrongSelectorOnMultiSend() public {
        _rate(96, 0, 5);
        _wire(3, 0);
        vm.prank(safeOwner);
        vm.expectRevert(SafeRatingGuard.MalformedBatch.selector);
        safe.exec(address(ms), 0, hex"deadbeef", 1);
    }

    function test_bypass_lowerFloorAndAddInOneBatch() public {
        _rate(90, 0, 4);
        _wire(5, 0);
        bytes memory packed = bytes.concat(
            _packTx(0, address(guard), abi.encodeCall(SafeRatingGuard.configure, (3, 0))),
            _packTx(0, address(am), _addDelegate(agentWallet))
        );
        vm.prank(safeOwner);
        vm.expectRevert(_failed(5));
        safe.exec(address(ms), 0, _multiSend(packed), 1);

        // lowering alone is accepted but only takes effect after the delay
        _exec(address(guard), abi.encodeCall(SafeRatingGuard.configure, (3, 0)), 0);
        (uint8 g,) = guard.effectiveFloor(address(safe));
        assertEq(g, 5);
        vm.prank(safeOwner);
        vm.expectRevert(_failed(5));
        safe.exec(address(am), 0, _addDelegate(agentWallet), 0);

        vm.warp(block.timestamp + GUARD_DELAY);
        (g,) = guard.effectiveFloor(address(safe));
        assertEq(g, 3);
        _exec(address(am), _addDelegate(agentWallet), 0);
        assertTrue(am.isDelegate(address(safe), agentWallet));
    }

    function test_raisingFloorAppliesNow() public {
        _wire(3, 0);
        _exec(address(guard), abi.encodeCall(SafeRatingGuard.configure, (5, 0xFF)), 0);
        (uint8 g, uint32 m) = guard.effectiveFloor(address(safe));
        assertEq(g, 5);
        assertEq(m, 0xFF);
    }

    function test_bypass_removeGuardWithoutAnnouncement() public {
        _wire(3, 0);
        bytes memory rm = abi.encodeCall(MockSafe.setGuard, (address(0)));
        vm.prank(safeOwner);
        vm.expectRevert(SafeRatingGuard.GuardRemovalNotAnnounced.selector);
        safe.exec(address(safe), 0, rm, 0);

        _exec(address(guard), abi.encodeCall(SafeRatingGuard.announceRemoval, ()), 0);
        vm.prank(safeOwner);
        vm.expectRevert(SafeRatingGuard.GuardRemovalNotAnnounced.selector);
        safe.exec(address(safe), 0, rm, 0);

        vm.warp(block.timestamp + GUARD_DELAY);
        _exec(address(safe), rm, 0);
        assertEq(safe.guard(), address(0));
    }

    function test_bypass_removeGuardInsideBatch() public {
        _wire(3, 0);
        bytes memory data = _multiSend(_packTx(0, address(safe), abi.encodeCall(MockSafe.setGuard, (address(0)))));
        vm.prank(safeOwner);
        vm.expectRevert(SafeRatingGuard.GuardRemovalNotAnnounced.selector);
        safe.exec(address(ms), 0, data, 1);
    }

    // ---------------------------------------------------------- revoke module
    function test_revoke_afterExpiry() public {
        _rate(96, 0, 5);
        _wire(4, 0);
        _exec(address(am), _addDelegate(agentWallet), 0);
        vm.expectRevert(SafeRatingGuard.RatingStillPasses.selector);
        guard.revokeIfFailing(address(safe), agentWallet);

        vm.warp(rated.expiresAt);
        vm.prank(makeAddr("anyone"));
        guard.revokeIfFailing(address(safe), agentWallet);
        assertFalse(am.isDelegate(address(safe), agentWallet));
    }

    function test_revoke_moduleNotEnabled() public {
        _rate(96, 0, 5);
        _exec(address(guard), abi.encodeCall(SafeRatingGuard.configure, (4, 0)), 0);
        _exec(address(guard), abi.encodeCall(SafeRatingGuard.bindDelegate, (agentWallet, address(identity), agentId)), 0);
        vm.warp(rated.expiresAt);
        vm.expectRevert("module");
        guard.revokeIfFailing(address(safe), agentWallet);
    }

    function test_supportsInterface() public view {
        assertTrue(guard.supportsInterface(type(ISafeGuard).interfaceId));
        assertTrue(guard.supportsInterface(0x01ffc9a7));
        assertFalse(guard.supportsInterface(0xffffffff));
    }
}

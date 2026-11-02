// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ArenaBounty, CanaryWallet} from "../src/ArenaBounty.sol";
import {FeeRouter} from "../src/FeeRouter.sol";
import {MockERC20} from "../src/mocks/Mocks.sol";

/// @notice PDF §3.13 test/ArenaBounty.t.sol
contract ArenaBountyTest is Test {
    event CanaryMoved(uint256 indexed arenaId, address indexed to, address token, uint256 amount, bool counted);

    uint256 internal constant BOUNTY = 1_000e6;
    uint256 internal constant CANARY_FUNDS = 50e18;
    uint256 internal constant BURN = 1e18;
    uint64 internal constant WINDOW = 1 hours;
    uint64 internal constant DURATION = 3 days;

    MockERC20 internal usdg;
    MockERC20 internal blrd;
    MockERC20 internal canaryToken;
    FeeRouter internal feeRouter;
    ArenaBounty internal arena;

    address internal funder = makeAddr("funder");
    address internal agentKey = makeAddr("houseAgentKey");
    address internal attacker = makeAddr("attacker");
    address internal attacker2 = makeAddr("attacker2");
    address internal treasury = makeAddr("treasury");
    address internal workerPool = makeAddr("redTeamPool");

    uint256 internal id;
    CanaryWallet internal canary;

    function setUp() public {
        vm.warp(1_800_000_000);
        vm.roll(100);
        usdg = new MockERC20("Test USDG", "tUSDG", 6);
        blrd = new MockERC20("Test Bollard", "tBLRD", 18);
        canaryToken = new MockERC20("Canary", "CNRY", 18);
        feeRouter = new FeeRouter(
            makeAddr("gov"), treasury, makeAddr("stakers"), makeAddr("burn"), workerPool, address(usdg), 99e6
        );
        arena = new ArenaBounty(address(blrd), address(feeRouter), BURN, WINDOW);

        usdg.mint(funder, BOUNTY);
        canaryToken.mint(funder, CANARY_FUNDS);
        vm.startPrank(funder);
        usdg.approve(address(arena), BOUNTY);
        canaryToken.approve(address(arena), CANARY_FUNDS);
        address c;
        (id, c) = arena.openArena(address(usdg), BOUNTY, address(canaryToken), CANARY_FUNDS, agentKey, 7, DURATION);
        vm.stopPrank();
        canary = CanaryWallet(c);

        _fundAttacker(attacker);
        _fundAttacker(attacker2);
    }

    function _fundAttacker(address a) internal {
        blrd.mint(a, 10 * BURN);
        vm.prank(a);
        blrd.approve(address(arena), type(uint256).max);
    }

    function _attempt(address a) internal {
        vm.prank(a);
        arena.enterAttempt(id, keccak256(abi.encode("session-salt", a)));
    }

    function _agentSends(address to, uint256 amount) internal {
        vm.prank(agentKey);
        canary.transfer(address(canaryToken), to, amount);
    }

    function _settled() internal view returns (bool s, address winner) {
        (,,,,, s, winner) = arena.arenas(id);
    }

    function test_win_attackerPaid90_feeRouted() public {
        _attempt(attacker);
        assertEq(blrd.balanceOf(arena.DEAD()), BURN);
        vm.roll(block.number + 1);
        _agentSends(attacker, 1e18);
        assertEq(usdg.balanceOf(attacker), 900e6);
        assertEq(canaryToken.balanceOf(attacker), 1e18);
        assertEq(usdg.balanceOf(treasury), 10e6);
        assertEq(feeRouter.claimable(workerPool, address(usdg)), 80e6);
        (bool s, address w) = _settled();
        assertTrue(s);
        assertEq(w, attacker);
    }

    function test_attemptSameBlock_notCounted() public {
        _attempt(attacker);
        vm.expectEmit(true, true, false, true, address(arena));
        emit CanaryMoved(id, attacker, address(canaryToken), 1e18, false);
        _agentSends(attacker, 1e18);
        assertEq(usdg.balanceOf(attacker), 0);
        (bool s,) = _settled();
        assertFalse(s);
    }

    function test_expiredAttempt_notCounted() public {
        _attempt(attacker);
        vm.roll(block.number + 1);
        vm.warp(block.timestamp + WINDOW + 1);
        _agentSends(attacker, 1e18);
        assertEq(usdg.balanceOf(attacker), 0);
    }

    function test_transferToNonAttacker_notCounted() public {
        _attempt(attacker);
        vm.roll(block.number + 1);
        address friend = makeAddr("friend");
        vm.expectEmit(true, true, false, true, address(arena));
        emit CanaryMoved(id, friend, address(canaryToken), 1e18, false);
        _agentSends(friend, 1e18);
        (bool s,) = _settled();
        assertFalse(s);
    }

    function test_secondWinAfterSettle_notCounted() public {
        _attempt(attacker);
        _attempt(attacker2);
        vm.roll(block.number + 1);
        _agentSends(attacker, 1e18);
        _agentSends(attacker2, 1e18);
        assertEq(usdg.balanceOf(attacker2), 0);
        (, address w) = _settled();
        assertEq(w, attacker);
    }

    function test_zeroAmount_notCounted() public {
        _attempt(attacker);
        vm.roll(block.number + 1);
        _agentSends(attacker, 0);
        (bool s,) = _settled();
        assertFalse(s);
    }

    function test_directOnCanaryTransfer() public {
        _attempt(attacker);
        vm.roll(block.number + 1);
        vm.prank(attacker);
        vm.expectRevert(ArenaBounty.NotCanary.selector);
        arena.onCanaryTransfer(id, address(canaryToken), attacker, 1e18);
    }

    function test_nonAgentCanaryTransfer() public {
        vm.prank(attacker);
        vm.expectRevert(CanaryWallet.NotAgent.selector);
        canary.transfer(address(canaryToken), attacker, 1e18);
    }

    function test_sweepOnlyByArena() public {
        vm.prank(funder);
        vm.expectRevert(CanaryWallet.NotArena.selector);
        canary.sweep(address(canaryToken), funder);
    }

    function test_reclaimBeforeEnd() public {
        address[] memory toks = new address[](1);
        toks[0] = address(canaryToken);
        vm.prank(funder);
        vm.expectRevert(ArenaBounty.ArenaOpen.selector);
        arena.reclaim(id, toks);
    }

    function test_reclaimAfterEnd_returnsBountyAndCanary() public {
        address[] memory toks = new address[](1);
        toks[0] = address(canaryToken);
        vm.warp(block.timestamp + DURATION);
        vm.prank(attacker);
        vm.expectRevert(ArenaBounty.NotFunder.selector);
        arena.reclaim(id, toks);
        vm.prank(funder);
        arena.reclaim(id, toks);
        assertEq(usdg.balanceOf(funder), BOUNTY);
        assertEq(canaryToken.balanceOf(funder), CANARY_FUNDS);
    }

    function test_reclaimAfterWin() public {
        _attempt(attacker);
        vm.roll(block.number + 1);
        _agentSends(attacker, 1e18);
        vm.warp(block.timestamp + DURATION);
        address[] memory toks = new address[](1);
        toks[0] = address(canaryToken);
        vm.prank(funder);
        vm.expectRevert(ArenaBounty.AlreadySettled.selector);
        arena.reclaim(id, toks);
        vm.prank(funder);
        arena.sweepCanary(id, toks);
        assertEq(canaryToken.balanceOf(funder), CANARY_FUNDS - 1e18);
    }

    function test_sweepCanaryBeforeSettle() public {
        address[] memory toks = new address[](1);
        toks[0] = address(canaryToken);
        vm.prank(funder);
        vm.expectRevert(ArenaBounty.ArenaOpen.selector);
        arena.sweepCanary(id, toks);
    }

    function test_attemptAfterEnd() public {
        vm.warp(block.timestamp + DURATION);
        vm.prank(attacker);
        vm.expectRevert(ArenaBounty.ArenaClosed.selector);
        arena.enterAttempt(id, bytes32(0));
    }

    function test_transferAfterEnd_notCounted() public {
        _attempt(attacker);
        vm.roll(block.number + 1);
        vm.warp(block.timestamp + DURATION);
        _agentSends(attacker, 1e18);
        (bool s,) = _settled();
        assertFalse(s);
    }

    function test_openArenaBadParams() public {
        vm.expectRevert(ArenaBounty.BadParams.selector);
        arena.openArena(address(usdg), 0, address(canaryToken), 0, agentKey, 7, DURATION);
        vm.expectRevert(ArenaBounty.BadParams.selector);
        arena.openArena(address(usdg), 1, address(canaryToken), 0, address(0), 7, DURATION);
        vm.expectRevert(ArenaBounty.BadParams.selector);
        arena.openArena(address(usdg), 1, address(canaryToken), 0, agentKey, 7, 0);
    }

    function test_bountyNeverReachableByAgent() public view {
        assertEq(usdg.balanceOf(address(canary)), 0);
        assertEq(usdg.balanceOf(address(arena)), BOUNTY);
    }
}

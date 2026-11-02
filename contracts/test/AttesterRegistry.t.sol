// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {BaseTest} from "./Base.t.sol";
import {AttesterRegistry} from "../src/AttesterRegistry.sol";
import {TdxQuote} from "../src/lib/TdxQuote.sol";

/// @notice PDF §3.13 test/AttesterRegistry.t.sol
contract AttesterRegistryTest is BaseTest {
    address internal alice = makeAddr("alice");
    address internal challenger = makeAddr("challenger");
    address internal k;

    function setUp() public override {
        super.setUp();
        _bond(alice, MIN_BOND);
        k = makeAddr("aliceKey");
        blrd.mint(challenger, CHALLENGE_BOND * 10);
        vm.prank(challenger);
        blrd.approve(address(attesters), type(uint256).max);
    }

    function _register(bytes memory q) internal {
        vm.prank(alice);
        attesters.registerEnclaveKey(k, q, COMPOSE);
    }

    // ---------------------------------------------------- valid registration
    function test_validQuoteRegisters_inactiveUntilWindow() public {
        _register(_goodQuote(k));
        assertEq(attesters.attesterOf(k), alice);
        assertFalse(attesters.isActiveKey(k));
        vm.warp(block.timestamp + KEY_WINDOW - 1);
        assertFalse(attesters.isActiveKey(k));
        vm.warp(block.timestamp + 1);
        assertTrue(attesters.isActiveKey(k));
    }

    function test_duplicateKey_reverts() public {
        _register(_goodQuote(k));
        vm.expectRevert(AttesterRegistry.KeyExists.selector);
        _register(_goodQuote(k));
    }

    function test_bondTooLow_reverts() public {
        address bob = makeAddr("bob");
        _bond(bob, MIN_BOND - 1);
        vm.prank(bob);
        vm.expectRevert(AttesterRegistry.BondTooLow.selector);
        attesters.registerEnclaveKey(k, _goodQuote(k), COMPOSE);
    }

    // ---------------------------------------------------- forged attestation
    function test_forged_reportDataBindsDifferentKey() public {
        bytes memory q = _rawQuote(TdxQuote.keyBinding(block.chainid, address(attesters), makeAddr("other")), COMPOSE, 4, 0x81, 632);
        vm.expectRevert(AttesterRegistry.BadBinding.selector);
        _register(q);
    }

    function test_forged_boundForOtherChain() public {
        bytes memory q = _rawQuote(TdxQuote.keyBinding(1, address(attesters), k), COMPOSE, 4, 0x81, 632);
        vm.expectRevert(AttesterRegistry.BadBinding.selector);
        _register(q);
    }

    function test_forged_boundForOtherRegistry() public {
        bytes memory q = _rawQuote(TdxQuote.keyBinding(block.chainid, address(0xBEEF), k), COMPOSE, 4, 0x81, 632);
        vm.expectRevert(AttesterRegistry.BadBinding.selector);
        _register(q);
    }

    function test_forged_composeInReportDataDiffersFromArgument() public {
        bytes memory q = _rawQuote(TdxQuote.keyBinding(block.chainid, address(attesters), k), keccak256("other-compose"), 4, 0x81, 632);
        vm.expectRevert(AttesterRegistry.BadBinding.selector);
        _register(q);
    }

    function test_forged_version5() public {
        bytes memory q = _rawQuote(TdxQuote.keyBinding(block.chainid, address(attesters), k), COMPOSE, 5, 0x81, 632);
        vm.expectRevert(TdxQuote.NotTdxV4.selector);
        _register(q);
    }

    function test_forged_teeTypeSgx() public {
        bytes memory q = _rawQuote(TdxQuote.keyBinding(block.chainid, address(attesters), k), COMPOSE, 4, 0x00, 632);
        vm.expectRevert(TdxQuote.NotTdxV4.selector);
        _register(q);
    }

    function test_forged_631ByteQuote() public {
        bytes memory q = _rawQuote(bytes32(0), bytes32(0), 4, 0x81, 631);
        vm.expectRevert(TdxQuote.QuoteTooShort.selector);
        _register(q);
    }

    // ---------------------------------------------------------- allowlists
    function test_osNotAllowed() public {
        vm.prank(gov);
        attesters.setAllowedOs(osMeasurement, false);
        vm.expectRevert(AttesterRegistry.OsNotAllowed.selector);
        _register(_goodQuote(k));
    }

    function test_composeNotAllowed() public {
        vm.prank(gov);
        attesters.setAllowedCompose(COMPOSE, false);
        vm.expectRevert(AttesterRegistry.ComposeNotAllowed.selector);
        _register(_goodQuote(k));
    }

    function test_deallowingOsLater_deactivatesExistingKeys() public {
        _register(_goodQuote(k));
        vm.warp(block.timestamp + KEY_WINDOW);
        assertTrue(attesters.isActiveKey(k));
        vm.prank(gov);
        attesters.setAllowedOs(osMeasurement, false);
        assertFalse(attesters.isActiveKey(k));
    }

    // ------------------------------------------------- on-chain DCAP verifier
    function test_verifierRejecting_quoteRejected() public {
        vm.prank(gov);
        attesters.setQuoteVerifier(address(verifier));
        verifier.setResult(false);
        vm.expectRevert(AttesterRegistry.QuoteRejected.selector);
        _register(_goodQuote(k));
    }

    function test_proveBadQuote_slashesFull_callerHalf() public {
        vm.prank(gov);
        attesters.setQuoteVerifier(address(verifier));
        bytes memory q = _goodQuote(k);
        _register(q);
        verifier.setResult(false); // e.g. TCB revoked after registration
        address hunter = makeAddr("hunter");
        vm.prank(hunter);
        attesters.proveBadQuote(k, q);
        (uint256 bondLeft,,, bool jailed) = attesters.attesters(alice);
        assertEq(bondLeft, 0);
        assertTrue(jailed);
        assertEq(blrd.balanceOf(hunter), MIN_BOND / 2);
        assertEq(blrd.balanceOf(treasury), MIN_BOND / 2);
        assertFalse(attesters.isActiveKey(k));
    }

    function test_proveBadQuote_nonMatchingQuote() public {
        vm.prank(gov);
        attesters.setQuoteVerifier(address(verifier));
        _register(_goodQuote(k));
        verifier.setResult(false);
        bytes memory other = _rawQuote(bytes32(uint256(1)), COMPOSE, 4, 0x81, 632);
        vm.expectRevert(AttesterRegistry.QuoteMismatch.selector);
        attesters.proveBadQuote(k, other);
    }

    function test_proveBadQuote_verifierStillAccepts() public {
        vm.prank(gov);
        attesters.setQuoteVerifier(address(verifier));
        bytes memory q = _goodQuote(k);
        _register(q);
        vm.expectRevert(AttesterRegistry.QuoteRejected.selector);
        attesters.proveBadQuote(k, q);
    }

    // ------------------------------------------------------- key challenges
    function test_challengeInWindow_freezesKey() public {
        _register(_goodQuote(k));
        vm.prank(challenger);
        attesters.challengeKey(k);
        vm.warp(block.timestamp + KEY_WINDOW);
        assertFalse(attesters.isActiveKey(k));
    }

    function test_arbiterFraudTrue_revokedSlashedChallengerRefunded() public {
        _register(_goodQuote(k));
        uint256 before = blrd.balanceOf(challenger);
        vm.prank(challenger);
        attesters.challengeKey(k);
        vm.prank(gov); // keyArbiter defaults to governance
        attesters.resolveKeyChallenge(k, true);
        (,, bool revoked,,,,) = attesters.keys(k);
        assertTrue(revoked);
        assertTrue(attesters.isJailed(alice));
        assertEq(blrd.balanceOf(challenger), before + MIN_BOND / 2);
    }

    function test_arbiterFraudFalse_bondToAttester() public {
        _register(_goodQuote(k));
        vm.prank(challenger);
        attesters.challengeKey(k);
        vm.prank(gov);
        attesters.resolveKeyChallenge(k, false);
        assertEq(blrd.balanceOf(alice), CHALLENGE_BOND);
        assertFalse(attesters.isJailed(alice));
        vm.warp(block.timestamp + KEY_WINDOW);
        assertTrue(attesters.isActiveKey(k));
    }

    function test_challengeAfterWindow_notInWindow() public {
        _register(_goodQuote(k));
        vm.warp(block.timestamp + KEY_WINDOW);
        vm.prank(challenger);
        vm.expectRevert(AttesterRegistry.NotInWindow.selector);
        attesters.challengeKey(k);
    }

    function test_selfChallenge() public {
        _register(_goodQuote(k));
        blrd.mint(alice, CHALLENGE_BOND);
        vm.prank(alice);
        vm.expectRevert(AttesterRegistry.SelfChallenge.selector);
        attesters.challengeKey(k);
    }

    function test_doubleChallenge() public {
        _register(_goodQuote(k));
        vm.prank(challenger);
        attesters.challengeKey(k);
        vm.prank(challenger);
        vm.expectRevert(AttesterRegistry.AlreadyChallenged.selector);
        attesters.challengeKey(k);
    }

    function test_resolveByNonArbiter() public {
        _register(_goodQuote(k));
        vm.prank(challenger);
        attesters.challengeKey(k);
        vm.prank(challenger);
        vm.expectRevert(AttesterRegistry.NotArbiter.selector);
        attesters.resolveKeyChallenge(k, true);
    }

    // ---------------------------------------------------- unbond-to-escape
    function test_unbondThenSlashed_unbondingBucketSlashed() public {
        vm.prank(alice);
        attesters.requestUnbond(MIN_BOND);
        (uint256 b, uint256 u,,) = attesters.attesters(alice);
        assertEq(b, 0);
        assertEq(u, MIN_BOND);
        vm.prank(address(registry)); // registry is the slasher
        attesters.slash(alice, type(uint256).max, makeAddr("disputer"), 5000, "test");
        (b, u,,) = attesters.attesters(alice);
        assertEq(b + u, 0);
        vm.warp(block.timestamp + UNBOND_DELAY);
        vm.prank(alice);
        vm.expectRevert(AttesterRegistry.NothingToWithdraw.selector);
        attesters.withdraw();
    }

    function test_withdrawBeforeDelay_tooEarly() public {
        vm.prank(alice);
        attesters.requestUnbond(MIN_BOND);
        vm.warp(block.timestamp + UNBOND_DELAY - 1);
        vm.prank(alice);
        vm.expectRevert(AttesterRegistry.TooEarly.selector);
        attesters.withdraw();
        vm.warp(block.timestamp + 1);
        vm.prank(alice);
        attesters.withdraw();
        assertEq(blrd.balanceOf(alice), MIN_BOND);
    }

    function test_unbondDelayExceedsDisputeWindows() public pure {
        assertGt(UNBOND_DELAY, DISPUTE_WINDOW + TIEBREAK_WINDOW);
    }

    // -------------------------------------------------------------- jailing
    function test_jailedCannotBondOrRegister() public {
        vm.prank(address(registry));
        attesters.slash(alice, 1, address(0), 0, "test");
        blrd.mint(alice, 1e18);
        vm.startPrank(alice);
        blrd.approve(address(attesters), type(uint256).max);
        vm.expectRevert(AttesterRegistry.Jailed.selector);
        attesters.bond(1e18);
        vm.expectRevert(AttesterRegistry.Jailed.selector);
        attesters.registerEnclaveKey(k, _goodQuote(k), COMPOSE);
        vm.stopPrank();
    }

    function test_slashFromNonSlasher() public {
        vm.expectRevert(AttesterRegistry.NotSlasher.selector);
        attesters.slash(alice, 1, address(0), 0, "x");
    }

    function test_setSlasherTwice() public {
        vm.prank(gov);
        vm.expectRevert(AttesterRegistry.SlasherAlreadySet.selector);
        attesters.setSlasher(makeAddr("x"));
    }

    function test_governanceOnly() public {
        vm.expectRevert(AttesterRegistry.NotGovernance.selector);
        attesters.setAllowedOs(bytes32(0), true);
    }

    function test_revokeOwnKeyOnly() public {
        _register(_goodQuote(k));
        vm.expectRevert(AttesterRegistry.NotKeyOwner.selector);
        attesters.revokeEnclaveKey(k);
        vm.prank(alice);
        attesters.revokeEnclaveKey(k);
        vm.warp(block.timestamp + KEY_WINDOW);
        assertFalse(attesters.isActiveKey(k));
    }
}

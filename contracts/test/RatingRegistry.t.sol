// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {BaseTest} from "./Base.t.sol";
import {RatingRegistry} from "../src/RatingRegistry.sol";
import {AttesterRegistry} from "../src/AttesterRegistry.sol";
import {ECDSA} from "../src/lib/ECDSA.sol";
import {RatingReport, RatingTypes} from "../src/lib/RatingTypes.sol";
import {MockIdentity8004} from "../src/mocks/Mocks.sol";

/// @notice PDF §3.13 test/RatingRegistry.t.sol
contract RatingRegistryTest is BaseTest {
    uint256 internal constant N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;

    event ExternalWriteFailed(bytes32 indexed what, uint256 indexed ratingId);

    function setUp() public override {
        super.setUp();
        _addAttesters(8);
    }

    // a materially different result for the same inputs: score 40, critical family 0 failed -> grade 1
    function _counter(RatingReport memory r) internal pure returns (RatingReport memory c) {
        c = _copy(r);
        c.score = 40;
        c.failedMask = 0x01;
        c.grade = 1;
    }

    // ------------------------------------------------------------ happy path
    function test_happyPath_requestPostCheck() public {
        uint256 req = _request();
        RatingReport memory r = _report(req);
        uint256 id = _post(r, _ids(0, 1));
        assertEq(id, 1);
        (bool ok, uint8 code, uint64 validUntil) = registry.check(address(identity), agentId, 5, 0xFF);
        assertTrue(ok);
        assertEq(code, registry.OK());
        assertEq(validUntil, r.expiresAt);
        assertEq(registry.latestRating(address(identity), agentId), 1);
        (, uint8 status,, uint64 deadline, address[] memory signers) = registry.getRating(1);
        assertEq(status, 1);
        assertEq(deadline, block.timestamp + DISPUTE_WINDOW);
        assertEq(signers[0], att[0]);
        assertEq(signers[1], att[1]);
        assertEq(usdg.balanceOf(address(registry)), RUN_FEE);
    }

    function test_operatorMayRequest() public {
        address op = makeAddr("operator");
        vm.prank(agentOwner);
        identity.setOperator(agentId, op, true);
        usdg.mint(op, RUN_FEE);
        vm.startPrank(op);
        usdg.approve(address(registry), RUN_FEE);
        uint256 req = registry.requestRun(address(identity), agentId, VERSION, bytes32(0));
        vm.stopPrank();
        (,,, address payer,,,,) = registry.requests(req);
        assertEq(payer, op);
    }

    function test_nonOwnerRequest() public {
        vm.prank(makeAddr("stranger"));
        vm.expectRevert(RatingRegistry.NotAgentOwner.selector);
        registry.requestRun(address(identity), agentId, VERSION, bytes32(0));
    }

    function test_unlistedRegistry() public {
        MockIdentity8004 other = new MockIdentity8004();
        uint256 id = other.register(agentOwner, agentWallet);
        vm.prank(agentOwner);
        vm.expectRevert(RatingRegistry.RegistryNotAllowed.selector);
        registry.requestRun(address(other), id, VERSION, bytes32(0));
    }

    function test_zeroVersion() public {
        vm.prank(agentOwner);
        vm.expectRevert(RatingRegistry.BadRequest.selector);
        registry.requestRun(address(identity), agentId, bytes32(0), bytes32(0));
    }

    // ---------------------------------------------- forged attestation / sigs
    function test_unregisteredKey() public {
        RatingReport memory r = _report(_request());
        (address rogue, uint256 pk) = makeAddrAndKey("rogue");
        bytes32 d = registry.digestOf(r);
        address[] memory ks = new address[](2);
        bytes[] memory sigs = new bytes[](2);
        ks[0] = key[0];
        sigs[0] = _sign(keyPk[0], d);
        ks[1] = rogue;
        sigs[1] = _sign(pk, d);
        vm.expectRevert(RatingRegistry.InactiveKey.selector);
        registry.postRating(r, ks, sigs);
    }

    function test_keyStillInChallengeWindow() public {
        address a = makeAddr("late");
        (address k, uint256 pk) = makeAddrAndKey("lateKey");
        _bond(a, MIN_BOND);
        vm.prank(a);
        attesters.registerEnclaveKey(k, _goodQuote(k), COMPOSE);
        RatingReport memory r = _report(_request());
        bytes32 d = registry.digestOf(r);
        address[] memory ks = new address[](2);
        bytes[] memory sigs = new bytes[](2);
        ks[0] = key[0];
        sigs[0] = _sign(keyPk[0], d);
        ks[1] = k;
        sigs[1] = _sign(pk, d);
        vm.expectRevert(RatingRegistry.InactiveKey.selector);
        registry.postRating(r, ks, sigs);
    }

    function test_sigByKeyAPresentedAsKeyB() public {
        RatingReport memory r = _report(_request());
        (address[] memory ks, bytes[] memory sigs) = _quorum(r, _ids(0, 1));
        (ks[0], ks[1]) = (ks[1], ks[0]);
        vm.expectRevert(RatingRegistry.SignerMismatch.selector);
        registry.postRating(r, ks, sigs);
    }

    function test_highSSignature() public {
        RatingReport memory r = _report(_request());
        (address[] memory ks, bytes[] memory sigs) = _quorum(r, _ids(0, 1));
        (uint8 v, bytes32 rr, bytes32 s) = vm.sign(keyPk[0], registry.digestOf(r));
        sigs[0] = abi.encodePacked(rr, bytes32(N - uint256(s)), v == 27 ? uint8(28) : uint8(27));
        vm.expectRevert(ECDSA.BadSignature.selector);
        registry.postRating(r, ks, sigs);
    }

    function test_64ByteSignature() public {
        RatingReport memory r = _report(_request());
        (address[] memory ks, bytes[] memory sigs) = _quorum(r, _ids(0, 1));
        (, bytes32 rr, bytes32 s) = vm.sign(keyPk[0], registry.digestOf(r));
        sigs[0] = abi.encodePacked(rr, s);
        vm.expectRevert(ECDSA.BadSignature.selector);
        registry.postRating(r, ks, sigs);
    }

    function _foreignDigest(RatingReport memory r, uint256 chainId, address verifying) internal pure returns (bytes32) {
        bytes32 domain = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("Bollard"),
                keccak256("1"),
                chainId,
                verifying
            )
        );
        return keccak256(abi.encodePacked("\x19\x01", domain, RatingTypes.hashStruct(r)));
    }

    function _postForeign(RatingReport memory r, bytes32 d) internal {
        address[] memory ks = new address[](2);
        bytes[] memory sigs = new bytes[](2);
        for (uint256 i; i < 2; ++i) {
            ks[i] = key[i];
            sigs[i] = _sign(keyPk[i], d);
        }
        vm.expectRevert(RatingRegistry.SignerMismatch.selector);
        registry.postRating(r, ks, sigs);
    }

    function test_crossChainReplay() public {
        RatingReport memory r = _report(_request());
        _postForeign(r, _foreignDigest(r, 8453, address(registry)));
    }

    function test_otherVerifyingContract() public {
        RatingReport memory r = _report(_request());
        _postForeign(r, _foreignDigest(r, block.chainid, address(0xB0B)));
    }

    // ------------------------------------------------------ collusion / Sybil
    function test_twoKeysSameAttester() public {
        (address k2, uint256 pk2) = makeAddrAndKey("enclave0b");
        vm.prank(att[0]);
        attesters.registerEnclaveKey(k2, _goodQuote(k2), COMPOSE);
        vm.warp(block.timestamp + KEY_WINDOW);
        RatingReport memory r = _report(_request());
        bytes32 d = registry.digestOf(r);
        address[] memory ks = new address[](2);
        bytes[] memory sigs = new bytes[](2);
        ks[0] = key[0];
        sigs[0] = _sign(keyPk[0], d);
        ks[1] = k2;
        sigs[1] = _sign(pk2, d);
        vm.expectRevert(RatingRegistry.DuplicateAttester.selector);
        registry.postRating(r, ks, sigs);
    }

    function test_oneSignerQuorumTwo() public {
        RatingReport memory r = _report(_request());
        uint256[] memory one = new uint256[](1);
        (address[] memory ks, bytes[] memory sigs) = _quorum(r, one);
        vm.expectRevert(RatingRegistry.QuorumNotMet.selector);
        registry.postRating(r, ks, sigs);
    }

    function test_lengthMismatch() public {
        RatingReport memory r = _report(_request());
        (address[] memory ks,) = _quorum(r, _ids(0, 1));
        (, bytes[] memory sigs) = _quorum(r, _ids3(0, 1, 2));
        vm.expectRevert(RatingRegistry.LengthMismatch.selector);
        registry.postRating(r, ks, sigs);
    }

    // ------------------------------------------------------- report checks
    function _expectPostRevert(RatingReport memory r, bytes4 sel) internal {
        (address[] memory ks, bytes[] memory sigs) = _quorum(r, _ids(0, 1));
        vm.expectRevert(sel);
        registry.postRating(r, ks, sigs);
    }

    function test_gradeNotComputed() public {
        RatingReport memory r = _report(_request());
        r.grade = 4;
        _expectPostRevert(r, RatingRegistry.GradeMismatch.selector);
    }

    function test_criticalFailureCapsGrade() public {
        RatingReport memory r = _report(_request());
        r.score = 99;
        r.failedMask = 0x01; // critical family 0
        r.grade = 3;
        _expectPostRevert(r, RatingRegistry.GradeMismatch.selector);
        r.grade = 2;
        _post(r, _ids(0, 1));
    }

    function test_failedNotSubsetOfTested() public {
        RatingReport memory r = _report(_request());
        r.failedMask = 0x100;
        _expectPostRevert(r, RatingRegistry.BadMasks.selector);
    }

    function test_missingRequiredFamily() public {
        RatingReport memory r = _report(_request());
        r.testedMask = 0x7F;
        _expectPostRevert(r, RatingRegistry.UntestedRequired.selector);
    }

    function test_tooFewSeeds() public {
        RatingReport memory r = _report(_request());
        r.seeds = 7;
        _expectPostRevert(r, RatingRegistry.TooFewSeeds.selector);
    }

    function test_scoreAbove100() public {
        RatingReport memory r = _report(_request());
        r.score = 101;
        _expectPostRevert(r, RatingRegistry.BadScore.selector);
    }

    function test_unpublishedCorpus() public {
        RatingReport memory r = _report(_request());
        r.corpusRoot = keccak256("unknown");
        _expectPostRevert(r, RatingRegistry.UnknownCorpus.selector);
    }

    function test_retiredCorpus() public {
        vm.prank(gov);
        registry.retireCorpus(ROOT);
        _expectPostRevert(_report(_request()), RatingRegistry.UnknownCorpus.selector);
    }

    function test_wrongHoldout() public {
        RatingReport memory r = _report(_request());
        r.holdoutCommit = keccak256("other");
        _expectPostRevert(r, RatingRegistry.HoldoutMismatch.selector);
    }

    function test_issuedAtTooOld() public {
        RatingReport memory r = _report(_request());
        vm.warp(block.timestamp + MAX_REPORT_AGE + 1);
        _expectPostRevert(r, RatingRegistry.BadTimes.selector);
    }

    function test_issuedAtInFuture() public {
        RatingReport memory r = _report(_request());
        r.issuedAt = uint64(block.timestamp + 1);
        _expectPostRevert(r, RatingRegistry.BadTimes.selector);
    }

    function test_expiresBeyondMaxTtl() public {
        RatingReport memory r = _report(_request());
        r.expiresAt = r.issuedAt + MAX_TTL + 1;
        _expectPostRevert(r, RatingRegistry.BadTimes.selector);
    }

    function test_reusedRequest() public {
        RatingReport memory r = _report(_request());
        _post(r, _ids(0, 1));
        _expectPostRevert(r, RatingRegistry.RequestNotOpen.selector);
    }

    function test_subjectMismatch() public {
        RatingReport memory r = _report(_request());
        r.versionHash = keccak256("other-version");
        _expectPostRevert(r, RatingRegistry.SubjectMismatch.selector);
    }

    // ------------------------------------------------------ staleness/expiry
    function test_expiry() public {
        RatingReport memory r = _report(_request());
        _post(r, _ids(0, 1));
        vm.warp(r.expiresAt);
        (bool ok, uint8 code,) = registry.check(address(identity), agentId, 1, 0);
        assertFalse(ok);
        assertEq(code, registry.EXPIRED());
    }

    function test_newVersionMakesStale() public {
        _post(_report(_request()), _ids(0, 1));
        vm.prank(agentOwner);
        registry.declareVersion(address(identity), agentId, keccak256("v2"));
        (bool ok, uint8 code,) = registry.check(address(identity), agentId, 1, 0);
        assertFalse(ok);
        assertEq(code, registry.STALE_VERSION());
    }

    function test_oldVersionRatingDoesNotOverwriteLatest() public {
        uint256 req = _request();
        vm.prank(agentOwner);
        registry.declareVersion(address(identity), agentId, keccak256("v2"));
        _post(_report(req), _ids(0, 1));
        assertEq(registry.latestRating(address(identity), agentId), 0);
        (bool ok, uint8 code,) = registry.check(address(identity), agentId, 1, 0);
        assertFalse(ok);
        assertEq(code, registry.NO_RATING());
    }

    function test_checkCodes_floorAndFamilies() public {
        RatingReport memory r = _report(_request());
        r.score = 90;
        r.failedMask = 0x08; // non-critical family 3
        r.grade = 4;
        _post(r, _ids(0, 1));
        (bool ok, uint8 code,) = registry.check(address(identity), agentId, 5, 0);
        assertFalse(ok);
        assertEq(code, registry.BELOW_FLOOR());
        (ok, code,) = registry.check(address(identity), agentId, 1, 0x08);
        assertFalse(ok);
        assertEq(code, registry.FAMILY_FAILED());
        (ok, code,) = registry.check(address(identity), agentId, 4, 0xF7);
        assertTrue(ok);
    }

    function test_noRating() public view {
        (bool ok, uint8 code, uint64 until) = registry.check(address(identity), agentId, 1, 0);
        assertFalse(ok);
        assertEq(code, registry.NO_RATING());
        assertEq(until, 0);
    }

    // --------------------------------------------------- equivocation / jail
    function _equivocate(uint256 i) internal returns (address hunter) {
        RatingReport memory a = _report(_request());
        RatingReport memory b = _counter(a);
        hunter = makeAddr("hunter");
        bytes memory sa = _sign(keyPk[i], registry.digestOf(a));
        bytes memory sb = _sign(keyPk[i], registry.digestOf(b));
        vm.prank(hunter);
        registry.proveEquivocation(a, sa, b, sb);
    }

    function test_equivocation_fullSlashCallerHalf() public {
        address hunter = _equivocate(0);
        (uint256 bondLeft,,, bool jailed) = attesters.attesters(att[0]);
        assertEq(bondLeft, 0);
        assertTrue(jailed);
        assertEq(blrd.balanceOf(hunter), MIN_BOND / 2);
        assertEq(blrd.balanceOf(treasury), MIN_BOND / 2);
    }

    function test_equivocation_differentRunsRoot() public {
        RatingReport memory a = _report(_request());
        RatingReport memory b = _counter(a);
        b.runsRoot = keccak256("other-runs");
        bytes memory sa = _sign(keyPk[0], registry.digestOf(a));
        bytes memory sb = _sign(keyPk[0], registry.digestOf(b));
        vm.expectRevert(RatingRegistry.NotEquivocation.selector);
        registry.proveEquivocation(a, sa, b, sb);
    }

    function test_equivocation_sameResultDifferentIssuedAt() public {
        RatingReport memory a = _report(_request());
        RatingReport memory b = _copy(a);
        b.issuedAt = a.issuedAt - 1;
        bytes memory sa = _sign(keyPk[0], registry.digestOf(a));
        bytes memory sb = _sign(keyPk[0], registry.digestOf(b));
        vm.expectRevert(RatingRegistry.NotEquivocation.selector);
        registry.proveEquivocation(a, sa, b, sb);
    }

    function test_equivocation_differentKeys() public {
        RatingReport memory a = _report(_request());
        RatingReport memory b = _counter(a);
        bytes memory sa = _sign(keyPk[0], registry.digestOf(a));
        bytes memory sb = _sign(keyPk[1], registry.digestOf(b));
        vm.expectRevert(RatingRegistry.NotEquivocation.selector);
        registry.proveEquivocation(a, sa, b, sb);
    }

    function test_signerJailedLater() public {
        _post(_report(_request()), _ids(0, 1));
        _equivocate(1); // attester 1 equivocates on another request
        (bool ok, uint8 code,) = registry.check(address(identity), agentId, 1, 0);
        assertFalse(ok);
        assertEq(code, registry.SIGNER_SLASHED());
    }

    // ---------------------------------------------------- dispute → tiebreak
    /// @dev colluding pair (0,1) posts 96 / grade 5; honest disjoint pair (2,3) disputes with 40 / grade 1.
    function _disputed() internal returns (uint256 ratingId, RatingReport memory orig, RatingReport memory counter) {
        orig = _report(_request());
        ratingId = _post(orig, _ids(0, 1));
        counter = _counter(orig);
        (address[] memory ks, bytes[] memory sigs) = _quorum(counter, _ids(2, 3));
        registry.disputeRating(ratingId, counter, ks, sigs);
    }

    function test_dispute_failsClosed() public {
        _disputed();
        (bool ok, uint8 code,) = registry.check(address(identity), agentId, 1, 0);
        assertFalse(ok);
        assertEq(code, registry.DISPUTED_OR_VOID());
    }

    function test_tiebreak_sidesWithCounter() public {
        (uint256 id, , RatingReport memory counter) = _disputed();
        RatingReport memory tb = _copy(counter);
        tb.score = 42; // within tolerance of the counter, material vs the original
        (address[] memory ks, bytes[] memory sigs) = _quorum(tb, _ids3(4, 5, 6));
        address resolver = makeAddr("resolver");
        vm.prank(resolver);
        uint256 newId = registry.resolveDispute(id, tb, ks, sigs);

        // colluders slashed, resolver gets half of each slash
        assertTrue(attesters.isJailed(att[0]));
        assertTrue(attesters.isJailed(att[1]));
        assertFalse(attesters.isJailed(att[2]));
        assertEq(blrd.balanceOf(resolver), MIN_BOND); // 2 x 50%

        // old rating void, counter becomes latest
        (, uint8 status,,,) = registry.getRating(id);
        assertEq(status, 3);
        assertEq(registry.latestRating(address(identity), agentId), newId);
        (bool ok,,) = registry.check(address(identity), agentId, 1, 0);
        assertTrue(ok);

        // old rating's fees can never be released; new rating's fees go to counter + tiebreak signers
        vm.expectRevert(RatingRegistry.NotActive.selector);
        registry.releaseFees(id);
        registry.releaseFees(newId);
        uint256 each = (RUN_FEE * 8000 / 10_000) / 5;
        for (uint256 i = 2; i <= 6; ++i) assertEq(feeRouter.claimable(att[i], address(usdg)), each);
        assertEq(feeRouter.claimable(att[0], address(usdg)), 0);
    }

    function test_tiebreak_upholdsOriginal() public {
        (uint256 id, RatingReport memory orig,) = _disputed();
        RatingReport memory tb = _copy(orig);
        tb.score = 95;
        (address[] memory ks, bytes[] memory sigs) = _quorum(tb, _ids3(4, 5, 6));
        uint256 newId = registry.resolveDispute(id, tb, ks, sigs);
        assertEq(newId, 0);
        assertTrue(attesters.isJailed(att[2]));
        assertTrue(attesters.isJailed(att[3]));
        assertFalse(attesters.isJailed(att[0]));
        (bool ok,,) = registry.check(address(identity), agentId, 5, 0xFF);
        assertTrue(ok);
        registry.releaseFees(id); // final: releasable at once
        uint256 each = (RUN_FEE * 8000 / 10_000) / 5;
        assertEq(feeRouter.claimable(att[0], address(usdg)), each);
        assertEq(feeRouter.claimable(att[6], address(usdg)), each);
        assertEq(feeRouter.claimable(att[2], address(usdg)), 0);
    }

    function test_dispute_overlappingSigners() public {
        RatingReport memory orig = _report(_request());
        uint256 id = _post(orig, _ids(0, 1));
        RatingReport memory c = _counter(orig);
        (address[] memory ks, bytes[] memory sigs) = _quorum(c, _ids(1, 2));
        vm.expectRevert(RatingRegistry.ExcludedAttester.selector);
        registry.disputeRating(id, c, ks, sigs);
    }

    function test_dispute_nonMaterial() public {
        RatingReport memory orig = _report(_request());
        uint256 id = _post(orig, _ids(0, 1));
        RatingReport memory c = _copy(orig);
        c.score = 90;
        c.grade = 4;
        (address[] memory ks, bytes[] memory sigs) = _quorum(c, _ids(2, 3));
        vm.expectRevert(RatingRegistry.NotMaterial.selector);
        registry.disputeRating(id, c, ks, sigs);
    }

    function test_dispute_differentInputs() public {
        RatingReport memory orig = _report(_request());
        uint256 id = _post(orig, _ids(0, 1));
        RatingReport memory c = _counter(orig);
        c.seeds = 9;
        (address[] memory ks, bytes[] memory sigs) = _quorum(c, _ids(2, 3));
        vm.expectRevert(RatingRegistry.SubjectMismatch.selector);
        registry.disputeRating(id, c, ks, sigs);
    }

    function test_dispute_afterWindow() public {
        RatingReport memory orig = _report(_request());
        uint256 id = _post(orig, _ids(0, 1));
        vm.warp(block.timestamp + DISPUTE_WINDOW);
        RatingReport memory c = _counter(orig);
        (address[] memory ks, bytes[] memory sigs) = _quorum(c, _ids(2, 3));
        vm.expectRevert(RatingRegistry.WindowClosed.selector);
        registry.disputeRating(id, c, ks, sigs);
    }

    function test_tiebreak_matchesNeither() public {
        (uint256 id, RatingReport memory orig,) = _disputed();
        RatingReport memory tb = _copy(orig);
        tb.score = 70;
        tb.grade = 3;
        (address[] memory ks, bytes[] memory sigs) = _quorum(tb, _ids3(4, 5, 6));
        vm.expectRevert(RatingRegistry.MatchesNeither.selector);
        registry.resolveDispute(id, tb, ks, sigs);
    }

    function test_tiebreak_needsQuorumPlusOne() public {
        (uint256 id,, RatingReport memory counter) = _disputed();
        (address[] memory ks, bytes[] memory sigs) = _quorum(counter, _ids(4, 5));
        vm.expectRevert(RatingRegistry.QuorumNotMet.selector);
        registry.resolveDispute(id, counter, ks, sigs);
    }

    function test_tiebreak_mustBeDisjoint() public {
        (uint256 id,, RatingReport memory counter) = _disputed();
        (address[] memory ks, bytes[] memory sigs) = _quorum(counter, _ids3(2, 4, 5));
        vm.expectRevert(RatingRegistry.ExcludedAttester.selector);
        registry.resolveDispute(id, counter, ks, sigs);
    }

    function test_noTiebreak_voidRefundNobodySlashed() public {
        (uint256 id,,) = _disputed();
        vm.expectRevert(RatingRegistry.WindowOpen.selector);
        registry.expireDispute(id);
        uint256 before = usdg.balanceOf(agentOwner);
        vm.warp(block.timestamp + TIEBREAK_WINDOW);
        registry.expireDispute(id);
        assertEq(usdg.balanceOf(agentOwner), before + RUN_FEE);
        for (uint256 i; i < 4; ++i) assertFalse(attesters.isJailed(att[i]));
        (, uint8 status,,,) = registry.getRating(id);
        assertEq(status, 3);
        vm.expectRevert(RatingRegistry.NotDisputed.selector);
        registry.expireDispute(id);
    }

    // ------------------------------------------------------------------ fees
    function test_fees_releaseBeforeWindow() public {
        uint256 id = _post(_report(_request()), _ids(0, 1));
        vm.expectRevert(RatingRegistry.WindowOpen.selector);
        registry.releaseFees(id);
    }

    function test_fees_split80_10_5_5() public {
        uint256 id = _post(_report(_request()), _ids(0, 1));
        vm.warp(block.timestamp + DISPUTE_WINDOW);
        registry.releaseFees(id);
        assertEq(usdg.balanceOf(treasury), 30e6);
        assertEq(usdg.balanceOf(stakerSink), 15e6);
        assertEq(usdg.balanceOf(burnSink), 15e6);
        assertEq(feeRouter.claimable(att[0], address(usdg)), 120e6);
        assertEq(feeRouter.claimable(att[1], address(usdg)), 120e6);
        vm.prank(att[0]);
        feeRouter.claim(address(usdg));
        assertEq(usdg.balanceOf(att[0]), 120e6);
        vm.expectRevert(RatingRegistry.AlreadyReleased.selector);
        registry.releaseFees(id);
    }

    function test_fees_dustToTreasury() public {
        usdg.mint(address(this), 1000);
        usdg.approve(address(feeRouter), 1000);
        address[] memory w = new address[](3);
        w[0] = att[0];
        w[1] = att[1];
        w[2] = att[2];
        feeRouter.distribute(address(usdg), 1000, w);
        assertEq(usdg.balanceOf(treasury), 100);
        assertEq(usdg.balanceOf(stakerSink), 50);
        assertEq(usdg.balanceOf(burnSink), 50);
        assertEq(feeRouter.claimable(att[0], address(usdg)), 266);
        assertEq(feeRouter.claimable(treasury, address(usdg)), 2);
    }

    // ---------------------------------------------------------------- refund
    function test_refundAfter14Days_evenWhilePaused() public {
        uint256 req = _request();
        vm.warp(block.timestamp + REQUEST_TTL - 1);
        vm.expectRevert(RatingRegistry.WindowOpen.selector);
        registry.refundExpiredRequest(req);
        vm.warp(block.timestamp + 1);
        vm.prank(guardian);
        registry.setPaused(true);
        uint256 before = usdg.balanceOf(agentOwner);
        registry.refundExpiredRequest(req);
        assertEq(usdg.balanceOf(agentOwner), before + RUN_FEE);
        vm.expectRevert(RatingRegistry.RequestNotOpen.selector);
        registry.refundExpiredRequest(req);
    }

    // -------------------------------------------------------------- ERC-8004
    function test_erc8004_feedbackRecorded() public {
        RatingReport memory r = _report(_request());
        _post(r, _ids(0, 1));
        assertEq(reputation.count(), 1);
        assertEq(reputation.lastAgentId(), agentId);
        assertEq(reputation.lastValue(), int128(96));
        assertEq(reputation.lastDecimals(), 0);
        assertEq(reputation.lastTag1(), "bollard");
        assertEq(reputation.lastTag2(), "crash-rating-v1");
        assertEq(reputation.lastEndpoint(), "");
        assertEq(reputation.lastUri(), "");
        assertEq(reputation.lastHash(), registry.digestOf(r));
    }

    function test_erc8004_revertingRegistryDoesNotBlock() public {
        reputation.setReverting(true);
        RatingReport memory r = _report(_request());
        (address[] memory ks, bytes[] memory sigs) = _quorum(r, _ids(0, 1));
        vm.expectEmit(true, true, false, false, address(registry));
        emit ExternalWriteFailed("reputation", 1);
        registry.postRating(r, ks, sigs);
        (bool ok,,) = registry.check(address(identity), agentId, 5, 0xFF);
        assertTrue(ok);
    }

    // ----------------------------------------------------------------- pause
    function test_pauseBlocksRequestAndPostOnly() public {
        uint256 req = _request();
        RatingReport memory r = _report(req);
        vm.prank(guardian);
        registry.setPaused(true);
        vm.prank(agentOwner);
        vm.expectRevert(RatingRegistry.Paused.selector);
        registry.requestRun(address(identity), agentId, VERSION, bytes32(0));
        _expectPostRevert(r, RatingRegistry.Paused.selector);
        // reads keep working
        registry.check(address(identity), agentId, 1, 0);
        vm.prank(gov);
        registry.setPaused(false);
        _post(r, _ids(0, 1));
    }

    function test_pauseOnlyGuardianOrGov() public {
        vm.expectRevert(RatingRegistry.NotGuardian.selector);
        registry.setPaused(true);
    }

    function test_noManualWritePath_governanceCannotPostWithoutQuorum() public {
        RatingReport memory r = _report(_request());
        vm.prank(gov);
        vm.expectRevert(RatingRegistry.QuorumNotMet.selector);
        registry.postRating(r, new address[](0), new bytes[](0));
    }
}

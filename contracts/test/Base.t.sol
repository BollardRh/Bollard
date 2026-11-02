// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {AttesterRegistry} from "../src/AttesterRegistry.sol";
import {RatingRegistry} from "../src/RatingRegistry.sol";
import {FeeRouter} from "../src/FeeRouter.sol";
import {TdxQuote} from "../src/lib/TdxQuote.sol";
import {RatingReport} from "../src/lib/RatingTypes.sol";
import {MockERC20, MockIdentity8004, MockReputation8004, MockQuoteVerifier} from "../src/mocks/Mocks.sol";

/// @notice Shared fixture: tokens, ERC-8004 mocks, AttesterRegistry, FeeRouter, RatingRegistry wired with the
///         PDF §3.2 launch parameters, a published corpus, and N bonded attesters with active enclave keys.
abstract contract BaseTest is Test {
    // §3.2 parameters
    uint8 internal constant QUORUM = 2;
    uint16 internal constant MIN_SEEDS = 8;
    uint8 internal constant SCORE_TOLERANCE = 10;
    uint32 internal constant CRITICAL_MASK = 0xB7; // 0b10110111: families 0,1,2,4,5,7
    uint32 internal constant REQUIRED_TESTED = 0xFF;
    uint64 internal constant MAX_TTL = 30 days;
    uint64 internal constant MAX_REPORT_AGE = 1 days;
    uint64 internal constant DISPUTE_WINDOW = 72 hours;
    uint64 internal constant TIEBREAK_WINDOW = 72 hours;
    uint64 internal constant REQUEST_TTL = 14 days;
    uint256 internal constant RUN_FEE = 300e6;
    uint256 internal constant MIN_BOND = 1_000e18;
    uint256 internal constant CHALLENGE_BOND = 100e18;
    uint64 internal constant UNBOND_DELAY = 10 days;
    uint64 internal constant KEY_WINDOW = 24 hours;

    bytes32 internal constant COMPOSE = keccak256("harness-compose-v1");
    bytes32 internal constant ROOT = keccak256("corpus-root-v1");
    bytes32 internal constant HOLDOUT = keccak256("holdout-commit-v1");
    bytes32 internal constant VERSION = keccak256("agent-version-1");

    address internal gov = makeAddr("gov");
    address internal guardian = makeAddr("guardian");
    address internal treasury = makeAddr("treasury");
    address internal stakerSink = makeAddr("stakerSink");
    address internal burnSink = makeAddr("burnSink");
    address internal workerPool = makeAddr("workerPool");
    address internal agentOwner = makeAddr("agentOwner");
    address internal agentWallet = makeAddr("agentWallet");

    MockERC20 internal usdg;
    MockERC20 internal blrd;
    MockIdentity8004 internal identity;
    MockReputation8004 internal reputation;
    MockQuoteVerifier internal verifier;
    AttesterRegistry internal attesters;
    FeeRouter internal feeRouter;
    RatingRegistry internal registry;

    bytes32 internal osMeasurement;
    uint256 internal agentId;

    // attester i: EOA `att[i]`, enclave key private key `keyPk[i]`, enclave key address `key[i]`
    address[] internal att;
    uint256[] internal keyPk;
    address[] internal key;

    function setUp() public virtual {
        vm.warp(1_800_000_000);
        usdg = new MockERC20("Test USDG", "tUSDG", 6);
        blrd = new MockERC20("Test Bollard", "tBLRD", 18);
        identity = new MockIdentity8004();
        reputation = new MockReputation8004();
        verifier = new MockQuoteVerifier();

        attesters = new AttesterRegistry(address(blrd), gov, treasury, MIN_BOND, UNBOND_DELAY, KEY_WINDOW, CHALLENGE_BOND);
        feeRouter = new FeeRouter(gov, treasury, stakerSink, burnSink, workerPool, address(usdg), 99e6);
        registry = new RatingRegistry(
            address(attesters), address(feeRouter), address(usdg), gov, guardian, address(identity), address(reputation), _params()
        );

        osMeasurement = keccak256(abi.encodePacked(_reg(0x11), _reg(0x22), _reg(0x33), _reg(0x44)));
        vm.startPrank(gov);
        attesters.setSlasher(address(registry));
        attesters.setAllowedOs(osMeasurement, true);
        attesters.setAllowedCompose(COMPOSE, true);
        registry.publishCorpus(ROOT, HOLDOUT, "ipfs://corpus-v1");
        vm.stopPrank();

        agentId = identity.register(agentOwner, agentWallet);
        usdg.mint(agentOwner, 10_000e6);
        vm.prank(agentOwner);
        usdg.approve(address(registry), type(uint256).max);
    }

    function _params() internal pure returns (RatingRegistry.Params memory p) {
        p = RatingRegistry.Params({
            quorum: QUORUM,
            minSeeds: MIN_SEEDS,
            scoreTolerance: SCORE_TOLERANCE,
            criticalMask: CRITICAL_MASK,
            requiredTestedMask: REQUIRED_TESTED,
            maxTtl: MAX_TTL,
            maxReportAge: MAX_REPORT_AGE,
            disputeWindow: DISPUTE_WINDOW,
            tiebreakWindow: TIEBREAK_WINDOW,
            requestTtl: REQUEST_TTL,
            runFee: RUN_FEE,
            disputeSlashAmount: MIN_BOND
        });
    }

    // ----------------------------------------------------------- TDX quotes
    function _reg(uint8 fill) internal pure returns (bytes memory b) {
        b = new bytes(48);
        for (uint256 i; i < 48; ++i) b[i] = bytes1(fill);
    }

    /// @dev Synthetic TDX v4 quote: header version 4, tee type 0x81, fixed measurement registers,
    ///      REPORTDATA = (lo, hi). Length 632 unless `len` says otherwise.
    function _rawQuote(bytes32 lo, bytes32 hi, uint16 version, uint32 tee, uint256 len) internal pure returns (bytes memory q) {
        q = new bytes(len);
        q[0] = bytes1(uint8(version));
        q[1] = bytes1(uint8(version >> 8));
        q[4] = bytes1(uint8(tee));
        q[5] = bytes1(uint8(tee >> 8));
        q[6] = bytes1(uint8(tee >> 16));
        q[7] = bytes1(uint8(tee >> 24));
        _write(q, 184, _reg(0x11));
        _write(q, 376, _reg(0x22));
        _write(q, 424, _reg(0x33));
        _write(q, 472, _reg(0x44));
        _write(q, 520, _reg(0x55));
        if (len >= 632) {
            _write(q, 568, abi.encodePacked(lo));
            _write(q, 600, abi.encodePacked(hi));
        }
    }

    function _write(bytes memory q, uint256 at, bytes memory src) internal pure {
        for (uint256 i; i < src.length && at + i < q.length; ++i) q[at + i] = src[i];
    }

    function _goodQuote(address k) internal view returns (bytes memory) {
        return _rawQuote(TdxQuote.keyBinding(block.chainid, address(attesters), k), COMPOSE, 4, 0x81, 632);
    }

    // ------------------------------------------------------------ attesters
    /// @dev Creates `n` bonded attesters with registered keys and warps past the key window.
    function _addAttesters(uint256 n) internal {
        for (uint256 i; i < n; ++i) {
            uint256 idx = att.length;
            address a = makeAddr(string.concat("attester", vm.toString(idx)));
            (address k, uint256 pk) = makeAddrAndKey(string.concat("enclave", vm.toString(idx)));
            _bond(a, MIN_BOND);
            vm.prank(a);
            attesters.registerEnclaveKey(k, _goodQuote(k), COMPOSE);
            att.push(a);
            keyPk.push(pk);
            key.push(k);
        }
        vm.warp(block.timestamp + KEY_WINDOW);
    }

    function _bond(address a, uint256 amount) internal {
        blrd.mint(a, amount);
        vm.startPrank(a);
        blrd.approve(address(attesters), type(uint256).max);
        attesters.bond(amount);
        vm.stopPrank();
    }

    // -------------------------------------------------------------- reports
    function _request() internal returns (uint256 requestId) {
        vm.prank(agentOwner);
        requestId = registry.requestRun(address(identity), agentId, VERSION, bytes32(0));
    }

    function _report(uint256 requestId) internal view returns (RatingReport memory r) {
        r = RatingReport({
            agentRegistry: address(identity),
            agentId: agentId,
            versionHash: VERSION,
            requestId: requestId,
            corpusRoot: ROOT,
            holdoutCommit: HOLDOUT,
            runsRoot: keccak256("runs-root"),
            seeds: 8,
            score: 96,
            grade: 5,
            testedMask: 0xFF,
            failedMask: 0,
            issuedAt: uint64(block.timestamp),
            expiresAt: uint64(block.timestamp) + MAX_TTL
        });
    }

    /// @dev Deep copy. `b = a` on memory structs aliases the same object.
    function _copy(RatingReport memory r) internal pure returns (RatingReport memory) {
        return abi.decode(abi.encode(r), (RatingReport));
    }

    function _sign(uint256 pk, bytes32 digest) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    /// @dev Signs `r` with the keys at `idx` and returns the parallel arrays postRating expects.
    function _quorum(RatingReport memory r, uint256[] memory idx)
        internal
        view
        returns (address[] memory ks, bytes[] memory sigs)
    {
        bytes32 d = registry.digestOf(r);
        ks = new address[](idx.length);
        sigs = new bytes[](idx.length);
        for (uint256 i; i < idx.length; ++i) {
            ks[i] = key[idx[i]];
            sigs[i] = _sign(keyPk[idx[i]], d);
        }
    }

    function _ids(uint256 a, uint256 b) internal pure returns (uint256[] memory x) {
        x = new uint256[](2);
        x[0] = a;
        x[1] = b;
    }

    function _ids3(uint256 a, uint256 b, uint256 c) internal pure returns (uint256[] memory x) {
        x = new uint256[](3);
        x[0] = a;
        x[1] = b;
        x[2] = c;
    }

    function _post(RatingReport memory r, uint256[] memory idx) internal returns (uint256 ratingId) {
        (address[] memory ks, bytes[] memory sigs) = _quorum(r, idx);
        ratingId = registry.postRating(r, ks, sigs);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {
    IERC20,
    IIdentityRegistry8004,
    IReputationRegistry8004,
    IValidationRegistry8004,
    IRatingRegistry
} from "./interfaces/IExternal.sol";
import {AttesterRegistry} from "./AttesterRegistry.sol";
import {FeeRouter} from "./FeeRouter.sol";
import {SafeTransferLib} from "./lib/SafeTransferLib.sol";
import {ReentrancyGuard} from "./lib/ReentrancyGuard.sol";
import {ECDSA} from "./lib/ECDSA.sol";
import {Grades} from "./lib/Grades.sol";
import {RatingReport, RatingTypes} from "./lib/RatingTypes.sol";

/// @title RatingRegistry
/// @notice Crash-test ratings for AI agents that touch money, keyed by ERC-8004 agent id.
///         A rating lands only when a quorum of distinct bonded attesters, each signing with an attested
///         enclave key, sign the same EIP-712 report for a paid request. Ratings carry their version and
///         expiry, go stale when the owner declares a new version, are disputable by a disjoint quorum,
///         and fail closed while disputed or once any signer is jailed.
///         A rating is a test result, not an endorsement. Nobody, including governance, can write, edit
///         or delete one by hand.
contract RatingRegistry is ReentrancyGuard, IRatingRegistry {
    using SafeTransferLib for address;
    using RatingTypes for RatingReport;

    // ----------------------------------------------------------------- errors
    error NotGovernance();
    error NotGuardian();
    error Paused();
    error RegistryNotAllowed();
    error NotAgentOwner();
    error BadRequest();
    error RequestNotOpen();
    error SubjectMismatch();
    error UnknownCorpus();
    error HoldoutMismatch();
    error TooFewSeeds();
    error UntestedRequired();
    error BadMasks();
    error BadScore();
    error GradeMismatch();
    error BadTimes();
    error QuorumNotMet();
    error LengthMismatch();
    error InactiveKey();
    error DuplicateAttester();
    error ExcludedAttester();
    error SignerMismatch();
    error NotActive();
    error WindowClosed();
    error WindowOpen();
    error NotMaterial();
    error NotDisputed();
    error MatchesNeither();
    error NotEquivocation();
    error AlreadyReleased();
    error ZeroAddress();

    // ----------------------------------------------------------------- events
    event RunRequested(
        uint256 indexed requestId,
        address indexed agentRegistry,
        uint256 indexed agentId,
        bytes32 versionHash,
        address payer,
        uint256 fee
    );
    event VersionDeclared(address indexed agentRegistry, uint256 indexed agentId, bytes32 versionHash);
    event RequestRefunded(uint256 indexed requestId, uint256 amount);
    event RatingPosted(
        uint256 indexed ratingId,
        uint256 indexed requestId,
        address indexed agentRegistry,
        uint256 agentId,
        bytes32 versionHash,
        bytes32 digest,
        address[] attesters
    );
    event RatingResult(uint256 indexed ratingId, uint8 score, uint8 grade, uint32 testedMask, uint32 failedMask, uint64 expiresAt);
    event RatingDisputed(uint256 indexed ratingId, address indexed disputer, bytes32 counterDigest, address[] counterAttesters);
    event DisputeResolved(uint256 indexed ratingId, bool originalUpheld, uint256 newRatingId);
    event DisputeExpired(uint256 indexed ratingId);
    event FeesReleased(uint256 indexed ratingId, uint256 amount);
    event EquivocationProven(address indexed key, address indexed attester, bytes32 digestA, bytes32 digestB);
    event CorpusPublished(bytes32 indexed root, bytes32 holdoutCommit, string uri);
    event CorpusRetired(bytes32 indexed root);
    event ExternalWriteFailed(bytes32 indexed what, uint256 indexed ratingId);
    event PausedSet(bool paused);

    // ----------------------------------------------------------- status codes
    uint8 public constant OK = 0;
    uint8 public constant NO_RATING = 1;
    uint8 public constant STALE_VERSION = 2;
    uint8 public constant EXPIRED = 3;
    uint8 public constant DISPUTED_OR_VOID = 4;
    uint8 public constant BELOW_FLOOR = 5;
    uint8 public constant FAMILY_FAILED = 6;
    uint8 public constant UNTESTED_FAMILY = 7;
    uint8 public constant SIGNER_SLASHED = 8;

    uint8 internal constant REQ_OPEN = 1;
    uint8 internal constant REQ_RATED = 2;
    uint8 internal constant REQ_REFUNDED = 3;

    uint8 internal constant R_ACTIVE = 1;
    uint8 internal constant R_DISPUTED = 2;
    uint8 internal constant R_VOID = 3;

    bytes32 private constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    // ----------------------------------------------------------------- config
    AttesterRegistry public immutable attesters;
    FeeRouter public immutable feeRouter;
    address public immutable feeToken; // USDC on Base, USDG on Robinhood Chain
    address public immutable governance;
    address public guardian; // may pause new requests/ratings only
    bool public paused;

    struct Params {
        uint8 quorum; // distinct attesters per rating (tiebreak needs quorum + 1)
        uint16 minSeeds;
        uint8 scoreTolerance; // material difference for disputes
        uint32 criticalMask;
        uint32 requiredTestedMask;
        uint64 maxTtl;
        uint64 maxReportAge;
        uint64 disputeWindow;
        uint64 tiebreakWindow;
        uint64 requestTtl;
        uint256 runFee;
        uint256 disputeSlashAmount;
    }

    Params public params;

    mapping(address => bool) public allowedRegistry; // ERC-8004 identity registries on this chain
    address public homeIdentity; // the canonical ERC-8004 identity registry on this chain
    address public reputation8004; // live ERC-8004 reputation registry (best-effort write)
    address public validation8004; // zero until an ERC-8004 validation registry is verified live

    struct Corpus {
        bytes32 holdoutCommit;
        uint64 publishedAt;
        bool retired;
    }

    mapping(bytes32 => Corpus) public corpora;

    struct Request {
        address agentRegistry;
        uint256 agentId;
        bytes32 versionHash;
        address payer;
        uint64 paidAt;
        uint8 status;
        uint256 fee;
        bytes32 validationRequestHash;
    }

    uint256 public nextRequestId = 1;
    mapping(uint256 => Request) public requests;

    struct Rating {
        RatingReport r;
        uint8 status;
        uint64 postedAt;
        uint64 disputeDeadline; // fees release after this; disputes only before it
        bool feesReleased;
        bytes32 digest;
    }

    uint256 public nextRatingId = 1;
    mapping(uint256 => Rating) internal _ratings;
    mapping(uint256 => address[]) internal _signers;
    mapping(uint256 => address[]) internal _feeWorkers;

    struct Dispute {
        RatingReport counter;
        address disputer;
        uint64 deadline;
    }

    mapping(uint256 => Dispute) internal _disputes;
    mapping(uint256 => address[]) internal _counterSigners;

    mapping(bytes32 => uint256) public latest; // agentKey => ratingId
    mapping(bytes32 => bytes32) public currentVersion; // agentKey => declared version

    modifier onlyGov() {
        if (msg.sender != governance) revert NotGovernance();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert Paused();
        _;
    }

    constructor(
        address attesters_,
        address feeRouter_,
        address feeToken_,
        address governance_,
        address guardian_,
        address homeIdentity_,
        address reputation8004_,
        Params memory p
    ) {
        if (attesters_ == address(0) || feeRouter_ == address(0) || feeToken_ == address(0) || governance_ == address(0)) {
            revert ZeroAddress();
        }
        attesters = AttesterRegistry(attesters_);
        feeRouter = FeeRouter(feeRouter_);
        feeToken = feeToken_;
        governance = governance_;
        guardian = guardian_;
        homeIdentity = homeIdentity_;
        reputation8004 = reputation8004_;
        if (homeIdentity_ != address(0)) allowedRegistry[homeIdentity_] = true;
        params = p;
    }

    // ------------------------------------------------------------- governance
    function setParams(Params calldata p) external onlyGov {
        params = p;
    }

    function setAllowedRegistry(address reg, bool ok) external onlyGov {
        allowedRegistry[reg] = ok;
    }

    function set8004(address home, address reputation, address validation) external onlyGov {
        homeIdentity = home;
        reputation8004 = reputation;
        validation8004 = validation;
        if (home != address(0)) allowedRegistry[home] = true;
    }

    function setGuardian(address g) external onlyGov {
        guardian = g;
    }

    function publishCorpus(bytes32 root, bytes32 holdoutCommit, string calldata uri) external onlyGov {
        corpora[root] = Corpus({holdoutCommit: holdoutCommit, publishedAt: uint64(block.timestamp), retired: false});
        emit CorpusPublished(root, holdoutCommit, uri);
    }

    function retireCorpus(bytes32 root) external onlyGov {
        corpora[root].retired = true;
        emit CorpusRetired(root);
    }

    /// @notice Pause gates new requests and new ratings only. Reads, gates, refunds, disputes and fee
    ///         releases keep working.
    function setPaused(bool p) external {
        if (msg.sender != guardian && msg.sender != governance) revert NotGuardian();
        paused = p;
        emit PausedSet(p);
    }

    // ----------------------------------------------------------- builder side
    function agentKey(address agentRegistry, uint256 agentId) public pure returns (bytes32) {
        return keccak256(abi.encode(agentRegistry, agentId));
    }

    /// @notice Agent owner (or ERC-8004 operator) pays the flat rating-run fee for one agent version.
    ///         Declaring a new version makes any existing rating stale at once.
    function requestRun(address agentRegistry, uint256 agentId, bytes32 versionHash, bytes32 validationRequestHash)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 requestId)
    {
        if (!allowedRegistry[agentRegistry]) revert RegistryNotAllowed();
        if (!IIdentityRegistry8004(agentRegistry).isAuthorizedOrOwner(msg.sender, agentId)) revert NotAgentOwner();
        if (versionHash == bytes32(0)) revert BadRequest();
        uint256 fee = params.runFee;
        feeToken.safeTransferFrom(msg.sender, address(this), fee);
        requestId = nextRequestId++;
        requests[requestId] = Request({
            agentRegistry: agentRegistry,
            agentId: agentId,
            versionHash: versionHash,
            payer: msg.sender,
            paidAt: uint64(block.timestamp),
            status: REQ_OPEN,
            fee: fee,
            validationRequestHash: validationRequestHash
        });
        _declare(agentRegistry, agentId, versionHash);
        emit RunRequested(requestId, agentRegistry, agentId, versionHash, msg.sender, fee);
    }

    /// @notice Owner declares a new live version without paying (e.g. after shipping). Existing rating goes stale.
    function declareVersion(address agentRegistry, uint256 agentId, bytes32 versionHash) external {
        if (!allowedRegistry[agentRegistry]) revert RegistryNotAllowed();
        if (!IIdentityRegistry8004(agentRegistry).isAuthorizedOrOwner(msg.sender, agentId)) revert NotAgentOwner();
        _declare(agentRegistry, agentId, versionHash);
    }

    function _declare(address agentRegistry, uint256 agentId, bytes32 versionHash) internal {
        currentVersion[agentKey(agentRegistry, agentId)] = versionHash;
        emit VersionDeclared(agentRegistry, agentId, versionHash);
    }

    /// @notice If no rating lands within requestTtl, the payer gets the fee back. Never paused.
    function refundExpiredRequest(uint256 requestId) external nonReentrant {
        Request storage q = requests[requestId];
        if (q.status != REQ_OPEN) revert RequestNotOpen();
        if (block.timestamp < q.paidAt + params.requestTtl) revert WindowOpen();
        q.status = REQ_REFUNDED;
        feeToken.safeTransfer(q.payer, q.fee);
        emit RequestRefunded(requestId, q.fee);
    }

    // ---------------------------------------------------------------- ratings
    function domainSeparator() public view returns (bytes32) {
        return keccak256(abi.encode(DOMAIN_TYPEHASH, keccak256("Bollard"), keccak256("1"), block.chainid, address(this)));
    }

    function digestOf(RatingReport memory r) public view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator(), r.hashStruct()));
    }

    function postRating(RatingReport calldata r, address[] calldata keys, bytes[] calldata sigs)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 ratingId)
    {
        Request storage q = requests[r.requestId];
        if (q.status != REQ_OPEN) revert RequestNotOpen();
        if (q.agentRegistry != r.agentRegistry || q.agentId != r.agentId || q.versionHash != r.versionHash) {
            revert SubjectMismatch();
        }
        _validateReport(r);
        bytes32 digest = digestOf(r);
        address[] memory signers = _verifyQuorum(digest, keys, sigs, params.quorum, new address[](0));
        q.status = REQ_RATED;
        ratingId = _store(r, digest, signers, uint64(block.timestamp) + params.disputeWindow);
        _feeWorkers[ratingId] = signers;
        _write8004(ratingId, r, digest, q.validationRequestHash);
    }

    function _validateReport(RatingReport calldata r) internal view {
        Params memory p = params;
        Corpus memory c = corpora[r.corpusRoot];
        if (c.publishedAt == 0 || c.retired) revert UnknownCorpus();
        if (c.holdoutCommit != r.holdoutCommit) revert HoldoutMismatch();
        if (r.seeds < p.minSeeds) revert TooFewSeeds();
        if ((p.requiredTestedMask & ~r.testedMask) != 0) revert UntestedRequired();
        if ((r.failedMask & ~r.testedMask) != 0) revert BadMasks();
        if (r.score > 100) revert BadScore();
        if (r.grade != Grades.compute(r.score, r.failedMask, p.criticalMask)) revert GradeMismatch();
        if (r.issuedAt > block.timestamp || r.issuedAt + p.maxReportAge < block.timestamp) revert BadTimes();
        if (r.expiresAt <= block.timestamp || r.expiresAt > r.issuedAt + p.maxTtl) revert BadTimes();
    }

    /// @dev Returns the distinct attester addresses behind `keys`. Every key must be active and every
    ///      attester distinct and outside the exclusion list (used to force disjoint dispute quorums).
    function _verifyQuorum(
        bytes32 digest,
        address[] memory keys,
        bytes[] memory sigs,
        uint256 need,
        address[] memory exclude
    ) internal view returns (address[] memory out) {
        if (keys.length != sigs.length) revert LengthMismatch();
        if (keys.length < need || need == 0) revert QuorumNotMet();
        out = new address[](keys.length);
        for (uint256 i; i < keys.length; ++i) {
            if (ECDSA.recover(digest, sigs[i]) != keys[i]) revert SignerMismatch();
            if (!attesters.isActiveKey(keys[i])) revert InactiveKey();
            address a = attesters.attesterOf(keys[i]);
            for (uint256 j; j < i; ++j) {
                if (out[j] == a) revert DuplicateAttester();
            }
            if (_contains(exclude, a)) revert ExcludedAttester();
            out[i] = a;
        }
    }

    function _contains(address[] memory list, address a) internal pure returns (bool) {
        for (uint256 i; i < list.length; ++i) {
            if (list[i] == a) return true;
        }
        return false;
    }

    function _store(RatingReport memory r, bytes32 digest, address[] memory signers, uint64 disputeDeadline)
        internal
        returns (uint256 ratingId)
    {
        ratingId = nextRatingId++;
        Rating storage rt = _ratings[ratingId];
        rt.r = r;
        rt.status = R_ACTIVE;
        rt.postedAt = uint64(block.timestamp);
        rt.disputeDeadline = disputeDeadline;
        rt.digest = digest;
        _signers[ratingId] = signers;
        bytes32 k = agentKey(r.agentRegistry, r.agentId);
        if (currentVersion[k] == r.versionHash) latest[k] = ratingId;
        emit RatingPosted(ratingId, r.requestId, r.agentRegistry, r.agentId, r.versionHash, digest, signers);
        emit RatingResult(ratingId, r.score, r.grade, r.testedMask, r.failedMask, r.expiresAt);
    }

    /// @dev Best-effort ERC-8004 writes. A failing or missing registry never blocks a rating.
    function _write8004(uint256 ratingId, RatingReport calldata r, bytes32 digest, bytes32 validationRequestHash)
        internal
    {
        if (r.agentRegistry == homeIdentity && reputation8004 != address(0)) {
            try IReputationRegistry8004(reputation8004).giveFeedback{gas: 400_000}(
                r.agentId, int128(uint128(r.score)), 0, "bollard", "crash-rating-v1", "", "", digest
            ) {} catch {
                emit ExternalWriteFailed("reputation", ratingId);
            }
        }
        if (validation8004 != address(0) && validationRequestHash != bytes32(0)) {
            try IValidationRegistry8004(validation8004).validationResponse{gas: 400_000}(
                validationRequestHash, r.score, "", digest, "bollard-crash-v1"
            ) {} catch {
                emit ExternalWriteFailed("validation", ratingId);
            }
        }
    }

    // --------------------------------------------------------------- disputes
    /// @notice A disjoint quorum re-ran the same request on the same inputs and got a materially different
    ///         result. The rating fails closed until a tiebreak or expiry.
    function disputeRating(uint256 ratingId, RatingReport calldata counter, address[] calldata keys, bytes[] calldata sigs)
        external
        nonReentrant
    {
        Rating storage rt = _ratings[ratingId];
        if (rt.status != R_ACTIVE) revert NotActive();
        if (block.timestamp >= rt.disputeDeadline) revert WindowClosed();
        _checkCounter(rt.r, counter);
        (bytes32 d, address[] memory cs) = _counterQuorum(ratingId, counter, keys, sigs);
        rt.status = R_DISPUTED;
        Dispute storage dp = _disputes[ratingId];
        dp.counter = counter;
        dp.disputer = msg.sender;
        dp.deadline = uint64(block.timestamp) + params.tiebreakWindow;
        _counterSigners[ratingId] = cs;
        emit RatingDisputed(ratingId, msg.sender, d, cs);
    }

    /// @notice A third quorum (quorum + 1, disjoint from both sides) re-ran and sides with one report.
    ///         The losing side is slashed; the resolver receives half of each slash.
    function resolveDispute(uint256 ratingId, RatingReport calldata tiebreak, address[] calldata keys, bytes[] calldata sigs)
        external
        nonReentrant
        returns (uint256 newRatingId)
    {
        Rating storage rt = _ratings[ratingId];
        if (rt.status != R_DISPUTED) revert NotDisputed();
        if (block.timestamp >= _disputes[ratingId].deadline) revert WindowClosed();
        bool withOrig = _side(ratingId, tiebreak);
        address[] memory tb = _tiebreakQuorum(ratingId, tiebreak, keys, sigs);
        if (withOrig) {
            _slashAll(_counterSigners[ratingId]);
            rt.status = R_ACTIVE;
            rt.disputeDeadline = uint64(block.timestamp); // final: fees releasable now
            _feeWorkers[ratingId] = _concat(_signers[ratingId], tb);
            emit DisputeResolved(ratingId, true, 0);
        } else {
            _slashAll(_signers[ratingId]);
            rt.status = R_VOID;
            rt.feesReleased = true; // fee moves to the replacement rating
            RatingReport memory counter = _disputes[ratingId].counter;
            newRatingId = _store(counter, digestOf(counter), _counterSigners[ratingId], uint64(block.timestamp));
            _feeWorkers[newRatingId] = _concat(_counterSigners[ratingId], tb);
            emit DisputeResolved(ratingId, false, newRatingId);
        }
    }

    /// @dev true = tiebreak sides with the original rating, false = with the counter report.
    function _side(uint256 ratingId, RatingReport calldata tiebreak) internal view returns (bool withOrig) {
        RatingReport memory orig = _ratings[ratingId].r;
        if (!RatingTypes.sameInputs(orig, tiebreak)) revert SubjectMismatch();
        _validateShape(tiebreak);
        withOrig = !_material(orig, tiebreak);
        bool withCounter = !_material(_disputes[ratingId].counter, tiebreak);
        if (withOrig == withCounter) revert MatchesNeither();
    }

    function _tiebreakQuorum(uint256 ratingId, RatingReport calldata tiebreak, address[] calldata keys, bytes[] calldata sigs)
        internal
        view
        returns (address[] memory)
    {
        return _verifyQuorum(
            digestOf(tiebreak), keys, sigs, uint256(params.quorum) + 1, _concat(_signers[ratingId], _counterSigners[ratingId])
        );
    }

    function _slashAll(address[] memory losers) internal {
        uint256 amt = params.disputeSlashAmount;
        for (uint256 i; i < losers.length; ++i) {
            attesters.slash(losers[i], amt, msg.sender, 5000, "dispute-lost");
        }
    }

    /// @notice No tiebreak in time: the rating is void and the payer is refunded. Nobody is slashed.
    function expireDispute(uint256 ratingId) external nonReentrant {
        Rating storage rt = _ratings[ratingId];
        if (rt.status != R_DISPUTED) revert NotDisputed();
        if (block.timestamp < _disputes[ratingId].deadline) revert WindowOpen();
        rt.status = R_VOID;
        rt.feesReleased = true;
        Request storage q = requests[rt.r.requestId];
        q.status = REQ_REFUNDED;
        feeToken.safeTransfer(q.payer, q.fee);
        emit DisputeExpired(ratingId);
        emit RequestRefunded(rt.r.requestId, q.fee);
    }

    /// @notice Permissionless once the dispute window has passed: 80/10/5/5 through the FeeRouter.
    function releaseFees(uint256 ratingId) external nonReentrant {
        Rating storage rt = _ratings[ratingId];
        if (rt.status != R_ACTIVE) revert NotActive();
        if (rt.feesReleased) revert AlreadyReleased();
        if (block.timestamp < rt.disputeDeadline) revert WindowOpen();
        rt.feesReleased = true;
        uint256 fee = requests[rt.r.requestId].fee;
        feeToken.safeApprove(address(feeRouter), fee);
        feeRouter.distribute(feeToken, fee, _feeWorkers[ratingId]);
        emit FeesReleased(ratingId, fee);
    }

    /// @notice Permissionless: one enclave key signed two different results for the same run bundle.
    ///         Scoring is deterministic from the bundle, so this is provably dishonest. Full slash.
    function proveEquivocation(RatingReport calldata a, bytes calldata sigA, RatingReport calldata b, bytes calldata sigB)
        external
        nonReentrant
    {
        if (!RatingTypes.sameInputs(a, b) || a.runsRoot != b.runsRoot) revert NotEquivocation();
        if (a.score == b.score && a.failedMask == b.failedMask && a.testedMask == b.testedMask) revert NotEquivocation();
        bytes32 da = digestOf(a);
        bytes32 db = digestOf(b);
        address key = ECDSA.recover(da, sigA);
        if (ECDSA.recover(db, sigB) != key) revert NotEquivocation();
        address att = attesters.attesterOf(key);
        if (att == address(0)) revert NotEquivocation();
        attesters.slash(att, type(uint256).max, msg.sender, 5000, "equivocation");
        emit EquivocationProven(key, att, da, db);
    }

    function _checkCounter(RatingReport memory orig, RatingReport calldata counter) internal view {
        if (!RatingTypes.sameInputs(orig, counter)) revert SubjectMismatch();
        _validateShape(counter);
        if (!_material(orig, counter)) revert NotMaterial();
    }

    function _counterQuorum(uint256 ratingId, RatingReport calldata counter, address[] calldata keys, bytes[] calldata sigs)
        internal
        view
        returns (bytes32 d, address[] memory cs)
    {
        d = digestOf(counter);
        cs = _verifyQuorum(d, keys, sigs, params.quorum, _signers[ratingId]);
    }

    function _validateShape(RatingReport memory r) internal view {
        Params memory p = params;
        if ((p.requiredTestedMask & ~r.testedMask) != 0) revert UntestedRequired();
        if ((r.failedMask & ~r.testedMask) != 0) revert BadMasks();
        if (r.score > 100) revert BadScore();
        if (r.grade != Grades.compute(r.score, r.failedMask, p.criticalMask)) revert GradeMismatch();
        if (r.issuedAt > block.timestamp || r.expiresAt <= r.issuedAt || r.expiresAt > r.issuedAt + p.maxTtl) {
            revert BadTimes();
        }
    }

    function _material(RatingReport memory a, RatingReport memory b) internal view returns (bool) {
        uint256 diff = a.score > b.score ? a.score - b.score : b.score - a.score;
        uint256 gdiff = a.grade > b.grade ? a.grade - b.grade : b.grade - a.grade;
        return diff > params.scoreTolerance || gdiff >= 2;
    }

    function _concat(address[] memory a, address[] memory b) internal pure returns (address[] memory c) {
        c = new address[](a.length + b.length);
        for (uint256 i; i < a.length; ++i) c[i] = a[i];
        for (uint256 i; i < b.length; ++i) c[a.length + i] = b[i];
    }

    // ------------------------------------------------------------------ views
    /// @inheritdoc IRatingRegistry
    function check(address agentRegistry, uint256 agentId, uint8 minGrade, uint32 requiredPassMask)
        public
        view
        returns (bool ok, uint8 code, uint64 validUntil)
    {
        bytes32 k = agentKey(agentRegistry, agentId);
        uint256 id = latest[k];
        if (id == 0) return (false, NO_RATING, 0);
        Rating storage rt = _ratings[id];
        if (rt.status != R_ACTIVE) return (false, DISPUTED_OR_VOID, 0);
        RatingReport storage r = rt.r;
        if (r.versionHash != currentVersion[k]) return (false, STALE_VERSION, 0);
        if (block.timestamp >= r.expiresAt) return (false, EXPIRED, 0);
        address[] storage s = _signers[id];
        for (uint256 i; i < s.length; ++i) {
            if (attesters.isJailed(s[i])) return (false, SIGNER_SLASHED, 0);
        }
        if ((requiredPassMask & ~r.testedMask) != 0) return (false, UNTESTED_FAMILY, 0);
        if ((requiredPassMask & r.failedMask) != 0) return (false, FAMILY_FAILED, 0);
        if (r.grade < minGrade) return (false, BELOW_FLOOR, 0);
        return (true, OK, r.expiresAt);
    }

    function getRating(uint256 ratingId)
        external
        view
        returns (RatingReport memory r, uint8 status, uint64 postedAt, uint64 disputeDeadline, address[] memory signers)
    {
        Rating storage rt = _ratings[ratingId];
        return (rt.r, rt.status, rt.postedAt, rt.disputeDeadline, _signers[ratingId]);
    }

    function latestRating(address agentRegistry, uint256 agentId) external view returns (uint256) {
        return latest[agentKey(agentRegistry, agentId)];
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20, IQuoteVerifier} from "./interfaces/IExternal.sol";
import {SafeTransferLib} from "./lib/SafeTransferLib.sol";
import {ReentrancyGuard} from "./lib/ReentrancyGuard.sol";
import {TdxQuote} from "./lib/TdxQuote.sol";

/// @title AttesterRegistry
/// @notice Test-node operators ("attesters") bond $BLRD and register enclave signing keys. A key is only
///         accepted if the TDX quote binds it (REPORTDATA) and was produced by an allowed OS image and
///         an allowed harness compose hash. Bonds are slashable; unbonding waits long enough that every
///         rating an attester signed has left its dispute window.
contract AttesterRegistry is ReentrancyGuard {
    using SafeTransferLib for address;

    // ----------------------------------------------------------------- errors
    error NotGovernance();
    error NotSlasher();
    error NotArbiter();
    error SlasherAlreadySet();
    error BondTooLow();
    error Jailed();
    error KeyExists();
    error UnknownKey();
    error NotKeyOwner();
    error BadBinding();
    error OsNotAllowed();
    error ComposeNotAllowed();
    error QuoteRejected();
    error QuoteMismatch();
    error NotInWindow();
    error AlreadyChallenged();
    error NotChallenged();
    error NothingToWithdraw();
    error TooEarly();
    error ZeroAddress();
    error SelfChallenge();

    // ----------------------------------------------------------------- events
    event Bonded(address indexed attester, uint256 amount, uint256 total);
    event UnbondRequested(address indexed attester, uint256 amount, uint64 withdrawableAt);
    event Withdrawn(address indexed attester, uint256 amount);
    event EnclaveKeyRegistered(
        address indexed key,
        address indexed attester,
        bytes32 osMeasurement,
        bytes32 composeHash,
        bytes32 rtmr3Hash,
        bytes32 quoteHash,
        uint64 activeAt,
        bytes rawQuote
    );
    event EnclaveKeyRevoked(address indexed key);
    event KeyChallenged(address indexed key, address indexed challenger);
    event KeyChallengeResolved(address indexed key, bool fraud);
    event Slashed(address indexed attester, uint256 amount, address indexed beneficiary, uint256 toBeneficiary, bytes32 reason);
    event ParamSet(bytes32 indexed what, uint256 value);
    event AllowSet(bytes32 indexed kind, bytes32 indexed value, bool allowed);

    // ----------------------------------------------------------------- config
    address public immutable stakeToken; // $BLRD
    address public immutable governance; // BollardTimelock
    address public immutable treasury;
    address public slasher; // RatingRegistry, set once
    address public keyArbiter; // timelocked; only resolves compose-hash disputes when no on-chain path exists
    IQuoteVerifier public quoteVerifier; // optional on-chain DCAP adapter

    uint256 public minBond;
    uint64 public unbondDelay; // must exceed the rating dispute + tiebreak windows
    uint64 public keyChallengeWindow; // used when no on-chain quote verifier is configured
    uint256 public challengeBond;

    mapping(bytes32 => bool) public allowedOs; // keccak(MRTD||RTMR0||RTMR1||RTMR2)
    mapping(bytes32 => bool) public allowedCompose; // dstack app-compose hash of the harness image

    struct Attester {
        uint256 bond;
        uint256 unbonding;
        uint64 withdrawableAt;
        bool jailed;
    }

    struct EnclaveKey {
        address attester;
        uint64 activeAt;
        bool revoked;
        address challenger; // non-zero while a key challenge is open
        bytes32 quoteHash;
        bytes32 osMeasurement;
        bytes32 composeHash;
    }

    mapping(address => Attester) public attesters;
    mapping(address => EnclaveKey) public keys;

    modifier onlyGov() {
        if (msg.sender != governance) revert NotGovernance();
        _;
    }

    constructor(
        address stakeToken_,
        address governance_,
        address treasury_,
        uint256 minBond_,
        uint64 unbondDelay_,
        uint64 keyChallengeWindow_,
        uint256 challengeBond_
    ) {
        if (stakeToken_ == address(0) || governance_ == address(0) || treasury_ == address(0)) revert ZeroAddress();
        stakeToken = stakeToken_;
        governance = governance_;
        treasury = treasury_;
        keyArbiter = governance_;
        minBond = minBond_;
        unbondDelay = unbondDelay_;
        keyChallengeWindow = keyChallengeWindow_;
        challengeBond = challengeBond_;
    }

    // ------------------------------------------------------------- governance
    function setSlasher(address s) external onlyGov {
        if (slasher != address(0)) revert SlasherAlreadySet();
        if (s == address(0)) revert ZeroAddress();
        slasher = s;
    }

    function setAllowedOs(bytes32 m, bool ok) external onlyGov {
        allowedOs[m] = ok;
        emit AllowSet("os", m, ok);
    }

    function setAllowedCompose(bytes32 h, bool ok) external onlyGov {
        allowedCompose[h] = ok;
        emit AllowSet("compose", h, ok);
    }

    function setQuoteVerifier(address v) external onlyGov {
        quoteVerifier = IQuoteVerifier(v);
        emit ParamSet("quoteVerifier", uint256(uint160(v)));
    }

    function setKeyArbiter(address a) external onlyGov {
        if (a == address(0)) revert ZeroAddress();
        keyArbiter = a;
        emit ParamSet("keyArbiter", uint256(uint160(a)));
    }

    function setParams(uint256 minBond_, uint64 unbondDelay_, uint64 keyChallengeWindow_, uint256 challengeBond_)
        external
        onlyGov
    {
        minBond = minBond_;
        unbondDelay = unbondDelay_;
        keyChallengeWindow = keyChallengeWindow_;
        challengeBond = challengeBond_;
        emit ParamSet("minBond", minBond_);
        emit ParamSet("unbondDelay", unbondDelay_);
        emit ParamSet("keyChallengeWindow", keyChallengeWindow_);
        emit ParamSet("challengeBond", challengeBond_);
    }

    // ---------------------------------------------------------------- bonding
    function bond(uint256 amount) external nonReentrant {
        Attester storage a = attesters[msg.sender];
        if (a.jailed) revert Jailed();
        stakeToken.safeTransferFrom(msg.sender, address(this), amount);
        a.bond += amount;
        emit Bonded(msg.sender, amount, a.bond);
    }

    /// @notice Moves bond into the unbonding bucket. It stays slashable until `withdrawableAt`.
    function requestUnbond(uint256 amount) external {
        Attester storage a = attesters[msg.sender];
        if (amount > a.bond) amount = a.bond;
        a.bond -= amount;
        a.unbonding += amount;
        a.withdrawableAt = uint64(block.timestamp) + unbondDelay;
        emit UnbondRequested(msg.sender, amount, a.withdrawableAt);
    }

    /// @notice Never gated by pause or governance: only by the unbonding delay.
    function withdraw() external nonReentrant {
        Attester storage a = attesters[msg.sender];
        uint256 amt = a.unbonding;
        if (amt == 0) revert NothingToWithdraw();
        if (block.timestamp < a.withdrawableAt) revert TooEarly();
        a.unbonding = 0;
        stakeToken.safeTransfer(msg.sender, amt);
        emit Withdrawn(msg.sender, amt);
    }

    // ----------------------------------------------------------- enclave keys
    /// @notice Register an enclave signing key with the TDX quote that binds it.
    /// @param composeHash the dstack app-compose hash the enclave claims; it must also sit in REPORTDATA[32:64].
    function registerEnclaveKey(address key, bytes calldata rawQuote, bytes32 composeHash) external {
        Attester storage a = attesters[msg.sender];
        if (a.jailed) revert Jailed();
        if (a.bond < minBond) revert BondTooLow();
        if (key == address(0)) revert ZeroAddress();
        if (keys[key].attester != address(0)) revert KeyExists();

        TdxQuote.Fields memory f = TdxQuote.parse(rawQuote);
        if (f.reportDataLo != TdxQuote.keyBinding(block.chainid, address(this), key)) revert BadBinding();
        if (f.reportDataHi != composeHash) revert BadBinding();
        if (!allowedOs[f.osMeasurement]) revert OsNotAllowed();
        if (!allowedCompose[composeHash]) revert ComposeNotAllowed();

        // With an on-chain DCAP verifier the signature chain is checked up front. The compose-hash claim is
        // only provable by replaying the RTMR3 event log off-chain, so every key still waits out the window.
        if (address(quoteVerifier) != address(0) && !quoteVerifier.verifyQuote(rawQuote)) revert QuoteRejected();
        uint64 activeAt = uint64(block.timestamp) + keyChallengeWindow;

        bytes32 qh = keccak256(rawQuote);
        keys[key] = EnclaveKey({
            attester: msg.sender,
            activeAt: activeAt,
            revoked: false,
            challenger: address(0),
            quoteHash: qh,
            osMeasurement: f.osMeasurement,
            composeHash: composeHash
        });
        emit EnclaveKeyRegistered(key, msg.sender, f.osMeasurement, composeHash, f.rtmr3Hash, qh, activeAt, rawQuote);
    }

    function revokeEnclaveKey(address key) external {
        if (keys[key].attester != msg.sender) revert NotKeyOwner();
        keys[key].revoked = true;
        emit EnclaveKeyRevoked(key);
    }

    /// @notice Permissionless: if an on-chain verifier is configured and rejects the exact quote the key was
    ///         registered with, the attester is slashed in full and the caller receives half.
    function proveBadQuote(address key, bytes calldata rawQuote) external nonReentrant {
        EnclaveKey storage k = keys[key];
        if (k.attester == address(0)) revert UnknownKey();
        if (keccak256(rawQuote) != k.quoteHash) revert QuoteMismatch();
        if (address(quoteVerifier) == address(0)) revert QuoteRejected();
        if (quoteVerifier.verifyQuote(rawQuote)) revert QuoteRejected();
        k.revoked = true;
        _slash(k.attester, type(uint256).max, msg.sender, 5000, "bad-quote");
    }

    /// @notice Challenge a key during its window (off-chain RTMR3 replay disagrees with the claimed compose
    ///         hash, or the DCAP signature fails off-chain). Freezes the key; the challenger posts a bond.
    function challengeKey(address key) external nonReentrant {
        EnclaveKey storage k = keys[key];
        if (k.attester == address(0)) revert UnknownKey();
        if (k.attester == msg.sender) revert SelfChallenge();
        if (block.timestamp >= k.activeAt) revert NotInWindow();
        if (k.challenger != address(0)) revert AlreadyChallenged();
        stakeToken.safeTransferFrom(msg.sender, address(this), challengeBond);
        k.challenger = msg.sender;
        emit KeyChallenged(key, msg.sender);
    }

    /// @notice Arbiter resolves a key challenge. fraud=true: key revoked, attester slashed, challenger gets
    ///         half the slash plus its bond back. fraud=false: challenger bond goes to the attester.
    function resolveKeyChallenge(address key, bool fraud) external nonReentrant {
        if (msg.sender != keyArbiter) revert NotArbiter();
        EnclaveKey storage k = keys[key];
        address ch = k.challenger;
        if (ch == address(0)) revert NotChallenged();
        k.challenger = address(0);
        if (fraud) {
            k.revoked = true;
            stakeToken.safeTransfer(ch, challengeBond);
            _slash(k.attester, type(uint256).max, ch, 5000, "bad-compose");
        } else {
            stakeToken.safeTransfer(k.attester, challengeBond);
        }
        emit KeyChallengeResolved(key, fraud);
    }

    // --------------------------------------------------------------- slashing
    /// @notice Called by RatingRegistry on proven equivocation or a lost dispute.
    function slash(address attester, uint256 amount, address beneficiary, uint16 beneficiaryBps, bytes32 reason)
        external
        nonReentrant
        returns (uint256 slashed)
    {
        if (msg.sender != slasher) revert NotSlasher();
        return _slash(attester, amount, beneficiary, beneficiaryBps, reason);
    }

    function _slash(address attester, uint256 amount, address beneficiary, uint16 beneficiaryBps, bytes32 reason)
        internal
        returns (uint256 slashed)
    {
        Attester storage a = attesters[attester];
        uint256 total = a.bond + a.unbonding;
        slashed = amount > total ? total : amount;
        uint256 fromBond = slashed > a.bond ? a.bond : slashed;
        a.bond -= fromBond;
        a.unbonding -= (slashed - fromBond);
        a.jailed = true;
        uint256 toBen = beneficiary == address(0) ? 0 : (slashed * beneficiaryBps) / 10_000;
        if (toBen > 0) stakeToken.safeTransfer(beneficiary, toBen);
        if (slashed - toBen > 0) stakeToken.safeTransfer(treasury, slashed - toBen);
        emit Slashed(attester, slashed, beneficiary, toBen, reason);
    }

    // ------------------------------------------------------------------ views
    function attesterOf(address key) external view returns (address) {
        return keys[key].attester;
    }

    function isJailed(address attester) external view returns (bool) {
        return attesters[attester].jailed;
    }

    /// @notice A key may sign ratings only if: registered, not revoked, past its window, not under challenge,
    ///         and its attester is unjailed and fully bonded.
    function isActiveKey(address key) public view returns (bool) {
        EnclaveKey storage k = keys[key];
        if (k.attester == address(0) || k.revoked || k.challenger != address(0)) return false;
        if (block.timestamp < k.activeAt) return false;
        if (!allowedOs[k.osMeasurement] || !allowedCompose[k.composeHash]) return false;
        Attester storage a = attesters[k.attester];
        return !a.jailed && a.bond >= minBond;
    }
}

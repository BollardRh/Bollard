// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IRatingRegistry, IIdentityRegistry8004} from "./interfaces/IExternal.sol";
import {ISafeGuard, ISafeModuleExec, IAllowanceModule, SafeOp} from "./interfaces/IAccounts.sol";

/// @title SafeRatingGuard
/// @notice Two roles for a Safe that uses the AllowanceModule to give agents spending allowances:
///   1. Transaction guard: refuses any Safe transaction that adds an agent delegate or sets its allowance
///      unless that agent's Bollard rating passes the Safe's floor. Batched calls through MultiSend are
///      decoded and checked one by one; unknown delegatecalls are refused.
///   2. Optional module (enable it on the Safe): anyone may call `revokeIfFailing` to remove a delegate whose
///      rating has gone stale, expired, been disputed or dropped below the floor. The only call it can make is
///      `AllowanceModule.removeDelegate`, so it can take permissions away and never add them.
///   Lowering the floor and removing the guard both wait `delay`, so one batched transaction cannot lower
///   the floor and add a low-rated agent at the same time.
contract SafeRatingGuard is ISafeGuard {
    error NotConfigured();
    error BadConfig();
    error NoBinding();
    error WalletMismatch();
    error RatingCheckFailed(uint8 code);
    error UnknownDelegatecall(address target);
    error GuardRemovalNotAnnounced();
    error MalformedBatch();
    error RatingStillPasses();
    error ModuleCallFailed();

    event Configured(address indexed safe, uint8 minGrade, uint32 mask, uint64 effectiveAt);
    event DelegateBound(address indexed safe, address indexed delegate, address agentRegistry, uint256 agentId);
    event RemovalAnnounced(address indexed safe, uint64 effectiveAt);
    event DelegateRevoked(address indexed safe, address indexed delegate, uint8 code);

    bytes4 internal constant ADD_DELEGATE = IAllowanceModule.addDelegate.selector;
    bytes4 internal constant SET_ALLOWANCE = IAllowanceModule.setAllowance.selector;
    bytes4 internal constant SET_GUARD = bytes4(keccak256("setGuard(address)"));
    bytes4 internal constant MULTI_SEND = bytes4(keccak256("multiSend(bytes)"));

    IRatingRegistry public immutable registry;
    address public immutable allowanceModule;
    uint64 public immutable delay;
    mapping(address => bool) public isMultiSend;

    struct Floor {
        uint8 minGrade;
        uint32 mask;
        uint8 pendingGrade;
        uint32 pendingMask;
        uint64 pendingAt; // lowering takes effect at this time
        uint64 removalAt; // guard removal allowed after this time (0 = not announced)
        bool configured;
    }

    struct Binding {
        address agentRegistry;
        uint256 agentId;
    }

    mapping(address => Floor) public floors; // safe => floor
    mapping(address => mapping(address => Binding)) public bindings; // safe => delegate => agent

    constructor(address registry_, address allowanceModule_, uint64 delay_, address[] memory multiSends) {
        registry = IRatingRegistry(registry_);
        allowanceModule = allowanceModule_;
        delay = delay_;
        for (uint256 i; i < multiSends.length; ++i) isMultiSend[multiSends[i]] = true;
    }

    // ------------------------------------------------------- safe self-calls
    /// @notice Called by the Safe itself. Raising the floor applies now; lowering applies after `delay`.
    function configure(uint8 minGrade, uint32 mask) external {
        if (minGrade == 0 || minGrade > 5) revert BadConfig();
        Floor storage f = floors[msg.sender];
        _settle(f);
        bool lowering = f.configured && (minGrade < f.minGrade || (f.mask & ~mask) != 0);
        if (!lowering) {
            f.minGrade = minGrade;
            f.mask = mask;
            f.pendingAt = 0;
            f.configured = true;
            emit Configured(msg.sender, minGrade, mask, uint64(block.timestamp));
        } else {
            f.pendingGrade = minGrade;
            f.pendingMask = mask;
            f.pendingAt = uint64(block.timestamp) + delay;
            emit Configured(msg.sender, minGrade, mask, f.pendingAt);
        }
    }

    /// @notice Called by the Safe: ties an AllowanceModule delegate to an ERC-8004 agent. The agent's
    ///         registered wallet must be that delegate.
    function bindDelegate(address delegate, address agentRegistry, uint256 agentId) external {
        if (IIdentityRegistry8004(agentRegistry).getAgentWallet(agentId) != delegate) revert WalletMismatch();
        bindings[msg.sender][delegate] = Binding(agentRegistry, agentId);
        emit DelegateBound(msg.sender, delegate, agentRegistry, agentId);
    }

    function announceRemoval() external {
        uint64 t = uint64(block.timestamp) + delay;
        floors[msg.sender].removalAt = t;
        emit RemovalAnnounced(msg.sender, t);
    }

    // ------------------------------------------------------------------ guard
    function checkTransaction(
        address to,
        uint256,
        bytes calldata data,
        uint8 operation,
        uint256,
        uint256,
        uint256,
        address,
        address payable,
        bytes calldata,
        address
    ) external view override {
        _inspect(msg.sender, to, data, operation);
    }

    function checkAfterExecution(bytes32, bool) external pure override {}

    function supportsInterface(bytes4 id) external pure returns (bool) {
        return id == type(ISafeGuard).interfaceId || id == 0x01ffc9a7;
    }

    function _inspect(address safe, address to, bytes calldata data, uint8 op) internal view {
        if (op == SafeOp.DELEGATECALL) {
            if (!isMultiSend[to]) revert UnknownDelegatecall(to);
            if (data.length < 4 || bytes4(data[0:4]) != MULTI_SEND) revert MalformedBatch();
            bytes calldata packed = _unwrapBytes(data[4:]);
            _inspectBatch(safe, packed);
            return;
        }
        if (data.length < 4) return;
        bytes4 sel = bytes4(data[0:4]);
        if (to == allowanceModule && (sel == ADD_DELEGATE || sel == SET_ALLOWANCE)) {
            address delegate = abi.decode(data[4:36], (address));
            _requireRated(safe, delegate);
        } else if (to == safe && sel == SET_GUARD) {
            uint64 t = floors[safe].removalAt;
            if (t == 0 || block.timestamp < t) revert GuardRemovalNotAnnounced();
        }
    }

    /// @dev MultiSend packing per tx: operation (1) | to (20) | value (32) | dataLength (32) | data.
    function _inspectBatch(address safe, bytes calldata packed) internal view {
        uint256 i;
        while (i < packed.length) {
            if (i + 85 > packed.length) revert MalformedBatch();
            uint8 op = uint8(packed[i]);
            address to = address(bytes20(packed[i + 1:i + 21]));
            uint256 len = uint256(bytes32(packed[i + 53:i + 85]));
            uint256 start = i + 85;
            if (start + len > packed.length) revert MalformedBatch();
            _inspect(safe, to, packed[start:start + len], op);
            i = start + len;
        }
    }

    function _unwrapBytes(bytes calldata enc) internal pure returns (bytes calldata out) {
        if (enc.length < 64) revert MalformedBatch();
        uint256 off = uint256(bytes32(enc[0:32]));
        if (off + 32 > enc.length) revert MalformedBatch();
        uint256 len = uint256(bytes32(enc[off:off + 32]));
        if (off + 32 + len > enc.length) revert MalformedBatch();
        out = enc[off + 32:off + 32 + len];
    }

    function _requireRated(address safe, address delegate) internal view {
        (bool ok, uint8 code) = _evaluate(safe, delegate);
        if (!ok) revert RatingCheckFailed(code);
    }

    function _evaluate(address safe, address delegate) internal view returns (bool ok, uint8 code) {
        Floor storage f = floors[safe];
        if (!f.configured) revert NotConfigured();
        Binding storage b = bindings[safe][delegate];
        if (b.agentRegistry == address(0)) revert NoBinding();
        (uint8 g, uint32 m) = _effective(f);
        (ok, code,) = registry.check(b.agentRegistry, b.agentId, g, m);
    }

    function _effective(Floor storage f) internal view returns (uint8, uint32) {
        if (f.pendingAt != 0 && block.timestamp >= f.pendingAt) return (f.pendingGrade, f.pendingMask);
        return (f.minGrade, f.mask);
    }

    function _settle(Floor storage f) internal {
        if (f.pendingAt != 0 && block.timestamp >= f.pendingAt) {
            f.minGrade = f.pendingGrade;
            f.mask = f.pendingMask;
            f.pendingAt = 0;
        }
    }

    // ----------------------------------------------------------------- module
    /// @notice Anyone may remove a delegate whose agent no longer passes the Safe's floor.
    ///         Requires this contract to be enabled as a module on the Safe.
    function revokeIfFailing(address safe, address delegate) external {
        (bool ok, uint8 code) = _evaluate(safe, delegate);
        if (ok) revert RatingStillPasses();
        bytes memory call_ = abi.encodeWithSelector(IAllowanceModule.removeDelegate.selector, delegate, true);
        if (!ISafeModuleExec(safe).execTransactionFromModule(allowanceModule, 0, call_, SafeOp.CALL)) {
            revert ModuleCallFailed();
        }
        emit DelegateRevoked(safe, delegate, code);
    }

    function effectiveFloor(address safe) external view returns (uint8 minGrade, uint32 mask) {
        return _effective(floors[safe]);
    }
}

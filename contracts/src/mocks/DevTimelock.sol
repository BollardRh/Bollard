// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title DevTimelock
/// @notice TESTNET ONLY. Same interface and behaviour as BollardTimelock, but with a 10-minute minimum delay
///         so governance setup on Robinhood Chain testnet does not wait 48h per step. The mainnet deploy
///         script must use BollardTimelock.
contract DevTimelock {
    error NotProposer();
    error NotReady();
    error UnknownOp();
    error CallFailed(bytes ret);
    error DelayTooShort();

    event Scheduled(bytes32 indexed id, address target, uint256 value, bytes data, uint64 readyAt);
    event Executed(bytes32 indexed id);
    event Cancelled(bytes32 indexed id);

    uint64 public constant MIN_DELAY = 10 minutes;
    address public immutable proposer;
    uint64 public immutable delay;
    mapping(bytes32 => uint64) public readyAt;

    constructor(address proposer_, uint64 delay_) {
        if (delay_ < MIN_DELAY) revert DelayTooShort();
        proposer = proposer_;
        delay = delay_;
    }

    function opId(address target, uint256 value, bytes calldata data, bytes32 salt) public pure returns (bytes32) {
        return keccak256(abi.encode(target, value, data, salt));
    }

    function schedule(address target, uint256 value, bytes calldata data, bytes32 salt) external returns (bytes32 id) {
        if (msg.sender != proposer) revert NotProposer();
        id = opId(target, value, data, salt);
        uint64 t = uint64(block.timestamp) + delay;
        readyAt[id] = t;
        emit Scheduled(id, target, value, data, t);
    }

    function cancel(bytes32 id) external {
        if (msg.sender != proposer) revert NotProposer();
        if (readyAt[id] == 0) revert UnknownOp();
        delete readyAt[id];
        emit Cancelled(id);
    }

    function execute(address target, uint256 value, bytes calldata data, bytes32 salt) external payable {
        bytes32 id = opId(target, value, data, salt);
        uint64 t = readyAt[id];
        if (t == 0) revert UnknownOp();
        if (block.timestamp < t) revert NotReady();
        delete readyAt[id];
        (bool ok, bytes memory ret) = target.call{value: value}(data);
        if (!ok) revert CallFailed(ret);
        emit Executed(id);
    }
}

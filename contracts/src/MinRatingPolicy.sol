// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IRatingRegistry} from "./interfaces/IExternal.sol";
import {IKernelPolicy, PackedUserOperation} from "./interfaces/IAccounts.sol";

/// @title MinRatingPolicy
/// @notice Kernel v3 permission policy (module type 5). Attach it to the permission (session key) you give
///         an agent: every userOp signed by that key is refused unless the agent's Bollard rating is fresh,
///         at or above your floor, and passed the families you require. A passing check returns the
///         rating's expiry as `validUntil`, so the EntryPoint itself refuses the op once the rating expires.
/// @dev The policy only reads. It holds no funds and cannot widen any permission.
contract MinRatingPolicy is IKernelPolicy {
    error AlreadyInstalled();
    error NotInstalled();
    error BadConfig();

    event Installed(address indexed account, bytes32 indexed id, address agentRegistry, uint256 agentId, uint8 minGrade, uint32 mask);
    event Uninstalled(address indexed account, bytes32 indexed id);

    uint256 internal constant MODULE_TYPE_POLICY = 5;
    uint256 internal constant SIG_VALIDATION_FAILED = 1;

    IRatingRegistry public immutable registry;

    struct Config {
        address agentRegistry;
        uint256 agentId;
        uint8 minGrade;
        uint32 requiredPassMask;
        bool installed;
    }

    mapping(bytes32 => mapping(address => Config)) public configs; // id => account => config
    mapping(address => uint256) public installCount;

    constructor(address registry_) {
        registry = IRatingRegistry(registry_);
    }

    /// @param data abi.encodePacked(bytes32 id, abi.encode(agentRegistry, agentId, minGrade, requiredPassMask))
    function onInstall(bytes calldata data) external payable {
        bytes32 id = bytes32(data[0:32]);
        (address agentRegistry, uint256 agentId, uint8 minGrade, uint32 mask) =
            abi.decode(data[32:], (address, uint256, uint8, uint32));
        if (minGrade == 0 || minGrade > 5 || agentRegistry == address(0)) revert BadConfig();
        Config storage c = configs[id][msg.sender];
        if (c.installed) revert AlreadyInstalled();
        configs[id][msg.sender] = Config(agentRegistry, agentId, minGrade, mask, true);
        installCount[msg.sender] += 1;
        emit Installed(msg.sender, id, agentRegistry, agentId, minGrade, mask);
    }

    function onUninstall(bytes calldata data) external payable {
        bytes32 id = bytes32(data[0:32]);
        if (!configs[id][msg.sender].installed) revert NotInstalled();
        delete configs[id][msg.sender];
        installCount[msg.sender] -= 1;
        emit Uninstalled(msg.sender, id);
    }

    function isModuleType(uint256 t) external pure returns (bool) {
        return t == MODULE_TYPE_POLICY;
    }

    function isInitialized(address account) external view returns (bool) {
        return installCount[account] > 0;
    }

    function checkUserOpPolicy(bytes32 id, PackedUserOperation calldata userOp) external payable returns (uint256) {
        return _check(id, userOp.sender);
    }

    function checkSignaturePolicy(bytes32 id, address, bytes32, bytes calldata) external view returns (uint256) {
        return _check(id, msg.sender);
    }

    function _check(bytes32 id, address account) internal view returns (uint256) {
        Config storage c = configs[id][account];
        if (!c.installed) return SIG_VALIDATION_FAILED;
        (bool ok,, uint64 validUntil) = registry.check(c.agentRegistry, c.agentId, c.minGrade, c.requiredPassMask);
        if (!ok) return SIG_VALIDATION_FAILED;
        // ERC-4337 validationData: aggregator (0) | validUntil << 160 | validAfter (0) << 208
        return uint256(validUntil) << 160;
    }
}

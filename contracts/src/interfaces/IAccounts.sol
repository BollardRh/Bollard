// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Safe (v1.3/v1.4.1) operation enum.
library SafeOp {
    uint8 internal constant CALL = 0;
    uint8 internal constant DELEGATECALL = 1;
}

/// @notice Safe transaction guard interface (v1.3.0 / v1.4.1).
interface ISafeGuard {
    function checkTransaction(
        address to,
        uint256 value,
        bytes calldata data,
        uint8 operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address payable refundReceiver,
        bytes calldata signatures,
        address msgSender
    ) external;

    function checkAfterExecution(bytes32 txHash, bool success) external;
}

/// @notice The one Safe function the revocation module calls.
interface ISafeModuleExec {
    function execTransactionFromModule(address to, uint256 value, bytes calldata data, uint8 operation)
        external
        returns (bool success);
}

/// @notice Safe AllowanceModule v0.1.1 (verified deployed on RHC at
///         0xAA46724893dedD72658219405185Fb0Fc91e091C, selectors checked 2026-10-31).
interface IAllowanceModule {
    function addDelegate(address delegate) external;
    function removeDelegate(address delegate, bool removeAllowances) external;
    function setAllowance(address delegate, address token, uint96 allowanceAmount, uint16 resetTimeMin, uint32 resetBaseMin)
        external;
}

/// @notice ERC-4337 v0.7 packed user operation.
struct PackedUserOperation {
    address sender;
    uint256 nonce;
    bytes initCode;
    bytes callData;
    bytes32 accountGasLimits;
    uint256 preVerificationGas;
    bytes32 gasFees;
    bytes paymasterAndData;
    bytes signature;
}

/// @notice Kernel v3 policy module shape (module type 5). Verify against the Kernel v3.3 source tag
///         before mainnet: install data is `abi.encodePacked(bytes32 permissionId, policyData)`.
interface IKernelPolicy {
    function onInstall(bytes calldata data) external payable;
    function onUninstall(bytes calldata data) external payable;
    function isModuleType(uint256 moduleTypeId) external view returns (bool);
    function isInitialized(address smartAccount) external view returns (bool);
    function checkUserOpPolicy(bytes32 id, PackedUserOperation calldata userOp) external payable returns (uint256);
    function checkSignaturePolicy(bytes32 id, address sender, bytes32 hash, bytes calldata sig)
        external
        view
        returns (uint256);
}

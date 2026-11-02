// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {MinRatingPolicy} from "../src/MinRatingPolicy.sol";
import {PackedUserOperation} from "../src/interfaces/IAccounts.sol";
import {IRatingRegistry} from "../src/interfaces/IExternal.sol";

// ---- Minimal ABIs of the live contracts (Kernel v3.3 tag cd697c7, EntryPoint v0.7) ----

interface IEntryPointV07 {
    error FailedOp(uint256 opIndex, string reason);
    error FailedOpWithRevert(uint256 opIndex, string reason, bytes inner);

    function handleOps(PackedUserOperation[] calldata ops, address payable beneficiary) external;
    function getNonce(address sender, uint192 key) external view returns (uint256);
    function getUserOpHash(PackedUserOperation calldata userOp) external view returns (bytes32);
}

interface IKernelFactory {
    function implementation() external view returns (address);
    function createAccount(bytes calldata data, bytes32 salt) external payable returns (address);
}

interface IFactoryStaker {
    function approved(address factory) external view returns (bool);
}

/// @dev ValidationManager.ValidationConfig {uint32 nonce; IHook hook}
struct ValidationConfig {
    uint32 nonce;
    address hook;
}

/// @dev Kernel types/Structs.sol Execution (ERC-7579 batch element)
struct Execution {
    address target;
    uint256 value;
    bytes callData;
}

interface IKernel {
    error PolicyFailed(uint256 i);

    function uninstallValidation(bytes21 vId, bytes calldata deinitData, bytes calldata hookDeinitData) external payable;

    function initialize(bytes21 rootValidator, address hook, bytes calldata validatorData, bytes calldata hookData, bytes[] calldata initConfig)
        external;
    function installValidations(bytes21[] calldata vIds, ValidationConfig[] memory configs, bytes[] calldata validationData, bytes[] calldata hookData)
        external
        payable;
    function grantAccess(bytes21 vId, bytes4 selector, bool allow) external payable;
    function execute(bytes32 execMode, bytes calldata executionCalldata) external payable;
    function validateUserOp(PackedUserOperation calldata userOp, bytes32 userOpHash, uint256 missingAccountFunds)
        external
        payable
        returns (uint256);
    function isValidSignature(bytes32 hash, bytes calldata data) external view returns (bytes4);
    function accountId() external pure returns (string memory);
    function entrypoint() external view returns (address);
    function currentNonce() external view returns (uint32);
    function rootValidator() external view returns (bytes21);
    function isAllowedSelector(bytes21 vId, bytes4 selector) external view returns (bool);
    function validationConfig(bytes21 vId) external view returns (ValidationConfig memory);
    function eip712Domain()
        external
        view
        returns (bytes1, string memory, string memory, uint256, address, bytes32, uint256[] memory);
}

interface IModuleTypeProbe {
    function isModuleType(uint256 t) external view returns (bool);
}

/// @notice Proves MinRatingPolicy against the LIVE ZeroDev Kernel v3.3 stack on Robinhood Chain testnet (46630):
///         Kernel v3.3 implementation, KernelFactory v3.3, ECDSAValidator (root), ECDSASigner (session key),
///         EntryPoint v0.7 and the live MinRatingPolicy / RatingRegistry. Nothing here is vendored: every
///         install byte MinRatingPolicy.onInstall sees is produced by Kernel's own _installPermission.
///         Opt-in because it needs network access:  RHC_FORK=true forge test --match-path test/ForkKernel.t.sol
contract ForkKernelTest is Test {
    // ---- live addresses (RHC testnet 46630) ----
    IEntryPointV07 internal constant EP = IEntryPointV07(0x0000000071727De22E5E9d8BAf0edAc6f37da032);
    address internal constant KERNEL_IMPL = 0xd6CEDDe84be40893d153Be9d467CD6aD37875b28; // kernel.advanced.v0.3.3
    IKernelFactory internal constant FACTORY = IKernelFactory(0x2577507b78c2008Ff367261CB6285d44ba5eF2E9); // v3.3
    address internal constant META_FACTORY = 0xd703aaE79538628d27099B8c4f621bE4CCd142d5; // FactoryStaker
    address internal constant ECDSA_VALIDATOR = 0x845ADb2C711129d4f3966735eD98a9F09fC4cE57;
    address internal constant ECDSA_SIGNER = 0x6A6F069E2a08c2468e7724Ab3250CdBFBA14D4FF;
    address internal constant SUDO_POLICY = 0x67b436caD8a6D025DF6C82C5BB43fbF11fC5B9B7;
    MinRatingPolicy internal constant POLICY = MinRatingPolicy(0x8f5358E7193D65A51935771f923Fcdc113201933);
    address internal constant REGISTRY = 0x016889569C0A52Ea1B1ffa428E2fe346d36212dF;
    address internal constant IDENTITY = 0x8004A818BFB912233c491871b3d84c89A494BD9e;

    uint256 internal constant RATED_AGENT = 291;
    uint256 internal constant UNRATED_AGENT = 999_999_999;
    uint8 internal constant MIN_GRADE = 3;
    uint32 internal constant CRITICAL_MASK = 183;

    // Kernel v3.3 src/types/Constants.sol:70-71
    bytes32 internal constant ENABLE_TYPE_HASH = 0xb17ab1224aca0d4255ef8161acaf2ac121b8faa32a4b2258c912cc5f8308c505;
    bytes32 internal constant KERNEL_WRAPPER_TYPE_HASH = 0x1547321c374afde8a591d972a084b071c594c275e36724931ff96c25f2999c83;
    bytes32 internal constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 internal constant EXEC_MODE_SINGLE = bytes32(0);
    bytes32 internal constant EXEC_MODE_BATCH = bytes32(uint256(0x01) << 248);

    bytes4 internal constant PID_RATED = 0xb011a4d1;
    bytes4 internal constant PID_UNRATED = 0xb011a4d2;
    bytes4 internal constant PID_ENABLE = 0xb011a4d3;

    bool internal enabled;
    uint256 internal ownerKey;
    uint256 internal sessionKey;
    address internal owner;
    address internal session;
    address internal bundler = makeAddr("bundler");
    address internal recipient = makeAddr("recipient");
    IKernel internal account;
    uint64 internal ratingValidUntil;

    function setUp() public {
        enabled = vm.envOr("RHC_FORK", false);
        if (!enabled) return;
        vm.createSelectFork("rhc_testnet");
        assertEq(block.chainid, 46630);

        (owner, ownerKey) = makeAddrAndKey("kernel-owner");
        (session, sessionKey) = makeAddrAndKey("agent-session-key");

        bool ok;
        (ok,, ratingValidUntil) = IRatingRegistry(REGISTRY).check(IDENTITY, RATED_AGENT, MIN_GRADE, CRITICAL_MASK);
        assertTrue(ok, "live rating for agent 291 no longer passes; fork test premise broken");
        (ok,,) = IRatingRegistry(REGISTRY).check(IDENTITY, UNRATED_AGENT, MIN_GRADE, CRITICAL_MASK);
        assertFalse(ok, "unrated agent unexpectedly passes");

        // (a) Kernel v3.3 account via the live KernelFactory, ECDSAValidator as root (owner = test key).
        bytes21 rootVId = bytes21(abi.encodePacked(bytes1(0x01), ECDSA_VALIDATOR));
        bytes memory initData =
            abi.encodeCall(IKernel.initialize, (rootVId, address(0), abi.encodePacked(owner), bytes(""), new bytes[](0)));
        account = IKernel(FACTORY.createAccount(initData, bytes32(uint256(46630))));
        vm.deal(address(account), 1 ether);
        assertEq(account.rootValidator(), rootVId);

        // (b) Install two permissions through a ROOT-signed userOp: Kernel itself calls policy.onInstall.
        //     A: session key + MinRatingPolicy(identity, 291, 3, 183)   B: same, but for an unrated agent id.
        uint32 n = account.currentNonce();
        bytes21[] memory vIds = new bytes21[](2);
        vIds[0] = _vId(PID_RATED);
        vIds[1] = _vId(PID_UNRATED);
        ValidationConfig[] memory cfgs = new ValidationConfig[](2);
        cfgs[0] = ValidationConfig(n, address(0));
        cfgs[1] = ValidationConfig(n, address(0));
        bytes[] memory vData = new bytes[](2);
        vData[0] = _permissionData(RATED_AGENT, false);
        vData[1] = _permissionData(UNRATED_AGENT, false);
        bytes[] memory hData = new bytes[](2);

        Execution[] memory batch = new Execution[](3);
        batch[0] = Execution(address(account), 0, abi.encodeCall(IKernel.installValidations, (vIds, cfgs, vData, hData)));
        batch[1] = Execution(address(account), 0, abi.encodeCall(IKernel.grantAccess, (vIds[0], IKernel.execute.selector, true)));
        batch[2] = Execution(address(account), 0, abi.encodeCall(IKernel.grantAccess, (vIds[1], IKernel.execute.selector, true)));

        PackedUserOperation memory op = _op(EP.getNonce(address(account), 0), abi.encodeCall(IKernel.execute, (EXEC_MODE_BATCH, abi.encode(batch))));
        op.signature = _sign(ownerKey, EP.getUserOpHash(op));
        _handle(op);
    }

    // ---------------------------------------------------------------- live code identity

    function test_fork_kernel_liveStack() public {
        vm.skip(!enabled);
        assertEq(account.accountId(), "kernel.advanced.v0.3.3");
        assertEq(FACTORY.implementation(), KERNEL_IMPL);
        assertEq(account.entrypoint(), address(EP));
        assertTrue(IModuleTypeProbe(ECDSA_VALIDATOR).isModuleType(1));
        assertTrue(IModuleTypeProbe(ECDSA_SIGNER).isModuleType(6));
        assertTrue(IModuleTypeProbe(SUDO_POLICY).isModuleType(5));
        assertTrue(POLICY.isModuleType(5));
        assertEq(address(POLICY.registry()), REGISTRY);
        // ERC-1967 proxy points at the live v3.3 implementation
        bytes32 impl = vm.load(address(account), 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc);
        assertEq(address(uint160(uint256(impl))), KERNEL_IMPL);
        emit log_named_string("metaFactory approved v3.3 factory", IFactoryStaker(META_FACTORY).approved(address(FACTORY)) ? "yes" : "NO");
        // Is the live policy byte-identical to contracts/src (same registry immutable)?
        bytes32 liveHash = address(POLICY).codehash;
        bytes32 srcHash = address(new MinRatingPolicy(REGISTRY)).codehash;
        emit log_named_string("live MinRatingPolicy == src build", liveHash == srcHash ? "yes" : "NO (metadata/source differs)");
    }

    function test_fork_kernel_uninstallWireFormat() public {
        vm.skip(!enabled);
        // Kernel.uninstallValidation -> _uninstallPermission passes abi.encodePacked(bytes32(pid), disableData[i])
        // (ValidationManager.sol:192-221); disableData needs policies+1 entries.
        bytes[] memory d = new bytes[](2);
        vm.prank(address(account));
        account.uninstallValidation(_vId(PID_UNRATED), abi.encode(d), "");
        (,,,, bool installed) = POLICY.configs(bytes32(PID_UNRATED), address(account));
        assertFalse(installed);
        (,,,, installed) = POLICY.configs(bytes32(PID_RATED), address(account));
        assertTrue(installed);
        assertEq(POLICY.installCount(address(account)), 1);
    }

    // ---------------------------------------------------------------- (b) install wire format

    function test_fork_kernel_installWireFormat() public {
        vm.skip(!enabled);
        // Kernel passes abi.encodePacked(bytes32(bytes4 permissionId), policyInitData): the id is the 4-byte
        // permission id LEFT-aligned in a bytes32 (ValidationManager.sol:278-280).
        (address reg, uint256 agentId, uint8 minGrade, uint32 mask, bool installed) = POLICY.configs(bytes32(PID_RATED), address(account));
        assertTrue(installed);
        assertEq(reg, IDENTITY);
        assertEq(agentId, RATED_AGENT);
        assertEq(minGrade, MIN_GRADE);
        assertEq(mask, CRITICAL_MASK);
        (,,,, installed) = POLICY.configs(bytes32(uint256(uint32(PID_RATED))), address(account));
        assertFalse(installed, "id must be left-aligned");
        (, agentId,,, installed) = POLICY.configs(bytes32(PID_UNRATED), address(account));
        assertTrue(installed);
        assertEq(agentId, UNRATED_AGENT);
        assertEq(POLICY.installCount(address(account)), 2);
        assertTrue(POLICY.isInitialized(address(account)));
        assertTrue(account.isAllowedSelector(_vId(PID_RATED), IKernel.execute.selector));
        assertEq(account.validationConfig(_vId(PID_RATED)).hook, address(1));
    }

    // ---------------------------------------------------------------- (c) rated agent: op passes

    function test_fork_kernel_ratedSessionKeyOpPasses() public {
        vm.skip(!enabled);
        uint256 before = recipient.balance;
        _handle(_sessionOp(PID_RATED, 0x00, 1));
        assertEq(recipient.balance, before + 1);
        // and again (sequential nonce on the same permission key)
        _handle(_sessionOp(PID_RATED, 0x00, 1));
        assertEq(recipient.balance, before + 2);
    }

    // ---------------------------------------------------------------- (d) unrated agent: op refused

    function test_fork_kernel_unratedSessionKeyOpRefused() public {
        vm.skip(!enabled);
        PackedUserOperation memory op = _sessionOp(PID_UNRATED, 0x00, 1);
        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = op;
        // MinRatingPolicy returns 1 -> Kernel reverts PolicyFailed(0) inside validateUserOp
        // (ValidationManager.sol:566-569) -> EntryPoint wraps it as AA23.
        vm.expectRevert(
            abi.encodeWithSelector(
                IEntryPointV07.FailedOpWithRevert.selector, 0, "AA23 reverted", abi.encodeWithSelector(IKernel.PolicyFailed.selector, 0)
            )
        );
        vm.prank(bundler, bundler);
        EP.handleOps(ops, payable(bundler));
        assertEq(recipient.balance, 0);
    }

    function test_fork_kernel_wrongSessionKeyRefused() public {
        vm.skip(!enabled);
        PackedUserOperation memory op = _sessionOpUnsigned(PID_RATED, 0x00, 1);
        (, uint256 stranger) = makeAddrAndKey("stranger");
        op.signature = abi.encodePacked(bytes1(0xff), _sign(stranger, EP.getUserOpHash(op)));
        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = op;
        vm.expectRevert(abi.encodeWithSelector(IEntryPointV07.FailedOp.selector, 0, "AA24 signature error"));
        vm.prank(bundler, bundler);
        EP.handleOps(ops, payable(bundler));
    }

    // ---------------------------------------------------------------- (e) validUntil propagation

    function test_fork_kernel_validUntilPropagates() public {
        vm.skip(!enabled);
        // What Kernel returns to the EntryPoint for a passing op is exactly the policy's validUntil << 160
        // (intersected with the signer's 0 by _intersectValidationData).
        PackedUserOperation memory op = _sessionOp(PID_RATED, 0x00, 1);
        bytes32 h = EP.getUserOpHash(op);
        vm.prank(address(EP));
        uint256 vd = account.validateUserOp(op, h, 0);
        assertEq(vd, uint256(ratingValidUntil) << 160);

        // If the registry hands back a validUntil already in the past, the EntryPoint (not the policy)
        // refuses with AA22: the time bound really travels through Kernel.
        vm.mockCall(
            REGISTRY,
            abi.encodeCall(IRatingRegistry.check, (IDENTITY, RATED_AGENT, MIN_GRADE, CRITICAL_MASK)),
            abi.encode(true, uint8(0), uint64(block.timestamp - 1))
        );
        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = op;
        vm.expectRevert(abi.encodeWithSelector(IEntryPointV07.FailedOp.selector, 0, "AA22 expired or not due"));
        vm.prank(bundler, bundler);
        EP.handleOps(ops, payable(bundler));
        vm.clearMockedCalls();
    }

    function test_fork_kernel_refusedAfterRealExpiry() public {
        vm.skip(!enabled);
        PackedUserOperation memory op = _sessionOp(PID_RATED, 0x00, 1);
        vm.warp(uint256(ratingValidUntil) + 1);
        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = op;
        // Past expiry the live registry itself no longer passes the check -> policy fails -> AA23 PolicyFailed(0).
        vm.expectRevert(
            abi.encodeWithSelector(
                IEntryPointV07.FailedOpWithRevert.selector, 0, "AA23 reverted", abi.encodeWithSelector(IKernel.PolicyFailed.selector, 0)
            )
        );
        vm.prank(bundler, bundler);
        EP.handleOps(ops, payable(bundler));
    }

    // ---------------------------------------------------------------- checkSignaturePolicy (ERC-1271)

    function test_fork_kernel_erc1271ThroughPolicy() public {
        vm.skip(!enabled);
        bytes32 hash = keccak256("bollard-1271");
        bytes32 wrapped = _hashTypedData(keccak256(abi.encode(KERNEL_WRAPPER_TYPE_HASH, hash)));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(sessionKey, wrapped);
        bytes memory sig = abi.encodePacked(bytes1(0xff), r, s, v);

        // signature = 0x02 ‖ permissionId(4) ‖ [policy sigs] ‖ 0xff ‖ signer sig  (ValidatorLib.decodeSignature)
        assertEq(account.isValidSignature(hash, abi.encodePacked(bytes1(0x02), PID_RATED, sig)), bytes4(0x1626ba7e));
        vm.expectRevert(abi.encodeWithSelector(IKernel.PolicyFailed.selector, 0));
        account.isValidSignature(hash, abi.encodePacked(bytes1(0x02), PID_UNRATED, sig));
    }

    // ---------------------------------------------------------------- enable mode (install + use in one op)

    function test_fork_kernel_enableModeWithTwoPolicies() public {
        vm.skip(!enabled);
        // Permission C = [SudoPolicy, MinRatingPolicy] + ECDSASigner, enabled inside the first userOp that uses it.
        bytes21 vId = _vId(PID_ENABLE);
        bytes memory validatorData = _permissionData(RATED_AGENT, true);
        bytes memory hookData = "";
        bytes memory selectorData = abi.encodePacked(IKernel.execute.selector);

        uint32 cur = account.currentNonce();
        uint32 cfgNonce = account.validationConfig(vId).nonce == cur ? cur + 1 : cur;
        bytes32 structHash = keccak256(
            abi.encode(ENABLE_TYPE_HASH, vId, cfgNonce, address(0), keccak256(validatorData), keccak256(hookData), keccak256(selectorData))
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerKey, _hashTypedData(structHash));
        bytes memory enableSig = abi.encodePacked(r, s, v);

        PackedUserOperation memory op = _sessionOpUnsigned(PID_ENABLE, 0x01, 1);
        bytes memory userOpSig = abi.encodePacked(bytes1(0xff), _sign(sessionKey, EP.getUserOpHash(op)));
        // enable-mode signature = hook(20) ‖ abi.encode(validatorData, hookData, selectorData, enableSig, userOpSig)
        op.signature = abi.encodePacked(address(0), abi.encode(validatorData, hookData, selectorData, enableSig, userOpSig));

        uint256 before = recipient.balance;
        _handle(op);
        assertEq(recipient.balance, before + 1);
        (,,,, bool installed) = POLICY.configs(bytes32(PID_ENABLE), address(account));
        assertTrue(installed);
        assertEq(POLICY.installCount(address(account)), 3);

        // and the same permission in default mode afterwards
        _handle(_sessionOp(PID_ENABLE, 0x00, 1));
        assertEq(recipient.balance, before + 2);
    }

    // ---------------------------------------------------------------- helpers

    function _vId(bytes4 pid) internal pure returns (bytes21) {
        return bytes21(abi.encodePacked(bytes1(0x02), pid));
    }

    /// @dev Kernel PermissionEnableDataFormat {bytes[] data}: each entry is flag(2) ‖ module(20) ‖ initData,
    ///      policies first, signer last (ValidationManager.sol:259-289).
    function _permissionData(uint256 agentId, bool withSudo) internal view returns (bytes memory) {
        bytes memory ratingInit = abi.encode(IDENTITY, agentId, MIN_GRADE, CRITICAL_MASK);
        bytes[] memory d = new bytes[](withSudo ? 3 : 2);
        uint256 i;
        if (withSudo) d[i++] = abi.encodePacked(bytes2(0), SUDO_POLICY);
        d[i++] = abi.encodePacked(bytes2(0), address(POLICY), ratingInit);
        d[i] = abi.encodePacked(bytes2(0), ECDSA_SIGNER, session);
        return abi.encode(d);
    }

    function _sessionOpUnsigned(bytes4 pid, bytes1 mode, uint256 amount) internal view returns (PackedUserOperation memory op) {
        // nonce key (uint192) = mode(1) ‖ vType 0x02(1) ‖ permissionId(4) ‖ 0(16) ‖ parallel key(2)  (ValidatorLib.decodeNonce)
        uint192 key = uint192(bytes24(abi.encodePacked(mode, bytes1(0x02), pid, bytes16(0), bytes2(0))));
        bytes memory exec = abi.encodePacked(recipient, amount, bytes(""));
        op = _op(EP.getNonce(address(account), key), abi.encodeCall(IKernel.execute, (EXEC_MODE_SINGLE, exec)));
    }

    function _sessionOp(bytes4 pid, bytes1 mode, uint256 amount) internal view returns (PackedUserOperation memory op) {
        op = _sessionOpUnsigned(pid, mode, amount);
        // no per-policy signature chunks: 0xff ‖ signer signature
        op.signature = abi.encodePacked(bytes1(0xff), _sign(sessionKey, EP.getUserOpHash(op)));
    }

    function _op(uint256 nonce, bytes memory callData) internal view returns (PackedUserOperation memory op) {
        op.sender = address(account);
        op.nonce = nonce;
        op.initCode = "";
        op.callData = callData;
        op.accountGasLimits = bytes32((uint256(3_000_000) << 128) | uint256(2_000_000));
        op.preVerificationGas = 100_000;
        op.gasFees = bytes32((uint256(1 gwei) << 128) | uint256(block.basefee + 1 gwei));
        op.paymasterAndData = "";
    }

    function _sign(uint256 key, bytes32 userOpHash) internal pure returns (bytes memory) {
        bytes32 eth = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", userOpHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, eth);
        return abi.encodePacked(r, s, v);
    }

    function _hashTypedData(bytes32 structHash) internal view returns (bytes32) {
        (, string memory name, string memory version, uint256 chainId, address verifying,,) = account.eip712Domain();
        assertEq(name, "Kernel");
        assertEq(version, "0.3.3");
        bytes32 sep = keccak256(abi.encode(DOMAIN_TYPEHASH, keccak256(bytes(name)), keccak256(bytes(version)), chainId, verifying));
        return keccak256(abi.encodePacked("\x19\x01", sep, structHash));
    }

    function _handle(PackedUserOperation memory op) internal {
        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = op;
        vm.recordLogs();
        vm.prank(bundler, bundler);
        EP.handleOps(ops, payable(bundler));
        // UserOperationEvent(bytes32 indexed userOpHash, address indexed sender, address indexed paymaster, uint256 nonce, bool success, uint256 actualGasCost, uint256 actualGasUsed)
        bytes32 topic = keccak256("UserOperationEvent(bytes32,address,address,uint256,bool,uint256,uint256)");
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bool seen;
        for (uint256 i; i < logs.length; ++i) {
            if (logs[i].emitter == address(EP) && logs[i].topics[0] == topic) {
                (, bool success,,) = abi.decode(logs[i].data, (uint256, bool, uint256, uint256));
                assertTrue(success, "userOp execution failed");
                seen = true;
            }
        }
        assertTrue(seen, "no UserOperationEvent");
    }
}

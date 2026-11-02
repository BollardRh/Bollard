// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Field extraction from an Intel TDX DCAP quote, version 4 (header 48 B + TD report body 584 B).
/// @dev Signature/TCB validity is NOT checked here; that is the job of an IQuoteVerifier (on-chain DCAP)
///      or of off-chain verification (dcap-qvl / Phala verify API) by challengers. This library only binds
///      what the quote claims: the enclave key in REPORTDATA and the OS measurement registers.
///      Body offsets (from quote start): MRTD 184, RTMR0 376, RTMR1 424, RTMR2 472, RTMR3 520, REPORTDATA 568.
library TdxQuote {
    error QuoteTooShort();
    error NotTdxV4();

    uint256 internal constant MIN_LEN = 632;
    uint32 internal constant TEE_TYPE_TDX = 0x81;

    struct Fields {
        bytes32 osMeasurement; // keccak256(MRTD || RTMR0 || RTMR1 || RTMR2)
        bytes32 rtmr3Hash; // keccak256(RTMR3), RTMR3 itself is replayed off-chain from the dstack event log
        bytes32 reportDataLo; // REPORTDATA[0:32]  = enclave key binding
        bytes32 reportDataHi; // REPORTDATA[32:64] = claimed dstack compose hash
    }

    function parse(bytes calldata q) internal pure returns (Fields memory f) {
        if (q.length < MIN_LEN) revert QuoteTooShort();
        uint16 version = uint16(uint8(q[0])) | (uint16(uint8(q[1])) << 8);
        uint32 teeType = uint32(uint8(q[4])) | (uint32(uint8(q[5])) << 8) | (uint32(uint8(q[6])) << 16)
            | (uint32(uint8(q[7])) << 24);
        if (version != 4 || teeType != TEE_TYPE_TDX) revert NotTdxV4();
        f.osMeasurement = keccak256(abi.encodePacked(q[184:232], q[376:424], q[424:472], q[472:520]));
        f.rtmr3Hash = keccak256(q[520:568]);
        f.reportDataLo = bytes32(q[568:600]);
        f.reportDataHi = bytes32(q[600:632]);
    }

    /// @notice What the harness enclave must put in REPORTDATA[0:32] for `key`.
    function keyBinding(uint256 chainId, address registry, address key) internal pure returns (bytes32) {
        return keccak256(abi.encode(keccak256("BOLLARD-ENCLAVE-V1"), chainId, registry, key));
    }
}

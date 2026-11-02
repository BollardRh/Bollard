// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice A signed crash-test result. Every field is static, so `abi.encode(TYPEHASH, r)` is exactly
///         the EIP-712 hashStruct encoding (must equal viem's hashTypedData output; parity test in milestone M1).
struct RatingReport {
    address agentRegistry; // ERC-8004 identity registry on this chain
    uint256 agentId; // ERC-8004 agent id
    bytes32 versionHash; // keccak(agent image digest, config hash, model id), declared by the agent owner
    uint256 requestId; // paid rating-run request this report answers
    bytes32 corpusRoot; // Merkle root of the public attack corpus version
    bytes32 holdoutCommit; // commitment to the private holdout set used in the run
    bytes32 runsRoot; // Merkle root of per-run receipts (case, seed, transcript hash, losses)
    uint16 seeds; // seeds per case
    uint8 score; // 0..100
    uint8 grade; // 1..5, must equal Grades.compute(score, failedMask, criticalMask)
    uint32 testedMask; // attack families tested (bit i = family i)
    uint32 failedMask; // attack families with at least one loss event
    uint64 issuedAt;
    uint64 expiresAt;
}

library RatingTypes {
    bytes32 internal constant TYPEHASH = keccak256(
        "RatingReport(address agentRegistry,uint256 agentId,bytes32 versionHash,uint256 requestId,bytes32 corpusRoot,bytes32 holdoutCommit,bytes32 runsRoot,uint16 seeds,uint8 score,uint8 grade,uint32 testedMask,uint32 failedMask,uint64 issuedAt,uint64 expiresAt)"
    );

    function hashStruct(RatingReport memory r) internal pure returns (bytes32) {
        return keccak256(abi.encode(TYPEHASH, r));
    }

    /// @dev Same subject = same agent, version and request (used for equivocation and disputes).
    function sameSubject(RatingReport memory a, RatingReport memory b) internal pure returns (bool) {
        return a.agentRegistry == b.agentRegistry && a.agentId == b.agentId && a.versionHash == b.versionHash
            && a.requestId == b.requestId;
    }

    /// @dev Same test inputs = same subject plus same corpus, holdout and seed count.
    function sameInputs(RatingReport memory a, RatingReport memory b) internal pure returns (bool) {
        return sameSubject(a, b) && a.corpusRoot == b.corpusRoot && a.holdoutCommit == b.holdoutCommit
            && a.seeds == b.seeds;
    }
}

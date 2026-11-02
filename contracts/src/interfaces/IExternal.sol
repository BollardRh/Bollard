// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Minimal ERC-20 surface used by Bollard.
interface IERC20 {
    function balanceOf(address) external view returns (uint256);
    function transfer(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
    function approve(address, uint256) external returns (bool);
}

/// @notice ERC-8004 Identity Registry (ERC-721 based). Selectors verified against the live
///         implementation 0x7274e874CA62410a93Bd8bf61c69d8045E399c02 behind
///         0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 on Robinhood Chain (4663) and Base (8453), 2026-10-31.
///         Testnet (46630) deployment: 0x8004A818BFB912233c491871b3d84c89A494BD9e.
interface IIdentityRegistry8004 {
    function ownerOf(uint256 agentId) external view returns (address);
    function getAgentWallet(uint256 agentId) external view returns (address);
    function isAuthorizedOrOwner(address spender, uint256 agentId) external view returns (bool);
}

/// @notice ERC-8004 Reputation Registry (live at 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63 on Base and RHC).
interface IReputationRegistry8004 {
    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata tag2,
        string calldata endpoint,
        string calldata feedbackURI,
        bytes32 feedbackHash
    ) external;
}

/// @notice ERC-8004 Validation Registry (EIP text). Not deployed on any chain as of 2026-10-31,
///         so Bollard keeps its address at zero until a deployment is verified.
interface IValidationRegistry8004 {
    function validationResponse(
        bytes32 requestHash,
        uint8 response,
        string calldata responseURI,
        bytes32 responseHash,
        string calldata tag
    ) external;
}

/// @notice Adapter over an on-chain DCAP verifier (e.g. Automata DCAP Attestation
///         `verifyAndAttestOnChain(bytes)`). Returns true only if the quote's signature chain
///         and TCB status verify. Optional: zero address means "no on-chain verifier configured".
interface IQuoteVerifier {
    function verifyQuote(bytes calldata rawQuote) external returns (bool ok);
}

/// @notice Read surface the gates use.
interface IRatingRegistry {
    function check(address agentRegistry, uint256 agentId, uint8 minGrade, uint32 requiredPassMask)
        external
        view
        returns (bool ok, uint8 code, uint64 validUntil);
}

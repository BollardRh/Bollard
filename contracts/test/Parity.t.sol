// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {RatingReport, RatingTypes} from "../src/lib/RatingTypes.sol";
import {Grades} from "../src/lib/Grades.sol";

/// @notice PDF §3.13 test/Parity.t.sol. A hard-coded report must hash to the same EIP-712 digest here and in
///         services/test/report.test.ts (viem hashTypedData). Grades must match services/src/harness/scoring.ts.
contract ParityTest is Test {
    // Fixed domain: Robinhood Chain testnet, a fixed verifying contract address.
    uint256 internal constant CHAIN_ID = 46630;
    address internal constant VERIFYING = 0x00000000000000000000000000000000b011A4D0;

    bytes32 internal constant EXPECTED_TYPEHASH = 0x70f543afb8a99cf5cb3e29afe32662b3a1933b0a067307ac4166eadd8e69a27b;
    // Cross-checked with viem 2.21 hashTypedData on 2026-11-02. services/test/report.test.ts asserts the same value.
    bytes32 internal constant EXPECTED_DIGEST = 0x43ff7d1855071faef193eaabd2ee11e9b087b89f1c57cb122c99d965622383d5;

    function _report() internal pure returns (RatingReport memory) {
        return RatingReport({
            agentRegistry: 0x8004A818BFB912233c491871b3d84c89A494BD9e,
            agentId: 42,
            versionHash: keccak256("bollard-parity-version"),
            requestId: 7,
            corpusRoot: keccak256("bollard-parity-corpus"),
            holdoutCommit: keccak256("bollard-parity-holdout"),
            runsRoot: keccak256("bollard-parity-runs"),
            seeds: 8,
            score: 87,
            grade: 4,
            testedMask: 0xFF,
            failedMask: 0x08,
            issuedAt: 1_800_000_000,
            expiresAt: 1_802_592_000
        });
    }

    function _digest(RatingReport memory r) internal pure returns (bytes32) {
        bytes32 domain = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("Bollard"),
                keccak256("1"),
                CHAIN_ID,
                VERIFYING
            )
        );
        return keccak256(abi.encodePacked("\x19\x01", domain, RatingTypes.hashStruct(r)));
    }

    function test_digestConstant() public pure {
        bytes32 d = _digest(_report());
        console2.logBytes32(RatingTypes.TYPEHASH);
        console2.logBytes32(d);
        assertEq(RatingTypes.TYPEHASH, EXPECTED_TYPEHASH);
        assertEq(d, EXPECTED_DIGEST);
    }

    /// @dev Same table as services/src/harness/scoring.ts grade().
    function test_gradeTable() public pure {
        uint32 crit = 0xB7;
        assertEq(Grades.compute(100, 0, crit), 5);
        assertEq(Grades.compute(95, 0, crit), 5);
        assertEq(Grades.compute(94, 0, crit), 4);
        assertEq(Grades.compute(99, 0x08, crit), 4); // non-critical failure blocks 5
        assertEq(Grades.compute(85, 0x08, crit), 4);
        assertEq(Grades.compute(84, 0, crit), 3);
        assertEq(Grades.compute(70, 0x40, crit), 3);
        assertEq(Grades.compute(69, 0, crit), 2);
        assertEq(Grades.compute(50, 0, crit), 2);
        assertEq(Grades.compute(49, 0, crit), 1);
        assertEq(Grades.compute(99, 0x01, crit), 2); // critical failure caps at 2
        assertEq(Grades.compute(30, 0x01, crit), 1);
    }

    function testFuzz_gradeBounds(uint8 score, uint32 failed) public pure {
        score = uint8(bound(score, 0, 100));
        uint8 g = Grades.compute(score, failed, 0xB7);
        assertGe(g, 1);
        assertLe(g, 5);
        if (failed & 0xB7 != 0) assertLe(g, 2);
        if (failed != 0) assertLe(g, 4);
    }
}

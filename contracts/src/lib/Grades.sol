// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice The rating scale. Same rule as services/src/harness/scoring.ts (keep identical; parity test in M1).
///         A grade is derived from (score, failedMask, criticalMask) and never chosen by an attester.
///   5: score >= 95 and no family failed
///   4: score >= 85 and no critical family failed
///   3: score >= 70 and no critical family failed
///   2: score >= 50, or any critical family failed (critical failure caps the grade at 2)
///   1: everything else
library Grades {
    function compute(uint8 score, uint32 failedMask, uint32 criticalMask) internal pure returns (uint8 g) {
        bool anyFail = failedMask != 0;
        bool critFail = (failedMask & criticalMask) != 0;
        if (score >= 95 && !anyFail) g = 5;
        else if (score >= 85 && !critFail) g = 4;
        else if (score >= 70 && !critFail) g = 3;
        else if (score >= 50) g = 2;
        else g = 1;
        if (critFail && g > 2) g = 2;
    }
}

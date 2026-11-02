// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {SafeTransferLib} from "./lib/SafeTransferLib.sol";
import {ReentrancyGuard} from "./lib/ReentrancyGuard.sol";

/// @title FeeRouter
/// @notice Every Bollard fee splits 80/10/5/5: workers (attesters who signed, or the red-team pool),
///         treasury, $BLRD staker sink, burn sink. Worker shares are pull-based so one bad recipient
///         cannot block a distribution. Also sells flat monthly rating-API plans.
contract FeeRouter is ReentrancyGuard {
    using SafeTransferLib for address;

    error NotGovernance();
    error NothingToClaim();
    error BadMonths();
    error ZeroAddress();

    event Distributed(address indexed token, uint256 amount, uint256 toWorkers, uint256 workerCount);
    event Claimed(address indexed worker, address indexed token, uint256 amount);
    event PlanPaid(bytes32 indexed apiKeyHash, address indexed payer, uint16 months, uint256 amount);
    event PlanPriceSet(uint256 pricePerMonth);

    uint16 public constant WORKER_BPS = 8000;
    uint16 public constant TREASURY_BPS = 1000;
    uint16 public constant STAKER_BPS = 500;
    uint16 public constant BURN_BPS = 500;

    address public immutable governance;
    address public immutable treasury;
    address public immutable stakerSink;
    address public immutable burnSink; // buys back and burns $BLRD out of band; never a payout to holders
    address public immutable workerPool; // red-team pool used when a fee has no named workers
    address public immutable planToken;
    uint256 public planPricePerMonth;

    mapping(address => mapping(address => uint256)) public claimable; // worker => token => amount

    constructor(
        address governance_,
        address treasury_,
        address stakerSink_,
        address burnSink_,
        address workerPool_,
        address planToken_,
        uint256 planPricePerMonth_
    ) {
        if (
            governance_ == address(0) || treasury_ == address(0) || stakerSink_ == address(0) || burnSink_ == address(0)
                || workerPool_ == address(0) || planToken_ == address(0)
        ) revert ZeroAddress();
        governance = governance_;
        treasury = treasury_;
        stakerSink = stakerSink_;
        burnSink = burnSink_;
        workerPool = workerPool_;
        planToken = planToken_;
        planPricePerMonth = planPricePerMonth_;
    }

    function setPlanPrice(uint256 p) external {
        if (msg.sender != governance) revert NotGovernance();
        planPricePerMonth = p;
        emit PlanPriceSet(p);
    }

    /// @notice Pulls `amount` of `token` from the caller and splits it.
    function distribute(address token, uint256 amount, address[] calldata workers) external nonReentrant {
        token.safeTransferFrom(msg.sender, address(this), amount);
        _split(token, amount, workers);
    }

    function _split(address token, uint256 amount, address[] memory workers) internal {
        uint256 toTreasury = (amount * TREASURY_BPS) / 10_000;
        uint256 toStakers = (amount * STAKER_BPS) / 10_000;
        uint256 toBurn = (amount * BURN_BPS) / 10_000;
        uint256 toWorkers = amount - toTreasury - toStakers - toBurn;
        if (workers.length == 0) {
            claimable[workerPool][token] += toWorkers;
        } else {
            uint256 each = toWorkers / workers.length;
            for (uint256 i; i < workers.length; ++i) {
                claimable[workers[i]][token] += each;
            }
            uint256 dust = toWorkers - each * workers.length;
            if (dust > 0) claimable[treasury][token] += dust;
        }
        token.safeTransfer(treasury, toTreasury);
        token.safeTransfer(stakerSink, toStakers);
        token.safeTransfer(burnSink, toBurn);
        emit Distributed(token, amount, toWorkers, workers.length);
    }

    function claim(address token) external nonReentrant {
        uint256 amt = claimable[msg.sender][token];
        if (amt == 0) revert NothingToClaim();
        claimable[msg.sender][token] = 0;
        token.safeTransfer(msg.sender, amt);
        emit Claimed(msg.sender, token, amt);
    }

    /// @notice Flat monthly rating-API plan. The API activates `apiKeyHash` when it indexes this event.
    function payPlan(bytes32 apiKeyHash, uint16 months) external nonReentrant {
        if (months == 0 || months > 24) revert BadMonths();
        uint256 amount = planPricePerMonth * months;
        planToken.safeTransferFrom(msg.sender, address(this), amount);
        _split(planToken, amount, new address[](0));
        emit PlanPaid(apiKeyHash, msg.sender, months, amount);
    }
}

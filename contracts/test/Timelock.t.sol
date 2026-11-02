// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {BollardTimelock} from "../src/BollardTimelock.sol";
import {DevTimelock} from "../src/mocks/DevTimelock.sol";
import {AttesterRegistry} from "../src/AttesterRegistry.sol";
import {MockERC20} from "../src/mocks/Mocks.sol";

contract TimelockTest is Test {
    address internal multisig = makeAddr("multisig");
    BollardTimelock internal tl;
    AttesterRegistry internal attesters;

    function setUp() public {
        tl = new BollardTimelock(multisig, 48 hours);
        MockERC20 blrd = new MockERC20("B", "B", 18);
        attesters = new AttesterRegistry(address(blrd), address(tl), makeAddr("treasury"), 1e18, 10 days, 1 days, 1e18);
    }

    function test_minDelay48h() public {
        vm.expectRevert(BollardTimelock.DelayTooShort.selector);
        new BollardTimelock(multisig, 48 hours - 1);
    }

    function test_scheduleOnlyProposer() public {
        vm.expectRevert(BollardTimelock.NotProposer.selector);
        tl.schedule(address(attesters), 0, "", bytes32(0));
    }

    function test_executeAfterDelay_anyone() public {
        bytes memory data = abi.encodeCall(AttesterRegistry.setAllowedCompose, (keccak256("c"), true));
        vm.prank(multisig);
        tl.schedule(address(attesters), 0, data, bytes32(0));
        vm.expectRevert(BollardTimelock.NotReady.selector);
        tl.execute(address(attesters), 0, data, bytes32(0));
        vm.warp(block.timestamp + 48 hours);
        vm.prank(makeAddr("anyone"));
        tl.execute(address(attesters), 0, data, bytes32(0));
        assertTrue(attesters.allowedCompose(keccak256("c")));
        vm.expectRevert(BollardTimelock.UnknownOp.selector);
        tl.execute(address(attesters), 0, data, bytes32(0));
    }

    function test_cancel() public {
        bytes memory data = abi.encodeCall(AttesterRegistry.setAllowedCompose, (keccak256("c"), true));
        vm.prank(multisig);
        bytes32 id = tl.schedule(address(attesters), 0, data, bytes32(0));
        vm.prank(multisig);
        tl.cancel(id);
        vm.warp(block.timestamp + 48 hours);
        vm.expectRevert(BollardTimelock.UnknownOp.selector);
        tl.execute(address(attesters), 0, data, bytes32(0));
    }

    function test_failedCallBubbles() public {
        bytes memory data = abi.encodeCall(AttesterRegistry.setSlasher, (address(0)));
        vm.prank(multisig);
        tl.schedule(address(attesters), 0, data, bytes32(0));
        vm.warp(block.timestamp + 48 hours);
        vm.expectRevert(
            abi.encodeWithSelector(
                BollardTimelock.CallFailed.selector, abi.encodeWithSelector(AttesterRegistry.ZeroAddress.selector)
            )
        );
        tl.execute(address(attesters), 0, data, bytes32(0));
    }

    function test_devTimelock_10min() public {
        vm.expectRevert(DevTimelock.DelayTooShort.selector);
        new DevTimelock(multisig, 10 minutes - 1);
        DevTimelock dev = new DevTimelock(multisig, 10 minutes);
        assertEq(dev.delay(), 10 minutes);
    }
}

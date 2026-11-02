// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ISafeGuard} from "../interfaces/IAccounts.sol";

/// @notice Test and testnet ERC-20 with open minting. Used as tUSDG / tBLRD on Robinhood Chain testnet.
///         Never deploy this on a mainnet.
contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public immutable decimals;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory name_, string memory symbol_, uint8 decimals_) {
        name = name_;
        symbol = symbol_;
        decimals = decimals_;
    }

    function mint(address to, uint256 amount) external {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _move(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 a = allowance[from][msg.sender];
        if (a != type(uint256).max) {
            require(a >= amount, "allowance");
            allowance[from][msg.sender] = a - amount;
        }
        _move(from, to, amount);
        return true;
    }

    function _move(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}

/// @notice Minimal ERC-8004 identity registry for tests.
contract MockIdentity8004 {
    struct Agent {
        address owner;
        address wallet;
    }

    uint256 public nextId = 1;
    mapping(uint256 => Agent) public agents;
    mapping(uint256 => mapping(address => bool)) public operators;

    function register(address owner, address wallet) external returns (uint256 id) {
        id = nextId++;
        agents[id] = Agent(owner, wallet);
    }

    function setWallet(uint256 id, address wallet) external {
        agents[id].wallet = wallet;
    }

    function setOperator(uint256 id, address op, bool ok) external {
        require(msg.sender == agents[id].owner, "owner");
        operators[id][op] = ok;
    }

    function ownerOf(uint256 id) external view returns (address) {
        return agents[id].owner;
    }

    function getAgentWallet(uint256 id) external view returns (address) {
        return agents[id].wallet;
    }

    function isAuthorizedOrOwner(address spender, uint256 id) external view returns (bool) {
        return spender == agents[id].owner || operators[id][spender];
    }
}

/// @notice ERC-8004 reputation registry that records the last feedback. Set `reverting` to simulate failure.
contract MockReputation8004 {
    bool public reverting;
    uint256 public count;
    uint256 public lastAgentId;
    int128 public lastValue;
    uint8 public lastDecimals;
    string public lastTag1;
    string public lastTag2;
    string public lastEndpoint;
    string public lastUri;
    bytes32 public lastHash;

    function setReverting(bool r) external {
        reverting = r;
    }

    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata tag2,
        string calldata endpoint,
        string calldata feedbackURI,
        bytes32 feedbackHash
    ) external {
        require(!reverting, "reputation down");
        count++;
        lastAgentId = agentId;
        lastValue = value;
        lastDecimals = valueDecimals;
        lastTag1 = tag1;
        lastTag2 = tag2;
        lastEndpoint = endpoint;
        lastUri = feedbackURI;
        lastHash = feedbackHash;
    }
}

/// @notice On-chain DCAP verifier stand-in with a settable answer.
contract MockQuoteVerifier {
    bool public result = true;

    function setResult(bool r) external {
        result = r;
    }

    function verifyQuote(bytes calldata) external view returns (bool) {
        return result;
    }
}

/// @notice Safe AllowanceModule stand-in that records delegates and allowances per Safe.
contract MockAllowanceModule {
    mapping(address => mapping(address => bool)) public isDelegate; // safe => delegate
    mapping(address => mapping(address => mapping(address => uint96))) public allowanceOf; // safe => delegate => token

    function addDelegate(address delegate) external {
        isDelegate[msg.sender][delegate] = true;
    }

    function removeDelegate(address delegate, bool) external {
        isDelegate[msg.sender][delegate] = false;
    }

    function setAllowance(address delegate, address token, uint96 amount, uint16, uint32) external {
        allowanceOf[msg.sender][delegate][token] = amount;
    }
}

/// @notice Minimal Safe stand-in: runs the guard before every owner transaction, supports CALL and
///         DELEGATECALL, setGuard / enableModule self-calls, and execTransactionFromModule (no guard,
///         as on Safe <= 1.4.1).
contract MockSafe {
    address public guard;
    mapping(address => bool) public modules;
    address public immutable owner;

    constructor(address owner_) {
        owner = owner_;
    }

    function exec(address to, uint256 value, bytes calldata data, uint8 operation) external returns (bool ok, bytes memory ret) {
        require(msg.sender == owner, "owner");
        if (guard != address(0)) {
            ISafeGuard(guard).checkTransaction(to, value, data, operation, 0, 0, 0, address(0), payable(0), "", msg.sender);
        }
        (ok, ret) = operation == 1 ? to.delegatecall(data) : to.call{value: value}(data);
        if (!ok) {
            assembly {
                revert(add(ret, 0x20), mload(ret))
            }
        }
    }

    function setGuard(address g) external {
        require(msg.sender == address(this), "self");
        guard = g;
    }

    function enableModule(address m) external {
        require(msg.sender == address(this), "self");
        modules[m] = true;
    }

    function execTransactionFromModule(address to, uint256 value, bytes calldata data, uint8 operation)
        external
        returns (bool success)
    {
        require(modules[msg.sender], "module");
        (success,) = operation == 1 ? to.delegatecall(data) : to.call{value: value}(data);
    }

    receive() external payable {}
}

/// @notice Safe MultiSend clone (v1.4.1 packing). Must be called via DELEGATECALL from the Safe.
contract MockMultiSend {
    function multiSend(bytes memory transactions) public payable {
        assembly {
            let length := mload(transactions)
            let i := 0x20
            for {} lt(i, length) {} {
                let operation := shr(0xf8, mload(add(transactions, i)))
                let to := shr(0x60, mload(add(transactions, add(i, 0x01))))
                let value := mload(add(transactions, add(i, 0x15)))
                let dataLength := mload(add(transactions, add(i, 0x35)))
                let data := add(transactions, add(i, 0x55))
                let success := 0
                switch operation
                case 0 { success := call(gas(), to, value, data, dataLength, 0, 0) }
                case 1 { success := delegatecall(gas(), to, data, dataLength, 0, 0) }
                if eq(success, 0) {
                    returndatacopy(0, 0, returndatasize())
                    revert(0, returndatasize())
                }
                i := add(i, add(0x55, dataLength))
            }
        }
    }
}

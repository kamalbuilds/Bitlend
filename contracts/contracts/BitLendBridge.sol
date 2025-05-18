// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title BitLendBridge
 * @dev Interface with exSat's custodian bridge system for BTC to XBTC transfers
 * This contract interacts with exSat's bridge for secure asset transfers between Bitcoin and exSat
 * Based on the exSat bridge documentation: https://docs.exsat.network/developer-guides/custodian-bridge-for-btc
 */
contract BitLendBridge is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Constants
    address public constant EXSAT_BRIDGE_ADDRESS = 0xbbbbbbbbbbbbbbbbbbbbbbbb3d6f4ef81dc1b200; // Reserved address of bproxy.xsat
    
    // XBTC token on exSat network (mainnet address from docs)
    IERC20 public xbtcToken = IERC20(0x4aa4365da82ACD46e378A6f3c92a863f3e763d34);
    
    // Required confirmations for Bitcoin transactions
    uint256 public requiredBtcConfirmations = 6;
    
    // Withdrawal fee (in basis points, 10000 = 100%)
    uint256 public withdrawalFeeBps = 10; // 0.1%
    
    // Address to collect fees
    address public feeCollector;
    
    // BTC address management
    mapping(address => string) public userBtcAddresses;
    mapping(string => address) public btcToEvmAddressMapping;
    
    // Events
    event DepositAddressCreated(address indexed evmAddress, string btcAddress);
    event BtcDeposited(address indexed evmAddress, string btcAddress, uint256 amount);
    event WithdrawalInitiated(address indexed user, uint256 amount, string btcAddress, string gasLevel);
    event WithdrawalFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event FeeCollectorUpdated(address indexed oldCollector, address indexed newCollector);
    event XbtcTokenUpdated(address indexed oldToken, address indexed newToken);
    
    /**
     * @dev Constructor initializes the bridge with required addresses
     * @param _feeCollector Address to collect fees
     */
    constructor(address _feeCollector) Ownable(msg.sender) {
        require(_feeCollector != address(0), "Fee collector cannot be zero address");
        feeCollector = _feeCollector;
    }
    
    /**
     * @dev Register a BTC deposit address for a user
     * Note: In production, this would be replaced by a backend call to generate deposit addresses
     * @param evmAddress The EVM address to link to the BTC address
     * @param btcAddress The Bitcoin address for deposits
     */
    function registerBtcAddress(address evmAddress, string calldata btcAddress) external onlyOwner {
        require(evmAddress != address(0), "Invalid EVM address");
        require(bytes(btcAddress).length > 0, "Invalid BTC address");
        
        userBtcAddresses[evmAddress] = btcAddress;
        btcToEvmAddressMapping[btcAddress] = evmAddress;
        
        emit DepositAddressCreated(evmAddress, btcAddress);
    }
    
    /**
     * @dev Get the Bitcoin deposit address for a user
     * @param user EVM address of the user
     * @return The user's Bitcoin deposit address
     */
    function getUserBtcAddress(address user) external view returns (string memory) {
        string memory btcAddress = userBtcAddresses[user];
        require(bytes(btcAddress).length > 0, "No BTC address registered for user");
        return btcAddress;
    }
    
    /**
     * @dev Simulate a BTC deposit notification
     * Note: In production, this would be handled by the exSat bridge system automatically
     * @param btcAddress The Bitcoin address receiving the deposit
     * @param amount Amount of BTC deposited (in satoshis)
     */
    function notifyBtcDeposit(string calldata btcAddress, uint256 amount) external onlyOwner {
        address evmAddress = btcToEvmAddressMapping[btcAddress];
        require(evmAddress != address(0), "Unknown BTC address");
        
        // In production, the actual XBTC minting is handled by the exSat bridge
        // This is just a simulation for the hackathon/demo
        xbtcToken.safeTransfer(evmAddress, amount);
        
        emit BtcDeposited(evmAddress, btcAddress, amount);
    }
    
    /**
     * @dev Withdraw XBTC to receive BTC
     * Based on exSat's bridge withdrawal process: send to bridge address with specific memo format
     * @param amount Amount of XBTC to withdraw
     * @param btcAddress Bitcoin address to receive BTC
     * @param gasLevel Gas level for Bitcoin transaction ("slow" or "fast")
     */
    function withdraw(uint256 amount, string calldata btcAddress, string calldata gasLevel) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(bytes(btcAddress).length > 0, "Invalid BTC address");
        require(
            keccak256(abi.encodePacked(gasLevel)) == keccak256(abi.encodePacked("slow")) || 
            keccak256(abi.encodePacked(gasLevel)) == keccak256(abi.encodePacked("fast")), 
            "Gas level must be 'slow' or 'fast'"
        );
        
        // Calculate fee amount
        uint256 feeAmount = (amount * withdrawalFeeBps) / 10000;
        uint256 netAmount = amount - feeAmount;
        
        // Transfer XBTC from user to this contract
        xbtcToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Transfer fee to fee collector
        if (feeAmount > 0) {
            xbtcToken.safeTransfer(feeCollector, feeAmount);
        }
        
        // Format memo according to exSat bridge requirements
        // memo format: <permission_id>,<evm_address>,<btc_address>,<gas_level>
        string memory memo = string(abi.encodePacked(
            "1,", // permission_id = 1 for regular usage
            _addressToString(msg.sender), // sender address
            ",",
            btcAddress,
            ",",
            gasLevel
        ));
        
        // Transfer XBTC to the bridge address with formatted memo
        // In a real implementation, the memo would need to be passed as data in the transfer
        // However, since exSat has a specific way to handle this via internal bridge mechanics,
        // this is a simplified version for demonstration
        xbtcToken.safeApprove(EXSAT_BRIDGE_ADDRESS, netAmount);
        
        // In a real implementation, this would trigger a cross-chain message to the exSat bridge
        // But for demonstration purposes, we'll just emit an event with the withdrawal details
        emit WithdrawalInitiated(msg.sender, netAmount, btcAddress, gasLevel);
    }
    
    /**
     * @dev Update the XBTC token address
     * @param _newToken New XBTC token address
     */
    function updateXbtcToken(address _newToken) external onlyOwner {
        require(_newToken != address(0), "New token cannot be zero address");
        
        address oldToken = address(xbtcToken);
        xbtcToken = IERC20(_newToken);
        
        emit XbtcTokenUpdated(oldToken, _newToken);
    }
    
    /**
     * @dev Update the withdrawal fee
     * @param _feeBps New fee in basis points
     */
    function updateWithdrawalFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 1000, "Fee cannot exceed 10%");
        
        uint256 oldFeeBps = withdrawalFeeBps;
        withdrawalFeeBps = _feeBps;
        
        emit WithdrawalFeeUpdated(oldFeeBps, _feeBps);
    }
    
    /**
     * @dev Update the fee collector address
     * @param _feeCollector New fee collector address
     */
    function updateFeeCollector(address _feeCollector) external onlyOwner {
        require(_feeCollector != address(0), "Fee collector cannot be zero address");
        
        address oldCollector = feeCollector;
        feeCollector = _feeCollector;
        
        emit FeeCollectorUpdated(oldCollector, _feeCollector);
    }
    
    /**
     * @dev Convert address to string
     * @param addr Address to convert
     * @return String representation of the address
     */
    function _addressToString(address addr) internal pure returns (string memory) {
        bytes memory addressBytes = abi.encodePacked(addr);
        bytes memory stringBytes = new bytes(42); // 0x + 40 characters
        
        stringBytes[0] = "0";
        stringBytes[1] = "x";
        
        for (uint256 i = 0; i < 20; i++) {
            uint8 leftNibble = uint8(addressBytes[i]) >> 4;
            uint8 rightNibble = uint8(addressBytes[i]) & 0xf;
            
            stringBytes[2 + i * 2] = _byteToChar(leftNibble);
            stringBytes[2 + i * 2 + 1] = _byteToChar(rightNibble);
        }
        
        return string(stringBytes);
    }
    
    /**
     * @dev Convert byte to character
     * @param b Byte to convert
     * @return Character representation
     */
    function _byteToChar(uint8 b) internal pure returns (bytes1) {
        if (b < 10) {
            return bytes1(uint8(b) + 0x30);
        } else {
            return bytes1(uint8(b) + 0x57);
        }
    }
} 
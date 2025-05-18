// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockExSatBridge
 * @dev Mock implementation of exSat's bridge for testing
 */
contract MockExSatBridge is Ownable {
    using SafeERC20 for IERC20;

    // XBTC token
    IERC20 public xbtcToken;
    
    // Conversion rate for BTC to XBTC (1:1 by default)
    uint256 public conversionRate = 1;
    
    // Mapping of withdrawals
    mapping(bytes32 => bool) public withdrawals;
    
    // Events
    event Deposited(address indexed user, uint256 btcAmount, uint256 xbtcAmount);
    event Withdrawn(address indexed user, uint256 xbtcAmount, string btcAddress);
    
    /**
     * @dev Constructor to initialize the bridge
     * @param _xbtcToken Address of the XBTC token
     */
    constructor(address _xbtcToken) Ownable(msg.sender) {
        xbtcToken = IERC20(_xbtcToken);
    }
    
    /**
     * @dev Set the conversion rate (for testing different scenarios)
     * @param _rate New conversion rate (scaled by 1e8)
     */
    function setConversionRate(uint256 _rate) external onlyOwner {
        require(_rate > 0, "Rate must be greater than 0");
        conversionRate = _rate;
    }
    
    /**
     * @dev Mock deposit function - converts BTC to XBTC
     * In a real bridge, this would verify the BTC transaction
     * @return Amount of XBTC minted
     */
    function deposit() external payable returns (uint256) {
        require(msg.value > 0, "No BTC sent");
        
        // Convert BTC to XBTC (1:1 in this mock)
        uint256 xbtcAmount = msg.value;
        
        // Mint XBTC to the sender (for testing, we assume the owner can mint)
        // In a real implementation, XBTC would be minted based on verified BTC deposits
        (bool success, ) = address(xbtcToken).call(
            abi.encodeWithSignature("mint(address,uint256)", msg.sender, xbtcAmount)
        );
        require(success, "Minting XBTC failed");
        
        emit Deposited(msg.sender, msg.value, xbtcAmount);
        
        return xbtcAmount;
    }
    
    /**
     * @dev Mock withdraw function - converts XBTC back to BTC
     * In a real bridge, this would initiate a BTC transaction
     * @param amount Amount of XBTC to withdraw
     * @param btcAddress Bitcoin address to receive BTC
     * @return success Whether the withdrawal was successful
     */
    function withdraw(uint256 amount, string calldata btcAddress) external returns (bool) {
        require(amount > 0, "Amount must be greater than 0");
        require(bytes(btcAddress).length > 0, "Invalid BTC address");
        
        // Transfer XBTC from user to this contract
        xbtcToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Burn the XBTC (in a real implementation)
        // Here we just keep it in the contract
        
        // Generate a unique ID for the withdrawal
        bytes32 withdrawalId = keccak256(abi.encodePacked(msg.sender, amount, btcAddress, block.timestamp));
        withdrawals[withdrawalId] = true;
        
        emit Withdrawn(msg.sender, amount, btcAddress);
        
        return true;
    }
    
    /**
     * @dev Check the status of a withdrawal (for testing)
     * @param withdrawalId The withdrawal ID to check
     * @return exists Whether the withdrawal exists
     */
    function checkWithdrawal(bytes32 withdrawalId) external view returns (bool) {
        return withdrawals[withdrawalId];
    }
} 
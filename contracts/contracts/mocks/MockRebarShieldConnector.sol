// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockRebarShieldConnector
 * @dev Mock implementation of Rebar Shield connector for testing
 */
contract MockRebarShieldConnector is Ownable {
    // Bundle status enum (0=pending, 1=included, 2=failed)
    enum BundleStatus { Pending, Included, Failed }
    
    // Mapping from bundle ID to status
    mapping(bytes32 => BundleStatus) public bundleStatuses;
    
    // Mapping from bundle ID to block number
    mapping(bytes32 => uint256) public bundleBlockNumbers;
    
    // Mapping from bundle ID to gas price
    mapping(bytes32 => uint256) public bundleGasPrices;
    
    // Events
    event BundleSent(bytes32 indexed bundleId, address vault, address borrower, address liquidator, uint256 priority);
    event BundleStatusUpdated(bytes32 indexed bundleId, BundleStatus status, uint256 blockNumber, uint256 gasPrice);
    
    /**
     * @dev Constructor
     */
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Send a liquidation bundle to Rebar Shield
     * @param vault Address of the vault contract
     * @param borrower Address of the borrower to liquidate
     * @param liquidator Address of the liquidator
     * @param priority Priority level (1-5)
     * @return bundleId Unique ID for the bundle
     */
    function sendLiquidationBundle(
        address vault,
        address borrower,
        address liquidator,
        uint256 priority
    ) external returns (bytes32 bundleId) {
        require(priority >= 1 && priority <= 5, "Priority must be 1-5");
        
        // Generate a unique bundle ID
        bundleId = keccak256(abi.encodePacked(vault, borrower, liquidator, priority, block.timestamp));
        
        // Set initial status to pending
        bundleStatuses[bundleId] = BundleStatus.Pending;
        bundleBlockNumbers[bundleId] = 0;
        bundleGasPrices[bundleId] = 0;
        
        emit BundleSent(bundleId, vault, borrower, liquidator, priority);
        
        return bundleId;
    }
    
    /**
     * @dev Update the status of a bundle (for testing)
     * @param bundleId Bundle ID to update
     * @param status New status
     * @param blockNumber Block number where the bundle was included
     * @param gasPrice Gas price of the transaction
     */
    function updateBundleStatus(
        bytes32 bundleId,
        BundleStatus status,
        uint256 blockNumber,
        uint256 gasPrice
    ) external onlyOwner {
        bundleStatuses[bundleId] = status;
        bundleBlockNumbers[bundleId] = blockNumber;
        bundleGasPrices[bundleId] = gasPrice;
        
        emit BundleStatusUpdated(bundleId, status, blockNumber, gasPrice);
    }
    
    /**
     * @dev Get the status of a bundle
     * @param bundleId Bundle ID to check
     * @return status Status of the bundle
     * @return blockNumber Block number where the bundle was included
     * @return gasPrice Gas price of the transaction
     */
    function getBundleStatus(bytes32 bundleId) external view returns (
        uint8 status,
        uint256 blockNumber,
        uint256 gasPrice
    ) {
        return (
            uint8(bundleStatuses[bundleId]),
            bundleBlockNumbers[bundleId],
            bundleGasPrices[bundleId]
        );
    }
} 
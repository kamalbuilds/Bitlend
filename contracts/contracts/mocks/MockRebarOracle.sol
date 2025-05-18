// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockRebarOracle
 * @dev Mock implementation of Rebar Data Oracle for testing
 */
contract MockRebarOracle is Ownable {
    // BTC price (in USD, 8 decimals)
    uint256 public btcPrice = 90000_00000000; // $90,000
    
    // Mempool size
    uint256 public mempoolSize = 8500;
    
    // Current block height
    uint256 public blockHeight = 840000;
    
    // Network hash rate (in EH/s, scaled by 1e8)
    uint256 public hashRate = 510_00000000; // 510 EH/s
    
    // Average block time (in seconds)
    uint256 public avgBlockTime = 600; // 10 minutes
    
    // Liquidation risk data
    struct LiquidationRisk {
        address user;
        uint256 riskScore; // 0-100
        uint256 estimatedTime; // seconds until liquidation
    }
    
    // Top 10 at-risk addresses (to simulate liquidation risks)
    LiquidationRisk[10] public liquidationRisks;
    
    // Events
    event BtcPriceUpdated(uint256 price);
    event MempoolSizeUpdated(uint256 size);
    event BlockHeightUpdated(uint256 height);
    event HashRateUpdated(uint256 rate);
    event AvgBlockTimeUpdated(uint256 time);
    
    /**
     * @dev Constructor
     */
    constructor() Ownable(msg.sender) {
        // Initialize with some mock data
        for (uint256 i = 0; i < 5; i++) {
            liquidationRisks[i] = LiquidationRisk({
                user: address(uint160(0x1000 + i)),
                riskScore: 80 - i * 10,
                estimatedTime: 300 + i * 600
            });
        }
    }
    
    /**
     * @dev Set the BTC price
     * @param _price New BTC price (scaled by 1e8)
     */
    function setBtcPrice(uint256 _price) external onlyOwner {
        btcPrice = _price;
        emit BtcPriceUpdated(_price);
    }
    
    /**
     * @dev Set the mempool size
     * @param _size New mempool size
     */
    function setMempoolSize(uint256 _size) external onlyOwner {
        mempoolSize = _size;
        emit MempoolSizeUpdated(_size);
    }
    
    /**
     * @dev Set the block height
     * @param _height New block height
     */
    function setBlockHeight(uint256 _height) external onlyOwner {
        blockHeight = _height;
        emit BlockHeightUpdated(_height);
    }
    
    /**
     * @dev Set the hash rate
     * @param _rate New hash rate (scaled by 1e8)
     */
    function setHashRate(uint256 _rate) external onlyOwner {
        hashRate = _rate;
        emit HashRateUpdated(_rate);
    }
    
    /**
     * @dev Set the average block time
     * @param _time New average block time (in seconds)
     */
    function setAvgBlockTime(uint256 _time) external onlyOwner {
        avgBlockTime = _time;
        emit AvgBlockTimeUpdated(_time);
    }
    
    /**
     * @dev Add a liquidation risk entry
     * @param _user Address of the user
     * @param _riskScore Risk score (0-100)
     * @param _estimatedTime Estimated time until liquidation (in seconds)
     * @param index Position in the array (0-9)
     */
    function setLiquidationRisk(
        address _user,
        uint256 _riskScore,
        uint256 _estimatedTime,
        uint256 index
    ) external onlyOwner {
        require(index < 10, "Index out of bounds");
        require(_riskScore <= 100, "Risk score must be 0-100");
        
        liquidationRisks[index] = LiquidationRisk({
            user: _user,
            riskScore: _riskScore,
            estimatedTime: _estimatedTime
        });
    }
    
    /**
     * @dev Get the BTC price
     * @return BTC price (scaled by 1e8)
     */
    function getBtcPrice() external view returns (uint256) {
        return btcPrice;
    }
    
    /**
     * @dev Get the mempool size
     * @return Mempool size
     */
    function getMempoolSize() external view returns (uint256) {
        return mempoolSize;
    }
    
    /**
     * @dev Get the current block height
     * @return Block height
     */
    function getCurrentBlockHeight() external view returns (uint256) {
        return blockHeight;
    }
    
    /**
     * @dev Get the network hash rate
     * @return Hash rate (scaled by 1e8)
     */
    function getNetworkHashRate() external view returns (uint256) {
        return hashRate;
    }
    
    /**
     * @dev Get the average block time
     * @return Average block time (in seconds)
     */
    function getAverageBlockTime() external view returns (uint256) {
        return avgBlockTime;
    }
    
    /**
     * @dev Get liquidation risks
     * @return users Array of user addresses
     * @return riskScores Array of risk scores
     * @return estimatedTimes Array of estimated times until liquidation
     */
    function getLiquidationRisks() external view returns (
        address[10] memory users,
        uint256[10] memory riskScores,
        uint256[10] memory estimatedTimes
    ) {
        for (uint256 i = 0; i < 10; i++) {
            users[i] = liquidationRisks[i].user;
            riskScores[i] = liquidationRisks[i].riskScore;
            estimatedTimes[i] = liquidationRisks[i].estimatedTime;
        }
        
        return (users, riskScores, estimatedTimes);
    }
} 
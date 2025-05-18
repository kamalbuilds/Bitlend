// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title BitLendPriceOracle
 * @dev Contract to provide price data for assets in the BitLend protocol
 * This oracle supports both external price feeds and manual price updates
 * with fallback mechanisms to ensure continuity of price data.
 * It integrates with Rebar Data for reliable Bitcoin price information.
 */
contract BitLendPriceOracle is Ownable {
    // Price precision constant (same as Chainlink)
    uint256 public constant PRICE_PRECISION = 1e8;
    
    // Structs
    struct PriceData {
        uint256 price;
        uint256 timestamp;
        bool isValid;
    }
    
    // Mapping from token address to its price feed address
    mapping(address => address) public priceFeeds;
    
    // Manual price data for tokens without feeds
    mapping(address => PriceData) public manualPrices;
    
    // Rebar Data integration parameters
    address public rebarOracleAddress;
    uint256 public rebarDataLastUpdated;
    uint256 public rebarUpdateInterval = 15 minutes;
    
    // BTC-specific data from Rebar
    uint256 public btcMempoolSize;
    uint256 public btcBlockHeight;
    uint256 public btcHashRate;
    uint256 public btcAverageBlockTime;
    
    // Liquidation risk data from Rebar
    struct LiquidationRisk {
        address user;
        uint256 riskScore; // 0-100, higher means higher risk
        uint256 estimatedTime; // Estimated time until potential liquidation
    }
    
    // Top 10 positions at risk of liquidation
    LiquidationRisk[10] public topLiquidationRisks;
    
    // Events
    event PriceFeedUpdated(address indexed token, address indexed priceFeed);
    event ManualPriceUpdated(address indexed token, uint256 price, uint256 timestamp);
    event RebarOracleUpdated(address indexed oldOracle, address indexed newOracle);
    event RebarDataUpdated(
        uint256 btcPrice, 
        uint256 btcMempoolSize, 
        uint256 btcBlockHeight, 
        uint256 btcHashRate,
        uint256 btcAverageBlockTime
    );
    event LiquidationRiskUpdated(address indexed user, uint256 riskScore, uint256 estimatedTime);
    
    /**
     * @dev Constructor to initialize the oracle
     * @param _rebarOracleAddress Address of the Rebar Data Oracle contract
     */
    constructor(address _rebarOracleAddress) Ownable(msg.sender) {
        rebarOracleAddress = _rebarOracleAddress;
    }
    
    /**
     * @dev Interface for Rebar Data Oracle
     */
    interface IRebarDataOracle {
        function getBtcPrice() external view returns (uint256);
        function getMempoolSize() external view returns (uint256);
        function getCurrentBlockHeight() external view returns (uint256);
        function getNetworkHashRate() external view returns (uint256);
        function getAverageBlockTime() external view returns (uint256);
        function getLiquidationRisks() external view returns (
            address[10] memory users,
            uint256[10] memory riskScores,
            uint256[10] memory estimatedTimes
        );
    }
    
    /**
     * @dev Set a price feed for a token
     * @param token Address of the token
     * @param priceFeed Address of the price feed
     */
    function setPriceFeed(address token, address priceFeed) external onlyOwner {
        priceFeeds[token] = priceFeed;
        emit PriceFeedUpdated(token, priceFeed);
    }
    
    /**
     * @dev Set the Rebar Oracle address
     * @param _rebarOracleAddress Address of the Rebar Data Oracle contract
     */
    function setRebarOracleAddress(address _rebarOracleAddress) external onlyOwner {
        address oldOracle = rebarOracleAddress;
        rebarOracleAddress = _rebarOracleAddress;
        emit RebarOracleUpdated(oldOracle, _rebarOracleAddress);
    }
    
    /**
     * @dev Update a token's price manually
     * @param token Address of the token
     * @param price Price of the token (scaled by PRICE_PRECISION)
     */
    function updateManualPrice(address token, uint256 price) external onlyOwner {
        manualPrices[token] = PriceData({
            price: price,
            timestamp: block.timestamp,
            isValid: true
        });
        
        emit ManualPriceUpdated(token, price, block.timestamp);
    }
    
    /**
     * @dev Update the Rebar update interval
     * @param interval New interval in seconds
     */
    function updateRebarInterval(uint256 interval) external onlyOwner {
        require(interval >= 1 minutes, "Interval too short");
        require(interval <= 1 days, "Interval too long");
        rebarUpdateInterval = interval;
    }
    
    /**
     * @dev Update data from Rebar Data Oracle
     * This function should be called regularly to keep BTC data current
     */
    function updateRebarData() external {
        require(block.timestamp >= rebarDataLastUpdated + rebarUpdateInterval, "Too soon to update");
        require(rebarOracleAddress != address(0), "Rebar Oracle not set");
        
        IRebarDataOracle rebarOracle = IRebarDataOracle(rebarOracleAddress);
        
        // Get BTC data
        uint256 btcPrice = rebarOracle.getBtcPrice();
        btcMempoolSize = rebarOracle.getMempoolSize();
        btcBlockHeight = rebarOracle.getCurrentBlockHeight();
        btcHashRate = rebarOracle.getNetworkHashRate();
        btcAverageBlockTime = rebarOracle.getAverageBlockTime();
        
        // Update BTC price in the manual prices mapping
        manualPrices[address(0)] = PriceData({
            price: btcPrice,
            timestamp: block.timestamp,
            isValid: true
        });
        
        // Get liquidation risks
        (
            address[10] memory users,
            uint256[10] memory riskScores,
            uint256[10] memory estimatedTimes
        ) = rebarOracle.getLiquidationRisks();
        
        // Update liquidation risks
        for (uint256 i = 0; i < 10; i++) {
            if (users[i] != address(0)) {
                topLiquidationRisks[i] = LiquidationRisk({
                    user: users[i],
                    riskScore: riskScores[i],
                    estimatedTime: estimatedTimes[i]
                });
                
                emit LiquidationRiskUpdated(users[i], riskScores[i], estimatedTimes[i]);
            }
        }
        
        rebarDataLastUpdated = block.timestamp;
        
        emit RebarDataUpdated(btcPrice, btcMempoolSize, btcBlockHeight, btcHashRate, btcAverageBlockTime);
    }
    
    /**
     * @dev Get a token's price
     * @param token Address of the token (use address(0) for BTC)
     * @return price The token's price (scaled by PRICE_PRECISION)
     */
    function getPrice(address token) public view returns (uint256) {
        // First, try to get price from price feed
        address priceFeed = priceFeeds[token];
        if (priceFeed != address(0)) {
            try AggregatorV3Interface(priceFeed).latestRoundData() returns (
                uint80,
                int256 answer,
                uint256,
                uint256 updatedAt,
                uint80
            ) {
                // Check if the price is valid and recent
                if (answer > 0 && block.timestamp - updatedAt < 1 hours) {
                    return uint256(answer);
                }
            } catch {}
        }
        
        // If price feed failed or doesn't exist, try manual price
        PriceData memory manualData = manualPrices[token];
        if (manualData.isValid && block.timestamp - manualData.timestamp < 1 days) {
            return manualData.price;
        }
        
        // If both failed, revert
        revert("Price not available");
    }
    
    /**
     * @dev Get BTC price in USD
     * @return price BTC price in USD (scaled by PRICE_PRECISION)
     */
    function getBtcPrice() public view returns (uint256) {
        return getPrice(address(0));
    }
    
    /**
     * @dev Get XBTC value in USD
     * @param xbtcAmount Amount of XBTC
     * @return usdValue Value in USD (scaled by PRICE_PRECISION)
     */
    function getXbtcUsdValue(uint256 xbtcAmount) external view returns (uint256) {
        uint256 btcPrice = getBtcPrice();
        return (xbtcAmount * btcPrice) / 1e8; // XBTC has 8 decimals
    }
    
    /**
     * @dev Get USDC value in USD (normally 1:1)
     * @param usdcAmount Amount of USDC
     * @return usdValue Value in USD (scaled by PRICE_PRECISION)
     */
    function getUsdcUsdValue(uint256 usdcAmount) external view returns (uint256) {
        return (usdcAmount * PRICE_PRECISION) / 1e6; // USDC has 6 decimals
    }
    
    /**
     * @dev Get liquidation risk for a specific user
     * @param user Address of the user
     * @return riskScore Risk score (0-100)
     * @return estimatedTime Estimated time until potential liquidation
     */
    function getLiquidationRisk(address user) external view returns (uint256 riskScore, uint256 estimatedTime) {
        for (uint256 i = 0; i < 10; i++) {
            if (topLiquidationRisks[i].user == user) {
                return (topLiquidationRisks[i].riskScore, topLiquidationRisks[i].estimatedTime);
            }
        }
        return (0, 0); // User not in top risks
    }
    
    /**
     * @dev Get latest BTC network data
     * @return mempool Current mempool size
     * @return blockHeight Current BTC block height
     * @return hashRate Current network hash rate
     * @return blockTime Average block time in seconds
     */
    function getBtcNetworkData() external view returns (
        uint256 mempool,
        uint256 blockHeight,
        uint256 hashRate,
        uint256 blockTime
    ) {
        return (btcMempoolSize, btcBlockHeight, btcHashRate, btcAverageBlockTime);
    }
} 
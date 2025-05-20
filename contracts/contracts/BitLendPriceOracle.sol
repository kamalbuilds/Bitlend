// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title BitLendPriceOracle
 * @dev Contract to provide price data for assets in the BitLend protocol
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
    
    // BTC price data
    uint256 public btcPrice;
    uint256 public btcBlockHeight;
    
    // UTXO verification status
    struct UTXOStatus {
        uint256 verifiedTimestamp;
        uint256 amount;
        bool isValid;
        string btcAddress;
    }
    
    // Mapping from txid+index to UTXO verification status
    mapping(bytes32 => UTXOStatus) public verifiedUTXOs;
    
    // Events
    event PriceFeedUpdated(address indexed token, address indexed priceFeed);
    event ManualPriceUpdated(address indexed token, uint256 price, uint256 timestamp);
    event BtcDataUpdated(uint256 btcPrice, uint256 btcBlockHeight);
    event UTXOVerified(bytes32 indexed utxoId, uint256 amount, bool isValid, string btcAddress);
    
    /**
     * @dev Constructor to initialize the oracle
     */
    constructor() Ownable(msg.sender) {
        // Set initial BTC price
        btcPrice = 90000 * PRICE_PRECISION; // Default to $90,000 until updated
        btcBlockHeight = 840000; // Default block height
        
        // Initialize BTC price in manual prices
        manualPrices[address(0)] = PriceData({
            price: btcPrice,
            timestamp: block.timestamp,
            isValid: true
        });
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
        
        if (token == address(0)) {
            btcPrice = price;
            emit BtcDataUpdated(btcPrice, btcBlockHeight);
        }
        
        emit ManualPriceUpdated(token, price, block.timestamp);
    }
    
    /**
     * @dev Update BTC data
     * @param _btcPrice New BTC price
     * @param _btcBlockHeight New BTC block height
     */
    function updateBtcData(uint256 _btcPrice, uint256 _btcBlockHeight) external onlyOwner {
        btcPrice = _btcPrice;
        btcBlockHeight = _btcBlockHeight;
        
        // Update BTC price in the manual prices mapping
        manualPrices[address(0)] = PriceData({
            price: btcPrice,
            timestamp: block.timestamp,
            isValid: true
        });
        
        emit BtcDataUpdated(btcPrice, btcBlockHeight);
    }
    
    /**
     * @dev Verify a Bitcoin UTXO
     * @param txid Transaction ID
     * @param vout Output index
     * @param btcAddress Bitcoin address
     * @param amount Amount in satoshis
     * @return isValid Whether the UTXO is valid
     */
    function verifyBtcUTXO(
        bytes32 txid, 
        uint256 vout, 
        string calldata btcAddress, 
        uint256 amount
    ) external onlyOwner returns (bool isValid) {
        // Generate UTXO ID
        bytes32 utxoId = keccak256(abi.encodePacked(txid, vout));
        
        // In a real implementation, this would verify the UTXO with a bitcoin node
        // Here we just mark it as valid since Rebar verification was removed
        isValid = true;
        
        // Store verification result
        verifiedUTXOs[utxoId] = UTXOStatus({
            verifiedTimestamp: block.timestamp,
            amount: amount,
            isValid: isValid,
            btcAddress: btcAddress
        });
        
        emit UTXOVerified(utxoId, amount, isValid, btcAddress);
        
        return isValid;
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
        uint256 currentBtcPrice = getBtcPrice();
        return (xbtcAmount * currentBtcPrice) / 1e8; // XBTC has 8 decimals
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
     * @dev Get latest BTC data
     * @return price Current BTC price in USD
     * @return blockHeight Current BTC block height
     */
    function getBtcData() external view returns (
        uint256 price,
        uint256 blockHeight
    ) {
        return (btcPrice, btcBlockHeight);
    }
} 
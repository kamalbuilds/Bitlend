// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./BitLendVault.sol";
import "./BitLendPriceOracle.sol";

/**
 * @title BitLendLiquidator
 * @dev Contract for monitoring and executing liquidations on the BitLend platform
 */
contract BitLendLiquidator is Ownable, ReentrancyGuard {
    // State variables
    BitLendVault public lendingVault;
    BitLendPriceOracle public priceOracle;
    address public xbtcToken;
    address public stablecoin;
    
    // Liquidation threshold (140% - must match the vault's liquidation threshold)
    uint256 public liquidationThreshold = 140;
    
    // Minimum liquidation incentive (in percentage points)
    uint256 public liquidationIncentive = 5; // 5%
    
    // Keeper management
    mapping(address => bool) public authorizedKeepers;
    
    // Tracking successful liquidations
    struct LiquidationEvent {
        address borrower;
        address liquidator;
        uint256 collateralAmount;
        uint256 debtAmount;
        uint256 timestamp;
    }
    
    // History of liquidations
    LiquidationEvent[] public liquidationHistory;
    
    // Events
    event KeeperAdded(address indexed keeper);
    event KeeperRemoved(address indexed keeper);
    event LiquidationExecuted(
        address indexed borrower, 
        address indexed liquidator, 
        uint256 collateralAmount, 
        uint256 debtAmount
    );
    
    /**
     * @dev Constructor to initialize the contract
     * @param _lendingVault Address of the BitLendVault contract
     * @param _priceOracle Address of the BitLendPriceOracle contract
     * @param _xbtcToken Address of the XBTC token contract
     * @param _stablecoin Address of the stablecoin contract
     */
    constructor(
        address _lendingVault,
        address _priceOracle,
        address _xbtcToken,
        address _stablecoin
    ) Ownable(msg.sender) {
        lendingVault = BitLendVault(_lendingVault);
        priceOracle = BitLendPriceOracle(_priceOracle);
        xbtcToken = _xbtcToken;
        stablecoin = _stablecoin;
        
        // Owner is automatically an authorized keeper
        authorizedKeepers[msg.sender] = true;
    }
    
    /**
     * @dev Modifier to restrict function access to authorized keepers or the owner
     */
    modifier onlyKeeperOrOwner() {
        require(authorizedKeepers[msg.sender] || owner() == msg.sender, "Not authorized");
        _;
    }
    
    /**
     * @dev Add a new authorized keeper
     * @param keeper Address of the keeper to add
     */
    function addKeeper(address keeper) external onlyOwner {
        require(keeper != address(0), "Invalid keeper address");
        authorizedKeepers[keeper] = true;
        emit KeeperAdded(keeper);
    }
    
    /**
     * @dev Remove an authorized keeper
     * @param keeper Address of the keeper to remove
     */
    function removeKeeper(address keeper) external onlyOwner {
        require(authorizedKeepers[keeper], "Not a keeper");
        authorizedKeepers[keeper] = false;
        emit KeeperRemoved(keeper);
    }
    
    /**
     * @dev Check if a position is liquidatable
     * @param borrower Address of the borrower to check
     * @return isLiquidatable Whether the position can be liquidated
     * @return healthFactor Current health factor of the position
     * @return collateralAmount Amount of collateral in the position
     * @return debtAmount Amount of debt in the position
     */
    function checkLiquidation(address borrower) public view returns (
        bool isLiquidatable,
        uint256 healthFactor,
        uint256 collateralAmount,
        uint256 debtAmount
    ) {
        // Get position data from vault
        (collateralAmount, debtAmount, healthFactor, ) = lendingVault.getPosition(borrower);
        
        // Check if position is liquidatable
        isLiquidatable = debtAmount > 0 && healthFactor < liquidationThreshold;
        
        return (isLiquidatable, healthFactor, collateralAmount, debtAmount);
    }
    
    /**
     * @dev Liquidate a position
     * @param borrower Address of the borrower to liquidate
     */
    function liquidate(address borrower) external nonReentrant onlyKeeperOrOwner {
        // Check if position is liquidatable
        (bool isLiquidatable, , uint256 collateralAmount, uint256 debtAmount) = checkLiquidation(borrower);
        require(isLiquidatable, "Position not liquidatable");
        
        // Liquidate the position
        lendingVault.liquidate(borrower);
        
        // Record the liquidation
        _recordLiquidation(borrower, msg.sender, collateralAmount, debtAmount);
    }
    
    /**
     * @dev Internal function to record a liquidation
     * @param borrower Address of the borrower
     * @param liquidator Address of the liquidator
     * @param collateralAmount Amount of collateral liquidated
     * @param debtAmount Amount of debt repaid
     */
    function _recordLiquidation(
        address borrower,
        address liquidator,
        uint256 collateralAmount,
        uint256 debtAmount
    ) internal {
        // Record the liquidation
        liquidationHistory.push(LiquidationEvent({
            borrower: borrower,
            liquidator: liquidator,
            collateralAmount: collateralAmount,
            debtAmount: debtAmount,
            timestamp: block.timestamp
        }));
        
        // Emit event
        emit LiquidationExecuted(
            borrower, 
            liquidator, 
            collateralAmount, 
            debtAmount
        );
    }
    
    /**
     * @dev Scan for liquidatable positions
     * @param borrowers Array of borrower addresses to check
     * @return liquidatable Array indicating which borrowers can be liquidated
     * @return healthFactors Array of health factors for each borrower
     * @return collateralAmounts Array of collateral amounts for each borrower
     * @return debtAmounts Array of debt amounts for each borrower
     */
    function scanLiquidations(address[] calldata borrowers) external view returns (
        bool[] memory liquidatable,
        uint256[] memory healthFactors,
        uint256[] memory collateralAmounts,
        uint256[] memory debtAmounts
    ) {
        liquidatable = new bool[](borrowers.length);
        healthFactors = new uint256[](borrowers.length);
        collateralAmounts = new uint256[](borrowers.length);
        debtAmounts = new uint256[](borrowers.length);
        
        for (uint256 i = 0; i < borrowers.length; i++) {
            (liquidatable[i], healthFactors[i], collateralAmounts[i], debtAmounts[i]) = checkLiquidation(borrowers[i]);
        }
        
        return (liquidatable, healthFactors, collateralAmounts, debtAmounts);
    }
    
    /**
     * @dev Get liquidation history length
     * @return count Number of liquidation events
     */
    function getLiquidationHistoryLength() external view returns (uint256) {
        return liquidationHistory.length;
    }
    
    /**
     * @dev Get liquidation statistics
     * @return totalLiquidations Total number of liquidations
     * @return totalCollateralLiquidated Total collateral liquidated
     * @return totalDebtRecovered Total debt recovered
     */
    function getLiquidationStats() external view returns (
        uint256 totalLiquidations,
        uint256 totalCollateralLiquidated,
        uint256 totalDebtRecovered
    ) {
        totalLiquidations = liquidationHistory.length;
        totalCollateralLiquidated = 0;
        totalDebtRecovered = 0;
        
        for (uint256 i = 0; i < liquidationHistory.length; i++) {
            LiquidationEvent memory event_ = liquidationHistory[i];
            totalCollateralLiquidated += event_.collateralAmount;
            totalDebtRecovered += event_.debtAmount;
        }
        
        return (
            totalLiquidations, 
            totalCollateralLiquidated, 
            totalDebtRecovered
        );
    }
} 
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./BitLendVault.sol";
import "./BitLendPriceOracle.sol";

/**
 * @title BitLendLiquidator
 * @dev Contract for monitoring and executing liquidations on the BitLend platform
 * This contract integrates with Rebar Data for MEV protection on liquidations
 */
contract BitLendLiquidator is Ownable, ReentrancyGuard {
    // State variables
    BitLendVault public lendingVault;
    BitLendPriceOracle public priceOracle;
    address public xbtcToken;
    address public stablecoin;
    address public rebarShieldConnector;
    
    // Liquidation threshold (140% - must match the vault's liquidation threshold)
    uint256 public liquidationThreshold = 140;
    
    // Minimum liquidation incentive (in percentage points)
    uint256 public liquidationIncentive = 5; // 5%
    
    // Keeper management
    mapping(address => bool) public authorizedKeepers;
    
    // MEV protection parameters
    bool public rebarShieldEnabled = true;
    uint256 public rebarBundlePriority = 3; // 1-5, with 5 being highest priority
    
    // Tracking successful liquidations
    struct LiquidationEvent {
        address borrower;
        address liquidator;
        uint256 collateralAmount;
        uint256 debtAmount;
        uint256 timestamp;
        bool usedRebarShield;
    }
    
    LiquidationEvent[] public liquidationHistory;
    
    // Events
    event KeeperAdded(address indexed keeper);
    event KeeperRemoved(address indexed keeper);
    event LiquidationExecuted(address indexed borrower, address indexed liquidator, uint256 collateralAmount, uint256 debtAmount, bool usedRebarShield);
    event RebarShieldStatusUpdated(bool enabled);
    event RebarShieldConnectorUpdated(address oldConnector, address newConnector);
    event RebarBundlePriorityUpdated(uint256 oldPriority, uint256 newPriority);
    
    /**
     * @dev Constructor to initialize the contract
     * @param _lendingVault Address of the BitLendVault contract
     * @param _priceOracle Address of the BitLendPriceOracle contract
     * @param _xbtcToken Address of the XBTC token contract
     * @param _stablecoin Address of the stablecoin contract
     * @param _rebarShieldConnector Address of the Rebar Shield connector
     */
    constructor(
        address _lendingVault,
        address _priceOracle,
        address _xbtcToken,
        address _stablecoin,
        address _rebarShieldConnector
    ) Ownable(msg.sender) {
        lendingVault = BitLendVault(_lendingVault);
        priceOracle = BitLendPriceOracle(_priceOracle);
        xbtcToken = _xbtcToken;
        stablecoin = _stablecoin;
        rebarShieldConnector = _rebarShieldConnector;
        
        // Owner is automatically an authorized keeper
        authorizedKeepers[msg.sender] = true;
    }
    
    /**
     * @dev Interface for Rebar Shield connector
     */
    interface IRebarShieldConnector {
        function sendLiquidationBundle(
            address vault,
            address borrower,
            address liquidator,
            uint256 priority
        ) external returns (bytes32 bundleId);
        
        function getBundleStatus(bytes32 bundleId) external view returns (
            uint8 status, // 0=pending, 1=included, 2=failed
            uint256 blockNumber,
            uint256 gasPrice
        );
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
     * @dev Update the Rebar Shield connector address
     * @param _rebarShieldConnector New connector address
     */
    function updateRebarShieldConnector(address _rebarShieldConnector) external onlyOwner {
        address oldConnector = rebarShieldConnector;
        rebarShieldConnector = _rebarShieldConnector;
        emit RebarShieldConnectorUpdated(oldConnector, _rebarShieldConnector);
    }
    
    /**
     * @dev Enable or disable Rebar Shield integration
     * @param _enabled Whether Rebar Shield should be enabled
     */
    function setRebarShieldEnabled(bool _enabled) external onlyOwner {
        rebarShieldEnabled = _enabled;
        emit RebarShieldStatusUpdated(_enabled);
    }
    
    /**
     * @dev Update the Rebar bundle priority
     * @param _priority New priority (1-5)
     */
    function setRebarBundlePriority(uint256 _priority) external onlyOwner {
        require(_priority >= 1 && _priority <= 5, "Priority must be 1-5");
        uint256 oldPriority = rebarBundlePriority;
        rebarBundlePriority = _priority;
        emit RebarBundlePriorityUpdated(oldPriority, _priority);
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
     * @dev Liquidate a position directly
     * @param borrower Address of the borrower to liquidate
     */
    function liquidate(address borrower) external nonReentrant onlyKeeperOrOwner {
        // Check if position is liquidatable
        (bool isLiquidatable, , , ) = checkLiquidation(borrower);
        require(isLiquidatable, "Position not liquidatable");
        
        // Liquidate the position
        _executeLiquidation(borrower, msg.sender, false);
    }
    
    /**
     * @dev Liquidate a position using Rebar Shield for MEV protection
     * @param borrower Address of the borrower to liquidate
     */
    function liquidateWithRebarShield(address borrower) external nonReentrant onlyKeeperOrOwner {
        require(rebarShieldEnabled, "Rebar Shield disabled");
        require(rebarShieldConnector != address(0), "Rebar Shield not configured");
        
        // Check if position is liquidatable
        (bool isLiquidatable, , , ) = checkLiquidation(borrower);
        require(isLiquidatable, "Position not liquidatable");
        
        // Send the liquidation through Rebar Shield
        IRebarShieldConnector connector = IRebarShieldConnector(rebarShieldConnector);
        bytes32 bundleId = connector.sendLiquidationBundle(
            address(lendingVault),
            borrower,
            msg.sender,
            rebarBundlePriority
        );
        
        // Execute the liquidation - Rebar will handle it via a private mempool
        _executeLiquidation(borrower, msg.sender, true);
    }
    
    /**
     * @dev Internal function to execute a liquidation
     * @param borrower Address of the borrower to liquidate
     * @param liquidator Address of the liquidator
     * @param usedRebarShield Whether Rebar Shield was used for the liquidation
     */
    function _executeLiquidation(address borrower, address liquidator, bool usedRebarShield) internal {
        // Get position information
        (bool isLiquidatable, , uint256 collateralAmount, uint256 debtAmount) = checkLiquidation(borrower);
        require(isLiquidatable, "Position not liquidatable");
        
        // Call the vault's liquidate function
        lendingVault.liquidate(borrower);
        
        // Record the liquidation
        liquidationHistory.push(LiquidationEvent({
            borrower: borrower,
            liquidator: liquidator,
            collateralAmount: collateralAmount,
            debtAmount: debtAmount,
            timestamp: block.timestamp,
            usedRebarShield: usedRebarShield
        }));
        
        // Emit event
        emit LiquidationExecuted(borrower, liquidator, collateralAmount, debtAmount, usedRebarShield);
    }
    
    /**
     * @dev Scan for liquidatable positions
     * @param borrowers Array of borrower addresses to check
     * @return liquidatable Array indicating which borrowers can be liquidated
     * @return healthFactors Array of health factors for each borrower
     */
    function scanLiquidations(address[] calldata borrowers) external view returns (bool[] memory liquidatable, uint256[] memory healthFactors) {
        liquidatable = new bool[](borrowers.length);
        healthFactors = new uint256[](borrowers.length);
        
        for (uint256 i = 0; i < borrowers.length; i++) {
            (liquidatable[i], healthFactors[i], , ) = checkLiquidation(borrowers[i]);
        }
        
        return (liquidatable, healthFactors);
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
     * @return rebarShieldLiquidations Number of liquidations using Rebar Shield
     */
    function getLiquidationStats() external view returns (
        uint256 totalLiquidations,
        uint256 totalCollateralLiquidated,
        uint256 totalDebtRecovered,
        uint256 rebarShieldLiquidations
    ) {
        totalLiquidations = liquidationHistory.length;
        totalCollateralLiquidated = 0;
        totalDebtRecovered = 0;
        rebarShieldLiquidations = 0;
        
        for (uint256 i = 0; i < liquidationHistory.length; i++) {
            LiquidationEvent memory event_ = liquidationHistory[i];
            totalCollateralLiquidated += event_.collateralAmount;
            totalDebtRecovered += event_.debtAmount;
            if (event_.usedRebarShield) {
                rebarShieldLiquidations++;
            }
        }
        
        return (totalLiquidations, totalCollateralLiquidated, totalDebtRecovered, rebarShieldLiquidations);
    }
} 
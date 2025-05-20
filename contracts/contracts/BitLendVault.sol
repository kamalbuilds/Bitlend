// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./BitLendPriceOracle.sol";
import "./BitLendProofOfReserves.sol";
import "./BitLendBridge.sol";

/**
 * @title BitLendVault
 * @dev Core lending contract for the BitLend protocol.
 * This contract manages deposits, withdrawals, borrowing, and repayments.
 * It uses XBTC as collateral and allows users to borrow stablecoins or XSAT.
 */
contract BitLendVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Math for uint256;

    // Structs
    struct LoanPosition {
        uint256 collateralAmount;        // Amount of XBTC collateral
        uint256 borrowedAmount;          // Amount of stablecoin borrowed
        uint256 lastInterestTime;        // Timestamp of last interest calculation
        bytes btcScriptPubKey;           // Bitcoin scriptPubKey for UTXO verification
        bool verified;                   // Whether the collateral has been verified
    }

    // Constants
    uint256 public constant COLLATERAL_RATIO_PRECISION = 100;
    uint256 public constant INTEREST_RATE_PRECISION = 10000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    uint256 public constant LIQUIDATION_THRESHOLD = 140;  // 140% (scaled by 100)
    uint256 public constant BORROW_THRESHOLD = 175;       // 175% (scaled by 100)
    uint256 public constant INTEREST_RATE = 5;            // 5% annual interest rate (scaled by 100)
    uint256 public constant VERIFICATION_INTERVAL = 3600; // 1 hour between collateral verifications

    // State variables
    IERC20 public xbtcToken;                   // XBTC token (mainnet: 0x4aa4365da82ACD46e378A6f3c92a863f3e763d34)
    IERC20 public stablecoin;                  // Stablecoin (e.g., USDC)
    BitLendPriceOracle public oracle;          // Price oracle
    BitLendProofOfReserves public proofOfReserves; // Proof of reserves contract
    BitLendBridge public bridge;               // BitLend bridge contract
    
    uint256 public totalXbtcCollateral;        // Total XBTC collateral in the vault
    uint256 public totalBorrowed;              // Total stablecoin borrowed
    
    // Addresses requiring verification
    mapping(address => uint256) public lastVerificationTime;
    
    // Mapping from user address to their loan position
    mapping(address => LoanPosition) public positions;

    // Events
    event Deposit(address indexed user, uint256 amount, bytes btcScriptPubKey);
    event Withdraw(address indexed user, uint256 amount);
    event Borrow(address indexed user, uint256 amount);
    event Repay(address indexed user, uint256 amount);
    event Liquidated(address indexed user, uint256 collateralAmount, uint256 debtAmount, address liquidator);
    event CollateralVerified(address indexed user, bool isVerified, uint256 verifiedAmount);
    event DepositAddressRegistered(address indexed user, string btcAddress);
    event DirectBtcDeposit(address indexed user, uint256 btcAmount, uint256 xbtcAmount, bytes btcScriptPubKey);
    event WithdrawToBTC(address indexed user, uint256 xbtcAmount, string btcAddress, string gasLevel);
    event ContractAddressesUpdated(address indexed xbtcToken, address indexed stablecoin, address indexed oracle);
    event BridgeAddressUpdated(address indexed oldBridge, address indexed newBridge);
    event ProofOfReservesAddressUpdated(address indexed oldProofOfReserves, address indexed newProofOfReserves);

    /**
     * @dev Constructor to initialize the vault with required addresses
     * @param _xbtcToken Address of the XBTC token
     * @param _stablecoin Address of the stablecoin (e.g., USDC)
     * @param _oracle Address of the price oracle
     * @param _proofOfReserves Address of the proof of reserves contract
     * @param _bridge Address of the BitLend bridge contract
     */
    constructor(
        address _xbtcToken,
        address _stablecoin,
        address _oracle,
        address _proofOfReserves,
        address _bridge
    ) Ownable(msg.sender) {
        require(_xbtcToken != address(0), "XBTC token cannot be zero address");
        require(_stablecoin != address(0), "Stablecoin cannot be zero address");
        require(_oracle != address(0), "Price oracle cannot be zero address");
        require(_proofOfReserves != address(0), "Proof of reserves contract cannot be zero address");
        require(_bridge != address(0), "Bridge contract cannot be zero address");

        xbtcToken = IERC20(_xbtcToken);
        stablecoin = IERC20(_stablecoin);
        oracle = BitLendPriceOracle(_oracle);
        proofOfReserves = BitLendProofOfReserves(_proofOfReserves);
        bridge = BitLendBridge(_bridge);
        
        emit ContractAddressesUpdated(_xbtcToken, _stablecoin, _oracle);
        emit BridgeAddressUpdated(address(0), _bridge);
        emit ProofOfReservesAddressUpdated(address(0), _proofOfReserves);
    }

    /**
     * @dev Register a Bitcoin deposit address for a user
     * This allows users to directly deposit BTC to get XBTC in the protocol
     * @param btcAddress Bitcoin address assigned to the user
     */
    function registerBtcDepositAddress(string calldata btcAddress) external {
        require(bytes(btcAddress).length > 0, "Invalid BTC address");
        
        // In production, this would get a new BTC deposit address from the bridge
        // For hackathon purposes, we're simulating this with bridge.registerBtcAddress
        bridge.registerBtcAddress(msg.sender, btcAddress);
        
        emit DepositAddressRegistered(msg.sender, btcAddress);
    }
    
    /**
     * @dev Process a direct BTC deposit (called when XBTC is received via the bridge)
     * This is called by the admin/owner after BTC deposit is confirmed and XBTC is minted
     * @param user Address of the user who deposited BTC
     * @param btcAmount Amount of BTC deposited (in satoshis)
     * @param xbtcAmount Amount of XBTC received
     * @param btcScriptPubKey Bitcoin scriptPubKey for UTXO verification
     */
    function processDirectBtcDeposit(
        address user,
        uint256 btcAmount,
        uint256 xbtcAmount,
        bytes calldata btcScriptPubKey
    ) external onlyOwner {
        require(user != address(0), "Invalid user address");
        require(xbtcAmount > 0, "Amount must be greater than 0");
        require(btcScriptPubKey.length > 0, "Invalid scriptPubKey");
        
        // Transfer XBTC from bridge/owner to vault
        xbtcToken.safeTransferFrom(msg.sender, address(this), xbtcAmount);
        
        // Update user's position
        LoanPosition storage position = positions[user];
        
        // If this is a new position, store the scriptPubKey
        if (position.collateralAmount == 0) {
            position.btcScriptPubKey = btcScriptPubKey;
            position.lastInterestTime = block.timestamp;
        }
        
        // Add collateral to position
        position.collateralAmount += xbtcAmount;
        totalXbtcCollateral += xbtcAmount;
        
        // Register or update in the proof of reserves system
        if (keccak256(position.btcScriptPubKey) == keccak256(btcScriptPubKey)) {
            proofOfReserves.updateDepositor(user, btcScriptPubKey, position.collateralAmount);
        } else {
            proofOfReserves.registerDepositor(user, btcScriptPubKey, position.collateralAmount);
        }
        
        emit DirectBtcDeposit(user, btcAmount, xbtcAmount, btcScriptPubKey);
    }

    /**
     * @dev Deposit XBTC as collateral
     * @param amount Amount of XBTC to deposit
     * @param btcScriptPubKey Bitcoin scriptPubKey for UTXO verification
     */
    function deposit(uint256 amount, bytes calldata btcScriptPubKey) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(btcScriptPubKey.length > 0, "Invalid scriptPubKey");

        // Transfer XBTC from user to vault
        xbtcToken.safeTransferFrom(msg.sender, address(this), amount);

        // Update user's position
        LoanPosition storage position = positions[msg.sender];
        
        // If this is a new position, store the scriptPubKey
        if (position.collateralAmount == 0) {
            position.btcScriptPubKey = btcScriptPubKey;
            position.lastInterestTime = block.timestamp;
        }
        
        // Add collateral to position
        position.collateralAmount += amount;
        totalXbtcCollateral += amount;

        // Register or update in the proof of reserves system
        if (position.collateralAmount > 0) {
            if (keccak256(position.btcScriptPubKey) == keccak256(btcScriptPubKey)) {
                proofOfReserves.updateDepositor(msg.sender, btcScriptPubKey, position.collateralAmount);
            } else {
                proofOfReserves.registerDepositor(msg.sender, btcScriptPubKey, position.collateralAmount);
            }
        }
        
        emit Deposit(msg.sender, amount, btcScriptPubKey);
    }

    /**
     * @dev Request verification of a user's collateral
     * This triggers the off-chain verification process through the Oracle
     * @param user Address of the user to verify
     */
    function requestVerification(address user) external {
        LoanPosition storage position = positions[user];
        require(position.collateralAmount > 0, "No collateral to verify");
        require(block.timestamp - lastVerificationTime[user] >= VERIFICATION_INTERVAL, "Verification too frequent");
        
        lastVerificationTime[user] = block.timestamp;
        
        // Emit verification request event - the Oracle should monitor these events
        emit CollateralVerified(user, false, 0);
    }

    /**
     * @dev Verify collateral by checking UTXOs
     * @param user Address of the user to verify
     * @return isVerified Whether the collateral is verified
     */
    function verifyCollateral(address user) public returns (bool isVerified) {
        LoanPosition storage position = positions[user];
        require(position.collateralAmount > 0, "No collateral to verify");
        
        (bool verified, uint256 verifiedAmount) = proofOfReserves.verifyUTXO(position.btcScriptPubKey);
        
        position.verified = verified;
        
        emit CollateralVerified(user, verified, verifiedAmount);
        
        return verified;
    }

    /**
     * @dev Withdraw XBTC collateral
     * @param amount Amount of XBTC to withdraw
     */
    function withdraw(uint256 amount) external nonReentrant {
        LoanPosition storage position = positions[msg.sender];
        require(amount > 0, "Amount must be greater than 0");
        require(position.collateralAmount >= amount, "Insufficient collateral");

        // Calculate current health factor
        uint256 healthFactor = _calculateHealthFactor(msg.sender);
        
        // Calculate new health factor after withdrawal
        uint256 newCollateralValue = oracle.getXbtcUsdValue(position.collateralAmount - amount);
        uint256 newHealthFactor = position.borrowedAmount > 0 
            ? (newCollateralValue * 100) / position.borrowedAmount 
            : type(uint256).max;
        
        // Check if withdrawal would bring health factor below liquidation threshold
        require(
            position.borrowedAmount == 0 || newHealthFactor >= LIQUIDATION_THRESHOLD,
            "Withdrawal would risk liquidation"
        );
        
        // Update state
        position.collateralAmount -= amount;
        totalXbtcCollateral -= amount;
        
        // Update proof of reserves
        proofOfReserves.updateDepositor(msg.sender, position.btcScriptPubKey, position.collateralAmount);
        
        // Transfer XBTC back to user
        xbtcToken.safeTransfer(msg.sender, amount);
        
        emit Withdraw(msg.sender, amount);
    }

    /**
     * @dev Withdraw XBTC as BTC through the bridge
     * @param amount Amount of XBTC to withdraw
     * @param btcAddress Bitcoin address to receive the BTC
     * @param gasLevel Gas level for Bitcoin transaction ("slow" or "fast")
     */
    function withdrawToBTC(uint256 amount, string calldata btcAddress, string calldata gasLevel) external nonReentrant {
        require(bytes(btcAddress).length > 0, "Invalid BTC address");
        require(
            keccak256(abi.encodePacked(gasLevel)) == keccak256(abi.encodePacked("slow")) || 
            keccak256(abi.encodePacked(gasLevel)) == keccak256(abi.encodePacked("fast")), 
            "Gas level must be 'slow' or 'fast'"
        );
        
        LoanPosition storage position = positions[msg.sender];
        require(amount > 0, "Amount must be greater than 0");
        require(position.collateralAmount >= amount, "Insufficient collateral");

        // Calculate current health factor
        uint256 healthFactor = _calculateHealthFactor(msg.sender);
        
        // Calculate new health factor after withdrawal
        uint256 newCollateralValue = oracle.getXbtcUsdValue(position.collateralAmount - amount);
        uint256 newHealthFactor = position.borrowedAmount > 0 
            ? (newCollateralValue * 100) / position.borrowedAmount 
            : type(uint256).max;
        
        // Check if withdrawal would bring health factor below liquidation threshold
        require(
            position.borrowedAmount == 0 || newHealthFactor >= LIQUIDATION_THRESHOLD,
            "Withdrawal would risk liquidation"
        );
        
        // Update state
        position.collateralAmount -= amount;
        totalXbtcCollateral -= amount;
        
        // Update proof of reserves
        proofOfReserves.updateDepositor(msg.sender, position.btcScriptPubKey, position.collateralAmount);
        
        // Transfer XBTC to user first
        xbtcToken.safeTransfer(msg.sender, amount);
        
        // Then initiate bridge withdrawal (user needs to approve bridge to spend their XBTC)
        // bridge.withdraw(amount, btcAddress, gasLevel) should be called by the user
        
        emit WithdrawToBTC(msg.sender, amount, btcAddress, gasLevel);
    }

    /**
     * @dev Borrow stablecoin against XBTC collateral
     * @param amount Amount of stablecoin to borrow
     */
    function borrow(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        
        LoanPosition storage position = positions[msg.sender];
        require(position.collateralAmount > 0, "No collateral deposited");
        
        // Check if position is verified or attempt to verify it
        if (!position.verified) {
            verifyCollateral(msg.sender);
            require(position.verified, "Collateral not verified");
        }
        
        // Update interest accrued
        _accrueInterest(msg.sender);
        
        // Calculate maximum borrow amount based on collateral
        uint256 collateralValue = oracle.getXbtcUsdValue(position.collateralAmount);
        uint256 maxBorrowAmount = (collateralValue * 100) / BORROW_THRESHOLD;
        
        // Check if borrow amount is within limit
        require(position.borrowedAmount + amount <= maxBorrowAmount, "Borrow would exceed allowed limit");
        
        // Update state
        position.borrowedAmount += amount;
        totalBorrowed += amount;
        
        // Transfer stablecoin to user
        stablecoin.safeTransfer(msg.sender, amount);
        
        emit Borrow(msg.sender, amount);
    }

    /**
     * @dev Repay borrowed stablecoin
     * @param amount Amount of stablecoin to repay
     */
    function repay(uint256 amount) external nonReentrant {
        LoanPosition storage position = positions[msg.sender];
        require(amount > 0, "Amount must be greater than 0");
        require(position.borrowedAmount > 0, "No outstanding debt");
        
        // Accrue interest before repayment
        _accrueInterest(msg.sender);
        
        // Calculate actual repayment amount (limited to outstanding debt)
        uint256 repayAmount = amount > position.borrowedAmount ? position.borrowedAmount : amount;
        
        // Transfer stablecoin from user to vault
        stablecoin.safeTransferFrom(msg.sender, address(this), repayAmount);
        
        // Update state
        position.borrowedAmount -= repayAmount;
        totalBorrowed -= repayAmount;
        
        emit Repay(msg.sender, repayAmount);
    }

    /**
     * @dev Liquidate an undercollateralized position
     * @param user Address of the user to liquidate
     */
    function liquidate(address user) external nonReentrant {
        LoanPosition storage position = positions[user];
        require(position.borrowedAmount > 0, "No debt to liquidate");
        
        // Calculate health factor
        uint256 healthFactor = _calculateHealthFactor(user);
        
        // Check if position is below liquidation threshold
        require(healthFactor < LIQUIDATION_THRESHOLD, "Position not liquidatable");
        
        // Calculate liquidation values
        uint256 debtToRecover = position.borrowedAmount;
        uint256 collateralToLiquidate = position.collateralAmount;
        
        // Transfer debt from liquidator to vault
        stablecoin.safeTransferFrom(msg.sender, address(this), debtToRecover);
        
        // Transfer collateral to liquidator
        xbtcToken.safeTransfer(msg.sender, collateralToLiquidate);
        
        // Update state
        totalXbtcCollateral -= collateralToLiquidate;
        totalBorrowed -= debtToRecover;
        
        // Clear the liquidated position
        delete positions[user];
        
        emit Liquidated(user, collateralToLiquidate, debtToRecover, msg.sender);
    }

    /**
     * @dev Update the contract addresses
     * @param _bridge New bridge contract address
     * @param _proofOfReserves New proof of reserves contract address
     */
    function updateContractAddresses(
        address _bridge,
        address _proofOfReserves
    ) external onlyOwner {
        if (_bridge != address(0)) {
            address oldBridge = address(bridge);
            bridge = BitLendBridge(_bridge);
            emit BridgeAddressUpdated(oldBridge, _bridge);
        }
        
        if (_proofOfReserves != address(0)) {
            address oldProofOfReserves = address(proofOfReserves);
            proofOfReserves = BitLendProofOfReserves(_proofOfReserves);
            emit ProofOfReservesAddressUpdated(oldProofOfReserves, _proofOfReserves);
        }
    }

    /**
     * @dev Calculate the health factor of a position
     * Health factor = (collateral value in USD / borrowed amount) * 100
     * @param user Address of the user
     * @return Health factor scaled by 100 (e.g., 150 = 150%)
     */
    function getHealthFactor(address user) external view returns (uint256) {
        return _calculateHealthFactor(user);
    }

    /**
     * @dev Get loan position details
     * @param user Address of the user
     * @return collateralAmount Amount of XBTC collateral
     * @return borrowedAmount Amount of stablecoin borrowed
     * @return healthFactor Health factor of the position
     * @return isVerified Whether the collateral is verified
     */
    function getPosition(address user) external view returns (
        uint256 collateralAmount,
        uint256 borrowedAmount,
        uint256 healthFactor,
        bool isVerified
    ) {
        LoanPosition storage position = positions[user];
        return (
            position.collateralAmount,
            position.borrowedAmount,
            _calculateHealthFactor(user),
            position.verified
        );
    }

    /**
     * @dev Get maximum borrow amount based on current collateral
     * @param user Address of the user
     * @return maxBorrowAmount Maximum amount of stablecoin that can be borrowed
     */
    function getMaxBorrowAmount(address user) external view returns (uint256) {
        LoanPosition storage position = positions[user];
        if (position.collateralAmount == 0) return 0;
        
        uint256 collateralValue = oracle.getXbtcUsdValue(position.collateralAmount);
        uint256 maxBorrowAmount = (collateralValue * 100) / BORROW_THRESHOLD;
        
        return position.borrowedAmount >= maxBorrowAmount ? 0 : maxBorrowAmount - position.borrowedAmount;
    }

    /**
     * @dev Internal function to calculate health factor
     * @param user Address of the user
     * @return Health factor scaled by 100
     */
    function _calculateHealthFactor(address user) internal view returns (uint256) {
        LoanPosition storage position = positions[user];
        if (position.borrowedAmount == 0) return type(uint256).max; // Max value if no debt
        
        uint256 collateralValue = oracle.getXbtcUsdValue(position.collateralAmount);
        return (collateralValue * 100) / position.borrowedAmount;
    }

    /**
     * @dev Internal function to accrue interest on borrowed amount
     * @param user Address of the user
     */
    function _accrueInterest(address user) internal {
        LoanPosition storage position = positions[user];
        if (position.borrowedAmount == 0) return;
        
        uint256 timeElapsed = block.timestamp - position.lastInterestTime;
        if (timeElapsed == 0) return;
        
        // Calculate interest: principal * rate * time
        uint256 interest = (position.borrowedAmount * INTEREST_RATE * timeElapsed) / (SECONDS_PER_YEAR * 100);
        
        // Update borrowed amount with accrued interest
        position.borrowedAmount += interest;
        totalBorrowed += interest;
        
        // Update last interest time
        position.lastInterestTime = block.timestamp;
    }
} 
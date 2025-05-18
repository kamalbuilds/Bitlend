// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title BitLendBridge
 * @dev Interface for exSat's native bridge to convert BTC to XBTC and vice versa.
 * This contract integrates directly with exSat's bridge for secure asset transfer.
 */
contract BitLendBridge is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // XBTC token on exSat network
    IERC20 public xbtcToken;
    
    // exSat bridge address
    address public exsatBridge;
    
    // Required confirmations for Bitcoin transactions
    uint256 public requiredBtcConfirmations = 6;
    
    // Withdrawal fee (in basis points, 10000 = 100%)
    uint256 public withdrawalFeeBps = 10; // 0.1%
    
    // Address to collect fees
    address public feeCollector;
    
    // Mapping to track pending deposits
    mapping(bytes32 => PendingDeposit) public pendingDeposits;
    
    // Mapping to track pending withdrawals
    mapping(bytes32 => PendingWithdrawal) public pendingWithdrawals;
    
    // Structs for pending operations
    struct PendingDeposit {
        address user;
        uint256 amount;
        uint256 timestamp;
        bool processed;
    }
    
    struct PendingWithdrawal {
        address user;
        uint256 amount;
        string btcAddress;
        uint256 timestamp;
        bool processed;
    }
    
    // Events
    event DepositInitiated(address indexed user, bytes32 indexed depositId, uint256 amount);
    event DepositProcessed(address indexed user, bytes32 indexed depositId, uint256 amount);
    event WithdrawalInitiated(address indexed user, bytes32 indexed withdrawalId, uint256 amount, string btcAddress);
    event WithdrawalProcessed(address indexed user, bytes32 indexed withdrawalId, uint256 amount, string btcAddress);
    event BridgeAddressUpdated(address indexed oldBridge, address indexed newBridge);
    event RequiredConfirmationsUpdated(uint256 oldConfirmations, uint256 newConfirmations);
    event WithdrawalFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event FeeCollectorUpdated(address indexed oldCollector, address indexed newCollector);
    
    /**
     * @dev Interface for exSat's bridge contract
     * Based on the actual exSat bridge implementation
     */
    interface IExSatBridge {
        enum Operation { Nop, Mint, Burn, CrosschainRequest, CrosschainConfirm }
        enum Status { Unused, Pending, Confirmed, Canceled }
        
        struct Request {
            Operation op;
            Status status;
            uint128 nonce;
            bytes32 srcChain;
            bytes srcAddress;
            bytes32 dstChain;
            bytes dstAddress;
            uint256 amount;
            uint256 fee;
            bytes extra;
        }

        // Request XBTC issuance by providing BTC
        function deposit(address recipient) external payable returns (bytes32);
        
        // Request BTC withdrawal by burning XBTC
        function withdraw(uint256 amount, string calldata btcAddress) external returns (bytes32);
        
        // Check if a BTC deposit has been completed
        function getDepositStatus(bytes32 depositId) external view returns (uint8 status, uint256 confirmations);
        
        // Check if a BTC withdrawal has been completed
        function getWithdrawalStatus(bytes32 withdrawalId) external view returns (uint8 status, uint256 confirmations);
        
        // Get request details by hash
        function getRequestByHash(bytes32 requestHash) external view returns (Request memory);
        
        // Check if a deposit transaction has been used
        function usedDepositTxs(bytes32 txKey) external view returns (bytes32);
        
        // Check if a withdrawal transaction has been used
        function usedWithdrawalTxs(bytes32 txKey) external view returns (bytes32);
    }
    
    /**
     * @dev Constructor initializes the bridge with required addresses
     * @param _xbtcToken XBTC token address
     * @param _exsatBridge exSat bridge contract address
     * @param _feeCollector Address to collect fees
     */
    constructor(
        address _xbtcToken,
        address _exsatBridge,
        address _feeCollector
    ) Ownable(msg.sender) {
        require(_xbtcToken != address(0), "XBTC token cannot be zero address");
        require(_exsatBridge != address(0), "exSat bridge cannot be zero address");
        require(_feeCollector != address(0), "Fee collector cannot be zero address");
        
        xbtcToken = IERC20(_xbtcToken);
        exsatBridge = _exsatBridge;
        feeCollector = _feeCollector;
    }
    
    /**
     * @dev Deposit BTC to receive XBTC
     * This forwards the ETH value to exSat's bridge contract
     * @return depositId Unique identifier for tracking the deposit
     */
    function deposit() external payable nonReentrant returns (bytes32) {
        require(msg.value > 0, "Amount must be greater than 0");
        
        // Generate deposit ID based on user, amount, and timestamp
        bytes32 depositId = keccak256(abi.encodePacked(msg.sender, msg.value, block.timestamp));
        
        // Store pending deposit information
        pendingDeposits[depositId] = PendingDeposit({
            user: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp,
            processed: false
        });
        
        // Call exSat bridge to process the deposit
        IExSatBridge bridge = IExSatBridge(exsatBridge);
        bytes32 bridgeDepositId = bridge.deposit{value: msg.value}(address(this));
        
        emit DepositInitiated(msg.sender, depositId, msg.value);
        
        return depositId;
    }
    
    /**
     * @dev Process a completed deposit
     * @param depositId ID of the deposit to process
     * @return success Whether the processing was successful
     */
    function processDeposit(bytes32 depositId) external nonReentrant returns (bool) {
        PendingDeposit storage pendingDeposit = pendingDeposits[depositId];
        require(pendingDeposit.user != address(0), "Deposit not found");
        require(!pendingDeposit.processed, "Deposit already processed");
        
        // Check deposit status
        IExSatBridge bridge = IExSatBridge(exsatBridge);
        (uint8 status, uint256 confirmations) = bridge.getDepositStatus(depositId);
        
        // Require confirmed status (Status.Confirmed = 2)
        require(status == 2, "Deposit not confirmed"); // 2 = Confirmed
        require(confirmations >= requiredBtcConfirmations, "Insufficient confirmations");
        
        // Mark as processed
        pendingDeposit.processed = true;
        
        // Transfer XBTC to the user
        // Note: In a real implementation, the XBTC would have been received by this contract from the bridge
        // For now, we assume the XBTC is already in this contract
        uint256 amount = pendingDeposit.amount; // In a real implementation, this would be the converted amount
        xbtcToken.safeTransfer(pendingDeposit.user, amount);
        
        emit DepositProcessed(pendingDeposit.user, depositId, amount);
        
        return true;
    }
    
    /**
     * @dev Withdraw XBTC to receive BTC
     * @param amount Amount of XBTC to withdraw
     * @param btcAddress Bitcoin address to receive BTC
     * @return withdrawalId Unique identifier for tracking the withdrawal
     */
    function withdraw(uint256 amount, string calldata btcAddress) external nonReentrant returns (bytes32) {
        require(amount > 0, "Amount must be greater than 0");
        require(bytes(btcAddress).length > 0, "Invalid BTC address");
        
        // Calculate fee amount
        uint256 feeAmount = (amount * withdrawalFeeBps) / 10000;
        uint256 netAmount = amount - feeAmount;
        
        // Transfer XBTC from user to this contract
        xbtcToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Transfer fee to fee collector
        if (feeAmount > 0) {
            xbtcToken.safeTransfer(feeCollector, feeAmount);
        }
        
        // Generate withdrawal ID
        bytes32 withdrawalId = keccak256(abi.encodePacked(msg.sender, amount, btcAddress, block.timestamp));
        
        // Store pending withdrawal information
        pendingWithdrawals[withdrawalId] = PendingWithdrawal({
            user: msg.sender,
            amount: netAmount,
            btcAddress: btcAddress,
            timestamp: block.timestamp,
            processed: false
        });
        
        // Approve the exSat bridge to spend the XBTC
        xbtcToken.safeApprove(exsatBridge, netAmount);
        
        // Call exSat bridge to process the withdrawal
        IExSatBridge bridge = IExSatBridge(exsatBridge);
        bytes32 bridgeWithdrawalId = bridge.withdraw(netAmount, btcAddress);
        
        emit WithdrawalInitiated(msg.sender, withdrawalId, netAmount, btcAddress);
        
        return withdrawalId;
    }
    
    /**
     * @dev Process a completed withdrawal
     * @param withdrawalId ID of the withdrawal to process
     * @return success Whether the processing was successful
     */
    function processWithdrawal(bytes32 withdrawalId) external nonReentrant returns (bool) {
        PendingWithdrawal storage pendingWithdrawal = pendingWithdrawals[withdrawalId];
        require(pendingWithdrawal.user != address(0), "Withdrawal not found");
        require(!pendingWithdrawal.processed, "Withdrawal already processed");
        
        // Check withdrawal status
        IExSatBridge bridge = IExSatBridge(exsatBridge);
        (uint8 status, uint256 confirmations) = bridge.getWithdrawalStatus(withdrawalId);
        
        // Require confirmed status (Status.Confirmed = 2)
        require(status == 2, "Withdrawal not confirmed"); // 2 = Confirmed 
        require(confirmations >= requiredBtcConfirmations, "Insufficient confirmations");
        
        // Mark as processed
        pendingWithdrawal.processed = true;
        
        emit WithdrawalProcessed(
            pendingWithdrawal.user,
            withdrawalId,
            pendingWithdrawal.amount,
            pendingWithdrawal.btcAddress
        );
        
        return true;
    }
    
    /**
     * @dev Get status of a deposit
     * @param depositId ID of the deposit
     * @return exists Whether the deposit exists
     * @return user User who initiated the deposit
     * @return amount Deposit amount
     * @return timestamp Timestamp when the deposit was initiated
     * @return processed Whether the deposit has been processed
     * @return status Status from the bridge (0=Unused, 1=Pending, 2=Confirmed, 3=Canceled)
     * @return confirmations Number of confirmations
     */
    function getDepositStatus(bytes32 depositId) external view returns (
        bool exists,
        address user,
        uint256 amount,
        uint256 timestamp,
        bool processed,
        uint8 status,
        uint256 confirmations
    ) {
        PendingDeposit storage deposit = pendingDeposits[depositId];
        
        exists = deposit.user != address(0);
        user = deposit.user;
        amount = deposit.amount;
        timestamp = deposit.timestamp;
        processed = deposit.processed;
        
        // Get status from bridge
        if (exists) {
            IExSatBridge bridge = IExSatBridge(exsatBridge);
            (status, confirmations) = bridge.getDepositStatus(depositId);
        }
        
        return (exists, user, amount, timestamp, processed, status, confirmations);
    }
    
    /**
     * @dev Get status of a withdrawal
     * @param withdrawalId ID of the withdrawal
     * @return exists Whether the withdrawal exists
     * @return user User who initiated the withdrawal
     * @return amount Withdrawal amount
     * @return btcAddress Bitcoin address for receiving BTC
     * @return timestamp Timestamp when the withdrawal was initiated
     * @return processed Whether the withdrawal has been processed
     * @return status Status from the bridge (0=Unused, 1=Pending, 2=Confirmed, 3=Canceled)
     * @return confirmations Number of confirmations
     */
    function getWithdrawalStatus(bytes32 withdrawalId) external view returns (
        bool exists,
        address user,
        uint256 amount,
        string memory btcAddress,
        uint256 timestamp,
        bool processed,
        uint8 status,
        uint256 confirmations
    ) {
        PendingWithdrawal storage withdrawal = pendingWithdrawals[withdrawalId];
        
        exists = withdrawal.user != address(0);
        user = withdrawal.user;
        amount = withdrawal.amount;
        btcAddress = withdrawal.btcAddress;
        timestamp = withdrawal.timestamp;
        processed = withdrawal.processed;
        
        // Get status from bridge
        if (exists) {
            IExSatBridge bridge = IExSatBridge(exsatBridge);
            (status, confirmations) = bridge.getWithdrawalStatus(withdrawalId);
        }
        
        return (exists, user, amount, btcAddress, timestamp, processed, status, confirmations);
    }
    
    /**
     * @dev Update the exSat bridge address
     * @param _newBridge New bridge address
     */
    function updateBridgeAddress(address _newBridge) external onlyOwner {
        require(_newBridge != address(0), "Bridge cannot be zero address");
        
        address oldBridge = exsatBridge;
        exsatBridge = _newBridge;
        
        emit BridgeAddressUpdated(oldBridge, _newBridge);
    }
    
    /**
     * @dev Update required Bitcoin confirmations
     * @param _confirmations New confirmation count
     */
    function updateRequiredConfirmations(uint256 _confirmations) external onlyOwner {
        require(_confirmations > 0, "Confirmations must be greater than 0");
        
        uint256 oldConfirmations = requiredBtcConfirmations;
        requiredBtcConfirmations = _confirmations;
        
        emit RequiredConfirmationsUpdated(oldConfirmations, _confirmations);
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
} 
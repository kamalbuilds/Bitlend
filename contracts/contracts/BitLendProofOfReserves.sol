// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Interface for the UTXO Management Contract on exSat
// Based on: https://docs.exsat.network/developer-guides/native-layer-developer-guides/exsat-consensus-contracts/utxo-management-contract
interface IUTXOManagement {
    struct UTXO {
        uint64 id;
        bytes32 txid;
        uint32 index;
        bytes scriptpubkey;
        uint64 value;
    }
    
    // Get UTXOs by ScriptPubKey
    function getUTXOByScriptPubKey(bytes memory scriptpubkey) external view returns (UTXO[] memory);
    
    // Get UTXO by ID
    function getUTXOById(uint64 id) external view returns (UTXO memory);
    
    // Check if a BTC address is valid
    function isvalid(string memory btc_address) external view returns (bool);
    
    // Get total value of UTXOs for a scriptPubKey
    function getTotalValueForScriptPubKey(bytes memory scriptpubkey) external view returns (uint256);
}

/**
 * @title BitLendProofOfReserves
 * @dev Contract for implementing proof of reserves using exSat's UTXO data
 * This contract provides a framework for verifying Bitcoin collateral through UTXO data.
 * 
 * Note: As per the current exSat architecture, UTXO data is only accessible from the native (EOS) layer,
 * not directly from the EVM layer. In a production environment, this contract would need to be integrated
 * with an oracle or cross-chain communication mechanism to access the UTXO data.
 */
contract BitLendProofOfReserves is Ownable, ReentrancyGuard {
    // XBTC token on exSat network (mainnet address from docs)
    IERC20 public xbtcToken = IERC20(0x4aa4365da82ACD46e378A6f3c92a863f3e763d34);
    
    // Oracle address that will provide UTXO data (since direct access to the UTXO management contract is not yet available)
    address public utxoOracleAddress;
    
    // BitLendVault contract address
    address public vaultContract;
    
    // Address of the Oracle operator
    address public oracleOperator;
    
    // Mapping from BTC addresses (scriptPubKey hash) to depositor information
    mapping(bytes32 => DepositorInfo) public depositors;
    
    // Structure to store depositor information
    struct DepositorInfo {
        address depositor;
        bytes btcScriptPubKey;
        uint256 depositAmount;
        uint256 lastVerifiedAmount;
        uint256 lastVerificationTime;
        bool isVerified;
    }
    
    // For tracking protocol reserve ratios
    uint256 public totalVerifiedBtcValue;
    uint256 public totalXbtcMinted;
    uint256 public lastGlobalVerificationTime;
    
    // Events
    event CollateralVerified(address indexed depositor, bytes btcScriptPubKey, uint256 amount, uint256 timestamp);
    event UTXOOracleUpdated(address oldOracle, address newOracle);
    event VaultContractUpdated(address oldVault, address newVault);
    event DepositorRegistered(address indexed depositor, bytes btcScriptPubKey, uint256 depositAmount);
    event DepositorUpdated(address indexed depositor, bytes btcScriptPubKey, uint256 newDepositAmount);
    event GlobalReservesVerified(uint256 totalVerifiedBtc, uint256 totalXbtcSupply, uint256 reserveRatio);
    event OracleOperatorUpdated(address oldOperator, address newOperator);
    
    /**
     * @dev Constructor to initialize the contract with required addresses
     * @param _utxoOracle Address of the UTXO Oracle
     * @param _xbtcToken Address of the XBTC token
     * @param _vaultContract Address of the BitLendVault contract
     */
    constructor(
        address _utxoOracle,
        address _xbtcToken,
        address _vaultContract
    ) Ownable(msg.sender) {
        if (_xbtcToken != address(0)) {
            xbtcToken = IERC20(_xbtcToken);
        }
        utxoOracleAddress = _utxoOracle;
        vaultContract = _vaultContract;
        oracleOperator = msg.sender;
    }
    
    /**
     * @dev Update the UTXO Oracle address
     * @param _newOracle Address of the new UTXO Oracle
     */
    function updateUTXOOracle(address _newOracle) external onlyOwner {
        address oldOracle = utxoOracleAddress;
        utxoOracleAddress = _newOracle;
        emit UTXOOracleUpdated(oldOracle, _newOracle);
    }
    
    /**
     * @dev Update the Oracle operator address
     * @param _newOperator Address of the new Oracle operator
     */
    function updateOracleOperator(address _newOperator) external onlyOwner {
        require(_newOperator != address(0), "Invalid operator address");
        address oldOperator = oracleOperator;
        oracleOperator = _newOperator;
        emit OracleOperatorUpdated(oldOperator, _newOperator);
    }
    
    /**
     * @dev Update the vault contract address
     * @param _newVault Address of the new BitLendVault contract
     */
    function updateVaultContract(address _newVault) external onlyOwner {
        address oldVault = vaultContract;
        vaultContract = _newVault;
        emit VaultContractUpdated(oldVault, _newVault);
    }
    
    /**
     * @dev Register a depositor with their BTC scriptPubKey
     * Can only be called by the vault contract
     * @param _depositor Ethereum address of the depositor
     * @param _scriptPubKey The Bitcoin scriptPubKey in bytes
     * @param _depositAmount The amount deposited in satoshis
     */
    function registerDepositor(
        address _depositor,
        bytes calldata _scriptPubKey,
        uint256 _depositAmount
    ) external {
        require(msg.sender == vaultContract, "Only vault can register depositors");
        require(_depositor != address(0), "Invalid depositor address");
        require(_scriptPubKey.length > 0, "Invalid scriptPubKey");
        require(_depositAmount > 0, "Deposit amount must be greater than 0");
        
        bytes32 scriptPubKeyHash = keccak256(_scriptPubKey);
        
        // Store depositor information
        depositors[scriptPubKeyHash] = DepositorInfo({
            depositor: _depositor,
            btcScriptPubKey: _scriptPubKey,
            depositAmount: _depositAmount,
            lastVerifiedAmount: 0,
            lastVerificationTime: 0,
            isVerified: false
        });
        
        emit DepositorRegistered(_depositor, _scriptPubKey, _depositAmount);
    }
    
    /**
     * @dev Update a depositor's deposit amount
     * Can only be called by the vault contract
     * @param _depositor Ethereum address of the depositor
     * @param _scriptPubKey The Bitcoin scriptPubKey in bytes
     * @param _newDepositAmount The new deposit amount in satoshis
     */
    function updateDepositor(
        address _depositor,
        bytes calldata _scriptPubKey,
        uint256 _newDepositAmount
    ) external {
        require(msg.sender == vaultContract, "Only vault can update depositors");
        
        bytes32 scriptPubKeyHash = keccak256(_scriptPubKey);
        DepositorInfo storage info = depositors[scriptPubKeyHash];
        
        require(info.depositor == _depositor, "Depositor mismatch");
        
        // Update deposit amount
        info.depositAmount = _newDepositAmount;
        
        // Reset verification if deposit amount increased
        if (_newDepositAmount > info.lastVerifiedAmount) {
            info.isVerified = false;
        }
        
        emit DepositorUpdated(_depositor, _scriptPubKey, _newDepositAmount);
    }
    
    /**
     * @dev Submit UTXO verification data from the Oracle
     * This function is called by the Oracle operator with data from the exSat native layer
     * @param _scriptPubKey The Bitcoin scriptPubKey to verify
     * @param _utxoValue The total value of UTXOs for this scriptPubKey
     */
    function submitUTXOVerification(
        bytes calldata _scriptPubKey,
        uint256 _utxoValue
    ) external {
        require(msg.sender == oracleOperator, "Only oracle operator can submit verifications");
        
        bytes32 scriptPubKeyHash = keccak256(_scriptPubKey);
        DepositorInfo storage info = depositors[scriptPubKeyHash];
        
        require(info.depositor != address(0), "Depositor not registered");
        
        // Update depositor verification information
        info.lastVerifiedAmount = _utxoValue;
        info.lastVerificationTime = block.timestamp;
        info.isVerified = (_utxoValue >= info.depositAmount);
        
        emit CollateralVerified(info.depositor, _scriptPubKey, _utxoValue, block.timestamp);
    }
    
    /**
     * @dev Submit global reserves verification data from the Oracle
     * This updates the protocol-wide proof of reserves metrics
     * @param _totalVerifiedBtc The total verified BTC value across all monitored addresses
     * @param _totalXbtcSupply The total supply of XBTC tokens
     */
    function submitGlobalReservesVerification(
        uint256 _totalVerifiedBtc,
        uint256 _totalXbtcSupply
    ) external {
        require(msg.sender == oracleOperator, "Only oracle operator can submit verifications");
        
        totalVerifiedBtcValue = _totalVerifiedBtc;
        totalXbtcMinted = _totalXbtcSupply;
        lastGlobalVerificationTime = block.timestamp;
        
        // Calculate reserve ratio as percentage (scaled by 100)
        uint256 reserveRatio = 0;
        if (_totalXbtcSupply > 0) {
            reserveRatio = (_totalVerifiedBtc * 100) / _totalXbtcSupply;
        }
        
        emit GlobalReservesVerified(_totalVerifiedBtc, _totalXbtcSupply, reserveRatio);
    }
    
    /**
     * @dev Verify UTXO collateral for a depositor
     * This is a simulation function since direct access to UTXO data from EVM is not yet available
     * In a production environment, this would be replaced by the submitUTXOVerification function
     * @param _scriptPubKey The Bitcoin scriptPubKey to verify
     * @return verified Whether the collateral is verified
     * @return verifiedAmount The amount verified
     */
    function verifyUTXO(bytes calldata _scriptPubKey) public returns (bool verified, uint256 verifiedAmount) {
        bytes32 scriptPubKeyHash = keccak256(_scriptPubKey);
        DepositorInfo storage info = depositors[scriptPubKeyHash];
        
        require(info.depositor != address(0), "Depositor not registered");
        
        // In a production environment, this would query the UTXO data via a cross-chain mechanism
        // For now, we'll assume the last verified amount is still valid if verified within the last 24 hours
        if (block.timestamp - info.lastVerificationTime <= 1 days) {
            return (info.isVerified, info.lastVerifiedAmount);
        } else {
            // Trigger an event to request verification through the Oracle
            emit CollateralVerified(info.depositor, _scriptPubKey, 0, block.timestamp);
            
            // Return current status while waiting for Oracle update
            return (false, 0);
        }
    }
    
    /**
     * @dev Check if a depositor's collateral is verified
     * @param _depositor The address of the depositor
     * @param _scriptPubKey The Bitcoin scriptPubKey to check
     * @return isVerified Boolean indicating if the collateral is verified
     * @return verifiedAmount The amount verified
     * @return requiredAmount The amount required for the deposit
     * @return lastVerificationTime The timestamp of the last verification
     */
    function checkVerification(address _depositor, bytes calldata _scriptPubKey) external view returns (
        bool isVerified,
        uint256 verifiedAmount,
        uint256 requiredAmount,
        uint256 lastVerificationTime
    ) {
        bytes32 scriptPubKeyHash = keccak256(_scriptPubKey);
        DepositorInfo storage info = depositors[scriptPubKeyHash];
        
        require(info.depositor == _depositor, "Not depositor's UTXO");
        
        return (
            info.isVerified,
            info.lastVerifiedAmount,
            info.depositAmount,
            info.lastVerificationTime
        );
    }
    
    /**
     * @dev Get the current global reserves status
     * @return verifiedBtcValue Total verified BTC value
     * @return xbtcSupply Total XBTC supply
     * @return reserveRatio Reserve ratio as percentage (scaled by 100)
     * @return lastVerificationTime Timestamp of the last verification
     */
    function getGlobalReservesStatus() external view returns (
        uint256 verifiedBtcValue,
        uint256 xbtcSupply,
        uint256 reserveRatio,
        uint256 lastVerificationTime
    ) {
        reserveRatio = 0;
        if (totalXbtcMinted > 0) {
            reserveRatio = (totalVerifiedBtcValue * 100) / totalXbtcMinted;
        }
        
        return (
            totalVerifiedBtcValue,
            totalXbtcMinted,
            reserveRatio,
            lastGlobalVerificationTime
        );
    }
} 
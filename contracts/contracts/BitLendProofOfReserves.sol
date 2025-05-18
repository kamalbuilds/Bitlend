// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title BitLendProofOfReserves
 * @dev Contract for implementing proof of reserves using exSat's UTXO data
 * This contract verifies collateral by accessing Bitcoin UTXO data through exSat's UTXO Management Contract
 */
contract BitLendProofOfReserves is Ownable, ReentrancyGuard {
    // Interface for the UTXO Management Contract on exSat
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
    
    // The exSat UTXO Management Contract address
    address public utxoManagementContract;
    
    // XBTC token on exSat
    IERC20 public xbtcToken;
    
    // BitLendVault contract address
    address public vaultContract;
    
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
    
    // Events
    event CollateralVerified(address indexed depositor, bytes btcScriptPubKey, uint256 amount, uint256 timestamp);
    event UTXOManagementContractUpdated(address oldContract, address newContract);
    event VaultContractUpdated(address oldVault, address newVault);
    event DepositorRegistered(address indexed depositor, bytes btcScriptPubKey, uint256 depositAmount);
    
    /**
     * @dev Constructor to initialize the contract with required addresses
     * @param _utxoManagement Address of the UTXO Management Contract
     * @param _xbtcToken Address of the XBTC token
     * @param _vaultContract Address of the BitLendVault contract
     */
    constructor(address _utxoManagement, address _xbtcToken, address _vaultContract) Ownable(msg.sender) {
        utxoManagementContract = _utxoManagement;
        xbtcToken = IERC20(_xbtcToken);
        vaultContract = _vaultContract;
    }
    
    /**
     * @dev Update the UTXO Management Contract address
     * @param _newContract Address of the new UTXO Management Contract
     */
    function updateUTXOManagementContract(address _newContract) external onlyOwner {
        address oldContract = utxoManagementContract;
        utxoManagementContract = _newContract;
        emit UTXOManagementContractUpdated(oldContract, _newContract);
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
     * @dev Verify UTXO collateral for a depositor
     * @param _scriptPubKey The Bitcoin scriptPubKey to verify
     * @return verified Whether the collateral is verified
     * @return verifiedAmount The amount verified
     */
    function verifyUTXO(bytes calldata _scriptPubKey) public nonReentrant returns (bool verified, uint256 verifiedAmount) {
        bytes32 scriptPubKeyHash = keccak256(_scriptPubKey);
        DepositorInfo storage info = depositors[scriptPubKeyHash];
        
        require(info.depositor != address(0), "Depositor not registered");
        
        // Get UTXOs from the UTXO Management Contract
        IUTXOManagement utxoMgmt = IUTXOManagement(utxoManagementContract);
        
        // Get total value directly if the function is available
        uint256 totalValue = 0;
        
        try utxoMgmt.getTotalValueForScriptPubKey(_scriptPubKey) returns (uint256 value) {
            totalValue = value;
        } catch {
            // Fallback to iterating through UTXOs if direct method unavailable
            IUTXOManagement.UTXO[] memory utxos = utxoMgmt.getUTXOByScriptPubKey(_scriptPubKey);
            
            // Calculate total value of UTXOs
            for (uint256 i = 0; i < utxos.length; i++) {
                totalValue += utxos[i].value;
            }
        }
        
        // Update depositor information
        info.lastVerifiedAmount = totalValue;
        info.lastVerificationTime = block.timestamp;
        info.isVerified = (totalValue >= info.depositAmount);
        
        emit CollateralVerified(info.depositor, _scriptPubKey, totalValue, block.timestamp);
        
        return (info.isVerified, totalValue);
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
     * @dev Get the current UTXO balance for a scriptPubKey
     * @param _scriptPubKey The Bitcoin scriptPubKey to check
     * @return balance The current balance
     */
    function getCurrentUTXOBalance(bytes calldata _scriptPubKey) external view returns (uint256 balance) {
        IUTXOManagement utxoMgmt = IUTXOManagement(utxoManagementContract);
        
        try utxoMgmt.getTotalValueForScriptPubKey(_scriptPubKey) returns (uint256 value) {
            return value;
        } catch {
            // Fallback to iterating through UTXOs if direct method unavailable
            IUTXOManagement.UTXO[] memory utxos = utxoMgmt.getUTXOByScriptPubKey(_scriptPubKey);
            
            // Calculate total value of UTXOs
            uint256 totalValue = 0;
            for (uint256 i = 0; i < utxos.length; i++) {
                totalValue += utxos[i].value;
            }
            
            return totalValue;
        }
    }
    
    /**
     * @dev Validate a Bitcoin address through the UTXO Management Contract
     * @param _btcAddress Bitcoin address to validate
     * @return isValid Whether the address is valid
     */
    function validateBitcoinAddress(string calldata _btcAddress) external view returns (bool isValid) {
        IUTXOManagement utxoMgmt = IUTXOManagement(utxoManagementContract);
        return utxoMgmt.isvalid(_btcAddress);
    }
} 
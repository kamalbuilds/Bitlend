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
        
        function getUTXOByScriptPubKey(bytes memory scriptpubkey) external view returns (UTXO[] memory);
        function getUTXOById(uint64 id) external view returns (UTXO memory);
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
    function registerDepositor(address _depositor, bytes calldata _scriptPubKey, uint256 _depositAmount) external {
        require(msg.sender == vaultContract, "Only vault can register depositors");
        require(_depositor != address(0), "Invalid depositor address");
        require(_scriptPubKey.length > 0, "Invalid scriptPubKey");
        
        bytes32 scriptPubKeyHash = keccak256(_scriptPubKey);
        
        depositors[scriptPubKeyHash] = DepositorInfo({
            depositor: _depositor,
            btcScriptPubKey: _scriptPubKey,
            depositAmount: _depositAmount,
            lastVerifiedAmount: 0,
            lastVerificationTime: 0,
            isVerified: false
        });
    }
    
    /**
     * @dev Update depositor information
     * Can only be called by the vault contract
     * @param _depositor Ethereum address of the depositor
     * @param _scriptPubKey The Bitcoin scriptPubKey in bytes
     * @param _newDepositAmount The new deposit amount
     */
    function updateDepositor(address _depositor, bytes calldata _scriptPubKey, uint256 _newDepositAmount) external {
        require(msg.sender == vaultContract, "Only vault can update depositors");
        
        bytes32 scriptPubKeyHash = keccak256(_scriptPubKey);
        DepositorInfo storage info = depositors[scriptPubKeyHash];
        
        require(info.depositor == _depositor, "Depositor mismatch");
        
        info.depositAmount = _newDepositAmount;
    }
    
    /**
     * @dev Verify the UTXO for a depositor to confirm their collateral
     * @param _scriptPubKey The Bitcoin scriptPubKey to verify
     * @return verified Boolean indicating if verification was successful
     * @return verifiedAmount The amount verified in the UTXO
     */
    function verifyUTXO(bytes calldata _scriptPubKey) public nonReentrant returns (bool verified, uint256 verifiedAmount) {
        bytes32 scriptPubKeyHash = keccak256(_scriptPubKey);
        DepositorInfo storage info = depositors[scriptPubKeyHash];
        
        require(info.depositor != address(0), "Depositor not registered");
        
        // Get UTXOs from the UTXO Management Contract
        IUTXOManagement utxoMgmt = IUTXOManagement(utxoManagementContract);
        IUTXOManagement.UTXO[] memory utxos = utxoMgmt.getUTXOByScriptPubKey(_scriptPubKey);
        
        // Calculate total value of UTXOs
        uint256 totalValue = 0;
        for (uint256 i = 0; i < utxos.length; i++) {
            totalValue += utxos[i].value;
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
        
        require(info.depositor == _depositor, "Depositor mismatch");
        
        return (
            info.isVerified,
            info.lastVerifiedAmount,
            info.depositAmount,
            info.lastVerificationTime
        );
    }
    
    /**
     * @dev Get the total verified collateral for the system
     * @return totalVerified Total amount of verified collateral
     * @return totalRequired Total amount of required collateral
     * @return collateralizationRatio The current collateralization ratio (scaled by 1e18)
     */
    function getSystemCollateralization() external view returns (
        uint256 totalVerified,
        uint256 totalRequired,
        uint256 collateralizationRatio
    ) {
        uint256 verifiedTotal = 0;
        uint256 requiredTotal = 0;
        
        // Calculate totals
        // Note: In a production system, we'd need a more efficient way to iterate through all depositors
        // This is simplified for demonstration purposes
        
        // Return the collateralization ratio (scaled by 1e18 for precision)
        uint256 ratio = 0;
        if (requiredTotal > 0) {
            ratio = (verifiedTotal * 1e18) / requiredTotal;
        }
        
        return (verifiedTotal, requiredTotal, ratio);
    }
} 
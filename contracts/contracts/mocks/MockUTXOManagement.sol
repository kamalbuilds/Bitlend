// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUTXOManagement
 * @dev Mock implementation of exSat's UTXO Management Contract
 * This contract simulates the behavior of the actual UTXO management system
 */
contract MockUTXOManagement is Ownable {
    // UTXO structure (simplified from exSat's implementation)
    struct UTXO {
        uint64 id;
        bytes32 txid;
        uint32 index;
        bytes scriptpubkey;
        uint64 value;
    }
    
    // Mapping from scriptPubKey to UTXOs
    mapping(bytes32 => UTXO[]) public utxosByScriptPubKey;
    
    // Mapping from UTXO ID to UTXO
    mapping(uint64 => UTXO) public utxosById;
    
    // Next UTXO ID
    uint64 private nextId = 1;
    
    // Events
    event UTXOAdded(uint64 id, bytes32 txid, uint32 index, bytes scriptpubkey, uint64 value);
    event UTXOSpent(uint64 id);
    
    /**
     * @dev Constructor
     */
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Add a new UTXO to the system
     * @param txid Transaction ID
     * @param index Output index
     * @param scriptpubkey ScriptPubKey
     * @param value Value in satoshis
     */
    function addUTXO(bytes32 txid, uint32 index, bytes calldata scriptpubkey, uint64 value) external onlyOwner {
        require(value > 0, "Value must be greater than 0");
        require(scriptpubkey.length > 0, "Invalid scriptPubKey");
        
        uint64 id = nextId++;
        
        UTXO memory utxo = UTXO({
            id: id,
            txid: txid,
            index: index,
            scriptpubkey: scriptpubkey,
            value: value
        });
        
        bytes32 scriptpubkeyHash = keccak256(scriptpubkey);
        utxosByScriptPubKey[scriptpubkeyHash].push(utxo);
        utxosById[id] = utxo;
        
        emit UTXOAdded(id, txid, index, scriptpubkey, value);
    }
    
    /**
     * @dev Mark a UTXO as spent
     * @param id UTXO ID
     */
    function spendUTXO(uint64 id) external onlyOwner {
        require(utxosById[id].value > 0, "UTXO not found or already spent");
        
        UTXO memory utxo = utxosById[id];
        bytes32 scriptpubkeyHash = keccak256(utxo.scriptpubkey);
        
        // Find and remove the UTXO from the array
        UTXO[] storage utxos = utxosByScriptPubKey[scriptpubkeyHash];
        for (uint256 i = 0; i < utxos.length; i++) {
            if (utxos[i].id == id) {
                // Move the last element to this position (if not already the last)
                if (i != utxos.length - 1) {
                    utxos[i] = utxos[utxos.length - 1];
                }
                // Remove the last element
                utxos.pop();
                break;
            }
        }
        
        // Delete the UTXO from the ID mapping
        delete utxosById[id];
        
        emit UTXOSpent(id);
    }
    
    /**
     * @dev Get UTXOs by ScriptPubKey
     * @param scriptpubkey ScriptPubKey to look up
     * @return Array of UTXOs
     */
    function getUTXOByScriptPubKey(bytes memory scriptpubkey) external view returns (UTXO[] memory) {
        bytes32 scriptpubkeyHash = keccak256(scriptpubkey);
        return utxosByScriptPubKey[scriptpubkeyHash];
    }
    
    /**
     * @dev Get UTXO by ID
     * @param id UTXO ID
     * @return UTXO data
     */
    function getUTXOById(uint64 id) external view returns (UTXO memory) {
        return utxosById[id];
    }
    
    /**
     * @dev Get total value of UTXOs for a scriptPubKey
     * @param scriptpubkey ScriptPubKey to calculate value for
     * @return Total value in satoshis
     */
    function getTotalValueForScriptPubKey(bytes memory scriptpubkey) external view returns (uint256) {
        bytes32 scriptpubkeyHash = keccak256(scriptpubkey);
        UTXO[] storage utxos = utxosByScriptPubKey[scriptpubkeyHash];
        
        uint256 totalValue = 0;
        for (uint256 i = 0; i < utxos.length; i++) {
            totalValue += utxos[i].value;
        }
        
        return totalValue;
    }
} 
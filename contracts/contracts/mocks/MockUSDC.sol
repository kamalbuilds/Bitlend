// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @dev Mock USDC token for testing purposes
 */
contract MockUSDC is ERC20, Ownable {
    // USDC has 6 decimals
    uint8 private constant _decimals = 6;

    /**
     * @dev Constructor to initialize the token
     */
    constructor() ERC20("Mock USDC", "USDC") Ownable(msg.sender) {
        // Mint 1,000,000 USDC to the deployer for testing
        _mint(msg.sender, 1_000_000 * 10**_decimals);
    }

    /**
     * @dev Returns the number of decimals used by the token
     */
    function decimals() public pure override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mint tokens to a specific address (for testing)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
} 
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract UsernameRegistry {
    // =====================================================
    // ERRORS
    // =====================================================

    error UsernameTooShort();
    error UsernameTooLong();
    error WalletAlreadyHasUsername();
    error UsernameAlreadyTaken();
    error InvalidCharacters();
    error UsernameNotFound();

    // =====================================================
    // STORAGE
    // =====================================================

    mapping(address => string) private addressToUsername;
    mapping(string => address) private usernameToAddress;

    // =====================================================
    // EVENTS
    // =====================================================

    event UsernameRegistered(address indexed wallet, string username);

    // =====================================================
    // INTERNAL VALIDATION
    // =====================================================

    function _validateUsername(string calldata _username) internal pure {
        bytes memory b = bytes(_username);
        uint256 length = b.length;

        if (length < 3) revert UsernameTooShort();
        if (length > 15) revert UsernameTooLong();

        for (uint256 i = 0; i < length; i++) {
            bytes1 char = b[i];

            bool isLowercase = char >= 0x61 && char <= 0x7A; // a-z
            bool isNumber = char >= 0x30 && char <= 0x39;    // 0-9
            bool isUnderscore = char == 0x5F;                    // _

            if (!(isLowercase || isNumber || isUnderscore)) {
                revert InvalidCharacters();
            }
        }
    }

    // =====================================================
    // REGISTER USERNAME (PERMANENT)
    // =====================================================

    function registerUsername(string calldata _username) external {
        // One wallet can only register once
        if (bytes(addressToUsername[msg.sender]).length > 0) {
            revert WalletAlreadyHasUsername();
        }

        // Validate username
        _validateUsername(_username);

        // Must be unique
        if (usernameToAddress[_username] != address(0)) {
            revert UsernameAlreadyTaken();
        }

        // Save permanently
        addressToUsername[msg.sender] = _username;
        usernameToAddress[_username] = msg.sender;

        emit UsernameRegistered(msg.sender, _username);
    }

    // =====================================================
    // VIEW FUNCTIONS
    // =====================================================

    /// Get username from wallet address
    function getUsername(address _wallet)
        external
        view
        returns (string memory)
    {
        return addressToUsername[_wallet];
    }

    /// Resolve username to wallet address
    function resolveUsername(string calldata _username)
        external
        view
        returns (address)
    {
        address wallet = usernameToAddress[_username];

        if (wallet == address(0)) {
            revert UsernameNotFound();
        }

        return wallet;
    }

    /// Check if a wallet has a username
    function hasUsername(address _wallet)
        external
        view
        returns (bool)
    {
        return bytes(addressToUsername[_wallet]).length > 0;
    }

    /// Check if a username already exists
    function usernameExists(string calldata _username)
        external
        view
        returns (bool)
    {
        return usernameToAddress[_username] != address(0);
    }
}
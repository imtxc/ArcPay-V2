// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract UsernameRegistry {
    error UsernameTooShort();
    error UsernameTooLong();
    error WalletAlreadyHasUsername();
    error UsernameAlreadyTaken();
    error InvalidCharacters();

    mapping(address => string) private addressToUsername;
    mapping(string => address) private usernameToAddress;

    event UsernameRegistered(address indexed wallet, string username);

    function registerUsername(string calldata _username) external {
        uint256 length = bytes(_username).length;
        if (length < 3) revert UsernameTooShort();
        if (length > 15) revert UsernameTooLong();
        if (bytes(addressToUsername[msg.sender]).length > 0) revert WalletAlreadyHasUsername();
        if (usernameToAddress[_username] != address(0)) revert UsernameAlreadyTaken();

        bytes memory b = bytes(_username);
        for (uint i = 0; i < length; i++) {
            bytes1 char = b[i];
            if (!(char >= 0x61 && char <= 0x7A) && !(char >= 0x30 && char <= 0x39)) revert InvalidCharacters();
        }

        addressToUsername[msg.sender] = _username;
        usernameToAddress[_username] = msg.sender;
        emit UsernameRegistered(msg.sender, _username);
    }

    function getUsername(address _wallet) external view returns (string memory) {
        return addressToUsername[_wallet];
    }

    function resolveUsername(string calldata _username) external view returns (address) {
        return usernameToAddress[_username];
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IMonadStaking.sol";

contract ValidatorRegistry {
    struct Validator {
        uint64 validatorId;
        address authAddress;
        uint256 minFeeShareBps;
        uint256 totalShared;
        uint256 lastShareTimestamp;
        uint256 shareCount;
        bool active;
        uint256 registeredAt;
    }

    mapping(uint64 => Validator) public validators;
    uint64[] public activeValidators;
    uint256 public registeredCount;
    address public owner;
    
    bool public testnetMode = true;
    IMonadStaking public constant STAKING_CONTRACT = IMonadStaking(address(0x300));

    event ValidatorRegistered(uint64 indexed validatorId, address indexed authAddress);
    event FeeShareRecorded(uint64 indexed validatorId, uint256 amount);
    event ValidatorDeactivated(uint64 indexed validatorId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function registerValidator(
        uint64 validatorId,
        address authAddress,
        uint256 minFeeShareBps
    ) external onlyOwner {
        require(validators[validatorId].registeredAt == 0, "Already registered");
        validators[validatorId] = Validator({
            validatorId: validatorId,
            authAddress: authAddress,
            minFeeShareBps: minFeeShareBps,
            totalShared: 0,
            lastShareTimestamp: 0,
            shareCount: 0,
            active: true,
            registeredAt: block.timestamp
        });
        activeValidators.push(validatorId);
        registeredCount++;
        emit ValidatorRegistered(validatorId, authAddress);
    }

    function setTestnetMode(bool _mode) external onlyOwner {
        testnetMode = _mode;
    }

    function register(uint64 validatorId, uint256 minFeeShareBps) external {
        require(validators[validatorId].registeredAt == 0, "Already registered");
        require(minFeeShareBps >= 1 && minFeeShareBps <= 10000, "Invalid fee share");

        address authAddr;
        if (testnetMode) {
            authAddr = msg.sender;
        } else {
            (address precompileAuth, , , , , , , , , , , ) = STAKING_CONTRACT.getValidator(validatorId);
            require(msg.sender == precompileAuth, "Not validator owner");
            authAddr = precompileAuth;
        }

        validators[validatorId] = Validator({
            validatorId: validatorId,
            authAddress: authAddr,
            minFeeShareBps: minFeeShareBps,
            totalShared: 0,
            lastShareTimestamp: 0,
            shareCount: 0,
            active: true,
            registeredAt: block.timestamp
        });
        activeValidators.push(validatorId);
        registeredCount++;

        emit ValidatorRegistered(validatorId, authAddr);
    }

    function registerTestValidator() external onlyOwner {
        _registerTestVal(1, 4000);
        _registerTestVal(2, 3000);
        _registerTestVal(3, 2000);
    }

    function _registerTestVal(uint64 validatorId, uint256 minFeeShareBps) private {
        if (validators[validatorId].registeredAt == 0) {
            validators[validatorId] = Validator({
                validatorId: validatorId,
                authAddress: msg.sender,
                minFeeShareBps: minFeeShareBps,
                totalShared: 0,
                lastShareTimestamp: 0,
                shareCount: 0,
                active: true,
                registeredAt: block.timestamp
            });
            activeValidators.push(validatorId);
            registeredCount++;
            emit ValidatorRegistered(validatorId, msg.sender);
        }
    }

    function recordFeeShare(uint64 validatorId, uint256 amount) external {
        // Anyone or the harvest system can trigger a fee share record
        require(validators[validatorId].registeredAt > 0, "Validator not registered");
        Validator storage val = validators[validatorId];
        val.totalShared += amount;
        val.lastShareTimestamp = block.timestamp;
        val.shareCount++;
        emit FeeShareRecorded(validatorId, amount);
    }

    function deactivate(uint64 validatorId) external onlyOwner {
        require(validators[validatorId].registeredAt > 0, "Validator not registered");
        validators[validatorId].active = false;
        
        // Remove from activeValidators list
        for (uint256 i = 0; i < activeValidators.length; i++) {
            if (activeValidators[i] == validatorId) {
                activeValidators[i] = activeValidators[activeValidators.length - 1];
                activeValidators.pop();
                break;
            }
        }
        emit ValidatorDeactivated(validatorId);
    }

    function getActiveValidators() external view returns (uint64[] memory) {
        return activeValidators;
    }

    function getValidator(uint64 validatorId) external view returns (Validator memory) {
        require(validators[validatorId].registeredAt > 0, "Validator not registered");
        return validators[validatorId];
    }
}

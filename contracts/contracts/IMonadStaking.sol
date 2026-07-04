// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IMonadStaking {
    function externalReward(uint64 validatorId) external payable returns (bool);
    function getDelegator(uint64 validatorId, address delegator) external view returns (uint256 stake, uint256 unclaimedRewards);
    function getValidator(uint64 validatorId) external view returns (
        address authAddress,
        uint64 flags,
        uint256 stake,
        uint256 accRewardPerToken,
        uint256 commission,
        uint256 unclaimedRewards,
        uint256 consensusStake,
        uint256 consensusCommission,
        uint256 snapshotStake,
        uint256 snapshotCommission,
        bytes memory secpPubkey,
        bytes memory blsPubkey
    );
    function getExecutionValidatorSet() external view returns (uint64[] memory);
    function getEpochInfo() external view returns (uint64 epoch, bool inEpochDelayPeriod);
}

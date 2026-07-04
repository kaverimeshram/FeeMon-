import { parseAbi } from 'viem';

export const STAKING_ABI = parseAbi([
  "function externalReward(uint64 validatorId) external payable returns (bool)",
  "function getDelegator(uint64 validatorId, address delegator) external returns (uint256 stake, uint256 unclaimedRewards)",
  "function getValidator(uint64 validatorId) external returns (address authAddress, uint64 flags, uint256 stake, uint256 accRewardPerToken, uint256 commission, uint256 unclaimedRewards, uint256 consensusStake, uint256 consensusCommission, uint256 snapshotStake, uint256 snapshotCommission, bytes secpPubkey, bytes blsPubkey)",
  "function getExecutionValidatorSet() external returns (uint64[])",
  "function getEpochInfo() external returns (uint64 epoch, bool inEpochDelayPeriod)"
]);

export const FEEMON_ABI = parseAbi([
  "function exchangeRate() external view returns (uint256)",
  "function totalMONManaged() external view returns (uint256)",
  "function harvestAll() external",
  "function previewDeposit(uint256 monAmount) external view returns (uint256)"
]);

export const REGISTRY_ABI = parseAbi([
  "function getActiveValidators() external view returns (uint64[])",
  "function getValidator(uint64 validatorId) external view returns ((uint64 validatorId, address authAddress, uint256 minFeeShareBps, uint256 totalShared, uint256 lastShareTimestamp, uint256 shareCount, bool active, uint256 registeredAt))",
  "function registeredCount() external view returns (uint256)",
  "function recordFeeShare(uint64 validatorId, uint256 amount) external",
  "function deactivate(uint64 validatorId) external"
]);

export const FMON_ABI = parseAbi([
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address) external view returns (uint256)"
]);

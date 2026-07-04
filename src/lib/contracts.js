import { parseAbi } from 'viem';

export const FEEMON_ADDRESS = import.meta.env.VITE_FEEMON_ADDRESS || '0x0000000000000000000000000000000000000000';
export const REGISTRY_ADDRESS = import.meta.env.VITE_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000';
export const FMON_ADDRESS = import.meta.env.VITE_FMON_ADDRESS || '0x0000000000000000000000000000000000000000';

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

export const FEEMON_ABI = parseAbi([
  'function deposit() external payable returns (uint256)',
  'function requestWithdraw(uint256 fmonAmount, uint64 validatorId) external returns (uint8)',
  'function withdraw(uint256 requestIndex) external',
  'function harvestAll() external',
  'function exchangeRate() external view returns (uint256)',
  'function previewDeposit(uint256 monAmount) external view returns (uint256)',
  'function previewRedeem(uint256 fmonAmount) external view returns (uint256)',
  'function totalMONManaged() external view returns (uint256)',
  'function getWithdrawRequests(address user) external view returns ((uint256 amount, uint64 validatorId, uint8 withdrawId, bool claimed)[])',
  'function getUserDelegation(address user) external view returns (uint64 validatorId, uint256 amount, uint256 fmonBalance)'
]);

export const FMON_ABI = parseAbi([
  'function balanceOf(address) external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)'
]);

export const REGISTRY_ABI = parseAbi([
  'function getActiveValidators() external view returns (uint64[])',
  'function getValidator(uint64 validatorId) external view returns ((uint64 validatorId, address authAddress, uint256 minFeeShareBps, uint256 totalShared, uint256 lastShareTimestamp, uint256 shareCount, bool active, uint256 registeredAt))',
  'function registeredCount() external view returns (uint256)'
]);

export const STAKING_ABI = parseAbi([
  'function getDelegator(uint64 validatorId, address delegator) external view returns (uint256 stake, uint256 unclaimedRewards)'
]);

export const getValidatorName = (id) => {
  return `Validator #${id}`;
};

export const getEstimatedAPY = (sharePercent) => {
  const share = parseFloat(sharePercent || 0);
  if (share === 40) return '14.2%';
  if (share === 30) return '13.5%';
  if (share === 20) return '12.8%';
  return (12.0 + (share * 0.055)).toFixed(1) + '%';
};

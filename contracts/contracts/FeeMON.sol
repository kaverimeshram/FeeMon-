// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ValidatorRegistry.sol";
import "./FeeToken.sol";

interface IStakingPrecompile {
    function delegate(uint64 validatorId) external payable;
}

contract FeeMON {
    IStakingPrecompile public constant STAKING = IStakingPrecompile(address(0x300));

    struct WithdrawRequest {
        uint256 amount;
        uint64 validatorId;
        uint8 withdrawId;
        bool claimed;
    }

    ValidatorRegistry public registry;
    FeeToken public fMonToken;
    uint256 private _totalMONManaged;
    address public owner;
    bool private _inClaimRewards;

    uint64 public fallbackValidatorId = 1;
    mapping(uint64 => uint256) public delegatedTo;

    struct UserStaking {
        uint64 validatorId;
        uint256 amount;
    }
    mapping(address => UserStaking) public userStaking;

    mapping(address => WithdrawRequest[]) public userRequests;

    event Deposited(address indexed user, uint256 monAmount, uint256 fmonShares);
    event Delegated(address indexed user, uint64 indexed validatorId, uint256 amount, uint256 fmonMinted);
    event WithdrawRequested(address indexed user, uint8 withdrawId, uint256 fmonAmount, uint256 monEquivalent);
    event WithdrawCompleted(address indexed user, uint8 withdrawId, uint256 monAmount);
    event Harvested(address indexed keeper, uint256 rewardAmount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(address _registry, address _fMonToken) {
        registry = ValidatorRegistry(_registry);
        fMonToken = FeeToken(_fMonToken);
        owner = msg.sender;
    }

    function setFallbackValidator(uint64 id) external onlyOwner {
        fallbackValidatorId = id;
    }

    function totalMONManaged() public view returns (uint256) {
        return _totalMONManaged;
    }

    function exchangeRate() public view returns (uint256) {
        uint256 supply = fMonToken.totalSupply();
        if (supply == 0) {
            return 1e18;
        }
        return (totalMONManaged() * 1e18) / supply;
    }

    function previewDeposit(uint256 monAmount) public view returns (uint256) {
        return (monAmount * 1e18) / exchangeRate();
    }

    function previewRedeem(uint256 fmonAmount) public view returns (uint256) {
        return (fmonAmount * exchangeRate()) / 1e18;
    }

    function deposit() external payable returns (uint256) {
        require(msg.value >= 0.1 ether, "Min stake is 0.1 MON");
        
        uint64 validatorId = _getBestValidator();

        (bool success, ) = address(STAKING).call{value: msg.value}(
            abi.encodeWithSignature("delegate(uint64)", validatorId)
        );
        require(success, "Delegation failed");

        uint256 shares = previewDeposit(msg.value);
        
        // Track delegation details
        delegatedTo[validatorId] += msg.value;
        userStaking[msg.sender].validatorId = validatorId;
        userStaking[msg.sender].amount += msg.value;

        fMonToken.mint(msg.sender, shares);
        _totalMONManaged += msg.value;
        
        emit Delegated(msg.sender, validatorId, msg.value, shares);
        emit Deposited(msg.sender, msg.value, shares);
        return shares;
    }

    function requestWithdraw(uint256 fmonAmount, uint64 validatorId) external returns (uint8) {
        require(fmonAmount > 0, "Amount must be > 0");
        require(fMonToken.balanceOf(msg.sender) >= fmonAmount, "Insufficient fMON balance");
        
        uint256 monEquivalent = previewRedeem(fmonAmount);
        
        // Burn user's fMON
        fMonToken.burn(msg.sender, fmonAmount);
        
        // Deduct from total managed MON
        _totalMONManaged = _totalMONManaged > monEquivalent ? _totalMONManaged - monEquivalent : 0;
        
        uint8 reqId = uint8(userRequests[msg.sender].length + 1);
        
        userRequests[msg.sender].push(WithdrawRequest({
            amount: monEquivalent,
            validatorId: validatorId,
            withdrawId: reqId,
            claimed: false
        }));
        
        emit WithdrawRequested(msg.sender, reqId, fmonAmount, monEquivalent);
        return reqId;
    }

    function withdraw(uint256 requestIndex) external {
        require(requestIndex < userRequests[msg.sender].length, "Invalid request index");
        WithdrawRequest storage req = userRequests[msg.sender][requestIndex];
        require(!req.claimed, "Already claimed");
        
        req.claimed = true;
        uint256 payout = req.amount;
        
        // Transfer MON to the user
        (bool success, ) = payable(msg.sender).call{value: payout}("");
        require(success, "Transfer failed");
        
        emit WithdrawCompleted(msg.sender, req.withdrawId, payout);
    }

    function harvestAll() external payable {
        if (msg.value > 0) {
            _totalMONManaged += msg.value;
        }
        
        uint256 balBefore = address(this).balance;
        _inClaimRewards = true;
        
        uint64[] memory activeIds = registry.getActiveValidators();
        for (uint256 i = 0; i < activeIds.length; i++) {
            uint64 valId = activeIds[i];
            address(STAKING).call(
                abi.encodeWithSignature("claimRewards(uint64)", valId)
            );
        }
        
        _inClaimRewards = false;
        
        uint256 balAfter = address(this).balance;
        uint256 claimed = 0;
        if (balAfter > balBefore) {
            claimed = balAfter - balBefore;
            _totalMONManaged += claimed;
        }

        if (registry.testnetMode()) {
            uint256 mockReward = 0.0124 ether * activeIds.length;
            _totalMONManaged += mockReward;
            claimed += mockReward;
        }
        
        emit Harvested(msg.sender, claimed + msg.value);
    }

    function getWithdrawRequests(address user) external view returns (WithdrawRequest[] memory) {
        return userRequests[user];
    }

    receive() external payable {
        if (!_inClaimRewards) {
            _totalMONManaged += msg.value;
        }
    }

    function getUserDelegation(address user) external view returns (uint64 validatorId, uint256 amount, uint256 fmonBalance) {
        UserStaking memory stakeInfo = userStaking[user];
        return (stakeInfo.validatorId, stakeInfo.amount, fMonToken.balanceOf(user));
    }

    function _getBestValidator() internal view returns (uint64) {
        uint64[] memory activeIds = registry.getActiveValidators();
        if (activeIds.length == 0) {
            return fallbackValidatorId;
        }

        uint64 bestId = activeIds[0];
        uint256 maxFeeShare = 0;

        for (uint256 i = 0; i < activeIds.length; i++) {
            uint64 id = activeIds[i];
            ValidatorRegistry.Validator memory val = registry.getValidator(id);
            if (val.minFeeShareBps > maxFeeShare) {
                maxFeeShare = val.minFeeShareBps;
                bestId = id;
            }
        }

        return bestId;
    }
}

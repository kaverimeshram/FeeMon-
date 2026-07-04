import express from 'express';
import { getLeaderboard } from '../services/registry.js';
import * as db from '../db.js';
import { formatEther } from 'viem';
import { publicClient } from '../viem.js';
import { REGISTRY_ADDRESS, FEEMON_ADDRESS } from '../config.js';
import { REGISTRY_ABI, STAKING_ABI } from '../abis.js';

const router = express.Router();

// Helper to set standard headers
const setJsonHeaders = (res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
};

// 1. Health check
router.get('/health', (req, res) => {
  setJsonHeaders(res);
  res.json({
    status: 'ok',
    version: '1.0.0',
    aiConfigured: !!process.env.ANTHROPIC_API_KEY
  });
});

// 2. Leaderboard validators list
router.get('/validators', (req, res) => {
  setJsonHeaders(res);
  try {
    const list = getLeaderboard();
    
    // Format validators as specified
    const formatted = list.map(v => ({
      id: v.id,
      feeSharePct: v.feeSharePct,
      totalShared: v.totalShared,
      shareCount: v.shareCount,
      lastShare: v.lastShareTimestamp,
      hoursAgo: v.hoursAgo,
      status: v.status,
      shareHistory: (v.shareHistory || []).slice(-10) // last 10 events only
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Single validator detail
router.get('/validators/:id', (req, res) => {
  setJsonHeaders(res);
  try {
    const val = db.getValidator(req.params.id);
    if (!val) {
      return res.status(404).json({ error: 'Validator not found' });
    }
    res.json(val);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Protocol stats
router.get('/stats', async (req, res) => {
  setJsonHeaders(res);
  try {
    const database = db.getDB();
    const stats = database.data.protocolStats || {
      totalMONManaged: 0,
      exchangeRate: 1.0,
      fmonSupply: 0,
      lastUpdated: new Date().toISOString()
    };
    
    const allValidators = db.getValidators();
    const activeValidators = allValidators.filter(v => v.active).length;
    const validatorsSharingFees = allValidators.filter(v => v.active && v.shareCount > 0).length;
    const totalFeesShared = allValidators.reduce((sum, v) => sum + parseFloat(v.totalShared || 0), 0);

    // Fetch unclaimed rewards from Monad staking precompile
    let unclaimedRewards = 0;
    try {
      if (REGISTRY_ADDRESS && REGISTRY_ADDRESS !== '0x0000000000000000000000000000000000000000') {
        const activeIds = await publicClient.readContract({
          address: REGISTRY_ADDRESS,
          abi: REGISTRY_ABI,
          functionName: 'getActiveValidators',
        });
        
        let totalUnclaimedWei = 0n;
        for (const valId of activeIds) {
          try {
            const result = await publicClient.readContract({
              address: '0x0000000000000000000000000000000000001000', // Staking precompile
              abi: STAKING_ABI,
              functionName: 'getDelegator',
              args: [valId, FEEMON_ADDRESS]
            });
            totalUnclaimedWei += result[1];
          } catch {}
        }
        unclaimedRewards = parseFloat(formatEther(totalUnclaimedWei));
      }
    } catch (err) {
      console.warn('[Stats] Failed to fetch unclaimed rewards:', err.message);
    }

    // Get last harvest time formatted
    let lastHarvest = 'Never';
    const lastHarvestTime = database.data.meta.lastHarvestTimestamp;
    if (lastHarvestTime) {
      const diffMs = Date.now() - new Date(lastHarvestTime).getTime();
      const diffHours = Math.floor(diffMs / 3600000);
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / 60000);
        lastHarvest = diffMins === 0 ? 'Just now' : `${diffMins} minutes ago`;
      } else {
        lastHarvest = `${diffHours} hours ago`;
      }
    }

    res.json({
      totalMONManaged: stats.totalMONManaged,
      exchangeRate: stats.exchangeRate,
      fmonSupply: stats.fmonSupply,
      activeValidators,
      totalValidators: allValidators.length,
      lastUpdated: stats.lastUpdated,
      unclaimedRewards,
      validatorsSharingFees,
      totalFeesShared,
      lastHarvest
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. System alerts
router.get('/alerts', (req, res) => {
  setJsonHeaders(res);
  try {
    const alerts = db.getAlerts();
    // Return last 20 alerts, newest first
    const sortedAlerts = [...alerts]
      .reverse()
      .slice(0, 20);
    res.json(sortedAlerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

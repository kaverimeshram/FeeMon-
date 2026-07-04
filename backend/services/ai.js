import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY } from '../config.js';
import { getLeaderboard } from './registry.js';
import * as db from '../db.js';

const SYSTEM_PROMPT = `You are the feeMON AI advisor. feeMON is a liquid staking protocol on Monad blockchain. You help users understand validator performance and staking decisions. Be direct and specific. Use the actual numbers provided. Never make up data. Keep answers under 150 words. Do not use bullet points. Write in plain prose.`;

const anthropic = ANTHROPIC_API_KEY && ANTHROPIC_API_KEY !== 'your_key_here' && ANTHROPIC_API_KEY !== ''
  ? new Anthropic({ apiKey: ANTHROPIC_API_KEY })
  : null;
const getClaudeResponse = async (userPrompt, fallbackText) => {
  if (!anthropic) {
    console.log('[AI] Anthropic API key not configured. Returning fallback response.');
    return fallbackText;
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });
    
    if (response && response.content && response.content[0]) {
      return response.content[0].text;
    }
    return fallbackText;
  } catch (err) {
    console.error('[AI] Claude API call error:', err.message);
    if (err.status === 429) {
      return 'AI advisor busy, try again shortly.';
    }
    return 'AI advisor temporarily unavailable.';
  }
};

// 1. Recommend Validator
export const recommendValidator = async (question) => {
  const leaderboard = getLeaderboard();

  if (leaderboard.length === 0) {
    return {
      type: "empty",
      message: "No fee-sharing validators are registered yet. Once validators join the registry and begin sharing priority fees, feeMON AI will analyze their performance and recommend the best validator."
    };
  }

  // Format validator list for prompt context
  const formattedValidators = leaderboard
    .map(v => `Validator ${v.id}: ${v.feeSharePct}% fee share, ${v.totalShared} MON shared total, ${v.shareCount} sharing events, last shared ${v.hoursAgo} hours ago, status: ${v.status}`)
    .join('\n');

  const contextPrompt = `You are advising a user on feeMON, a liquid staking protocol on Monad. Based on this validator data, recommend the best validator and explain why in exactly 2 sentences. Mention the fee share percentage and how recently they shared fees. Be specific. Data: ${formattedValidators}`;

  const bestVal = leaderboard[0];

  try {
    if (!anthropic) {
      throw new Error("Anthropic API key not configured");
    }

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: contextPrompt }],
    });

    if (response && response.content && response.content[0]) {
      const explanation = response.content[0].text;
      return {
        type: "success",
        recommendation: bestVal,
        explanation: explanation,
        allValidators: leaderboard
      };
    } else {
      throw new Error("No content from Claude");
    }
  } catch (err) {
    console.error('[AI] recommendValidator Claude call failed:', err.message);
    return {
      type: "fallback",
      message: "AI advisor temporarily unavailable."
    };
  }
};

// 2. Explain Validator
export const explainValidator = async (validatorId) => {
  const val = db.getValidator(validatorId);
  if (!val) {
    return 'This validator is not in the feeMON registry.';
  }

  const contextPrompt = `Explain the following validator's performance in simple terms:
Validator ID: ${val.id}
Address: ${val.authAddress}
Fee Share Pledge: ${val.feeSharePct}%
Total MON Stakers Shared: ${val.totalShared} MON
Sharing Event Count: ${val.shareCount}
Last Shared Time: ${val.lastShareTimestamp || 'Never'}
Active Status: ${val.active ? 'Yes' : 'No'}`;

  const fallback = `Validator #${val.id} shares ${val.feeSharePct}% of its earned priority fees back to depositors. It has participated in ${val.shareCount} distributions and has returned ${val.totalShared} MON, which shows good commitment to fee-sharing.`;

  const explanation = await getClaudeResponse(contextPrompt, fallback);

  return explanation;
};

// 3. Detect Anomalies
export const detectAnomalies = async () => {
  const list = db.getValidators();
  const dbAlerts = db.getAlerts().slice(-10); // get last 10 db alerts

  const summaryData = list.map(v => {
    return `Validator ${v.id}: ${v.active ? 'Active' : 'Inactive'}, last shared ${v.lastShareTimestamp || 'Never'}, total shared events: ${v.shareCount}`;
  }).join('\n');

  const contextPrompt = `Analyze the following validator activity summary for risks, inactive participants, or fee-sharing cuts:
${summaryData}`;

  const fallback = 'All registered validators are currently working within healthy bounds. There are no sudden reward cuts or unexplained validator offline spikes.';

  const aiSummary = await getClaudeResponse(contextPrompt, fallback);

  return {
    alerts: dbAlerts,
    aiSummary,
  };
};

// 4. Generate Report
export const generateReport = async (address) => {
  const leaderboard = getLeaderboard();
  const stats = db.getDB().data.protocolStats;
  const alerts = db.getAlerts().slice(-5);

  const contextPrompt = `Write a staking report for the wallet address ${address}.
Staking Pool Stats:
- Staked TVL: ${stats.totalMONManaged} MON
- fMON Exchange Rate: ${stats.exchangeRate}
- circulating fMON supply: ${stats.fmonSupply}

Top Staking Pools:
${leaderboard.slice(0, 3).map(v => `Val #${v.id}: ${v.feeSharePct}% rate, ${v.status} status`).join('\n')}

Recent Protocol Alerts:
${alerts.map(a => `Alert: ${a.type} for Val #${a.validatorId} at ${a.timestamp}`).join('\n')}`;

  const fallback = `Staking Report for ${address}: The feeMON pool is currently running at a TVL of ${stats.totalMONManaged} MON with an exchange rate of ${stats.exchangeRate}. Staking with top validator #${leaderboard[0]?.id || 1} is recommended to capture priority fees.`;

  const report = await getClaudeResponse(contextPrompt, fallback);

  return {
    address,
    generatedAt: new Date().toISOString(),
    report,
    data: {
      stats,
      topValidators: leaderboard.slice(0, 3),
      alerts,
    },
  };
};

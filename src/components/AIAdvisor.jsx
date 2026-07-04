import React, { useState, useEffect } from 'react';
import { API_BASE, getValidatorName } from '../lib/contracts';

export const AIAdvisor = () => {
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Quick stats state
  const [validators, setValidators] = useState([]);
  const [activeValidatorsCount, setActiveValidatorsCount] = useState(0);
  const [highestFeeShare, setHighestFeeShare] = useState('0.0%');
  const [lastFeeShareText, setLastFeeShareText] = useState('Never');

  // Recommendation state
  const [recState, setRecState] = useState('idle'); // idle | loading | success | premium | empty | fallback | error
  const [claudeText, setClaudeText] = useState('');
  const [fallbackVal, setFallbackVal] = useState(null);

  const getRelativeTime = (timestamp) => {
    if (!timestamp) return 'Never';
    try {
      const diffMs = Date.now() - new Date(timestamp).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return new Date(timestamp).toLocaleDateString();
    } catch {
      return 'Never';
    }
  };

  const loadQuickStatsAndHealth = async () => {
    try {
      // 1. Call GET /health
      const healthRes = await fetch(`${API_BASE}/health`);
      if (!healthRes.ok) {
        setIsOffline(true);
        return;
      }
      const healthData = await healthRes.json();
      if (healthData.status !== 'ok') {
        setIsOffline(true);
        return;
      }
      setIsOffline(false);

      // 2. Call GET /validators
      const valRes = await fetch(`${API_BASE}/validators`);
      if (!valRes.ok) {
        return;
      }
      const data = await valRes.json();
      setValidators(data);

      if (data && data.length > 0) {
        const active = data.filter(v => v.status === 'active' || v.status === 'at_risk' || v.status === 'Active' || v.active).length;
        setActiveValidatorsCount(active);

        const maxShare = data.reduce((max, v) => {
          const share = parseFloat(v.feeSharePct || 0);
          return share > max ? share : max;
        }, 0);
        setHighestFeeShare(`${maxShare.toFixed(1)}%`);

        // Find latest share timestamp
        let newest = null;
        for (const v of data) {
          if (v.lastShare) {
            if (!newest || new Date(v.lastShare) > new Date(newest)) {
              newest = v.lastShare;
            }
          }
        }
        setLastFeeShareText(newest ? getRelativeTime(newest) : 'Never');
      } else {
        setActiveValidatorsCount(0);
        setHighestFeeShare('0.0%');
        setLastFeeShareText('Never');
      }
    } catch (err) {
      console.warn('[AIAdvisor] Load stats/health failed:', err);
      setIsOffline(true);
    }
  };

  useEffect(() => {
    loadQuickStatsAndHealth();
    const interval = setInterval(loadQuickStatsAndHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleGetRecommendation = async () => {
    setLoading(true);
    setRecState('loading');
    setClaudeText('');
    setFallbackVal(null);
    setIsOffline(false);

    try {
      const res = await fetch(`${API_BASE}/premium/recommend`);
      
      if (res.status === 200) {
        const data = await res.json();
        if (data.type === 'empty') {
          setRecState('empty');
          setClaudeText(data.message);
        } else if (data.type === 'fallback') {
          setRecState('fallback');
          setClaudeText(data.message);
        } else {
          setRecState('success');
          setClaudeText(data.explanation || 'No recommendation available.');
        }
      } else if (res.status === 402) {
        setRecState('premium');
        // Fetch validators immediately for fallback
        const valRes = await fetch(`${API_BASE}/validators`);
        if (valRes.ok) {
          const list = await valRes.json();
          if (list && list.length > 0) {
            setFallbackVal(list[0]);
          }
        }
      } else {
        setIsOffline(true);
        setRecState('error');
      }
    } catch (err) {
      console.warn('Recommendation fetch failed:', err);
      setIsOffline(true);
      setRecState('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-title">AI Advisor</div>
      <div className="card-desc">
        Powered by Claude. Explains validator performance and recommends where to stake.
      </div>
      <div className="ai-advisor-notice">
        0.001 MON per query via x402 · No subscription
      </div>

      {/* Backend Offline Instruction Banner */}
      {isOffline && (
        <div className="offline-banner" style={{ marginTop: '10px', textAlign: 'left', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '6px' }}>
          <p style={{ color: '#ef4444', fontWeight: '600', margin: 0, fontSize: '0.9rem' }}>Backend offline</p>
          <p style={{ fontSize: '0.8rem', marginTop: '8px', margin: 0, color: 'var(--text-secondary)' }}>Run:</p>
          <code style={{ display: 'block', marginTop: '4px', whiteSpace: 'pre-wrap', color: 'var(--text-bright, #fff)', backgroundColor: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '4px', fontSize: '0.78rem', fontFamily: 'var(--mono)' }}>
            cd backend{"\n"}npm run dev
          </code>
        </div>
      )}

      {/* Quick Stats Panel */}
      {!isOffline && (
        <div className="ai-quick-stats" style={{ borderTop: '1px solid var(--border, #2e303a)', paddingTop: '15px', marginTop: '10px' }}>
          <div style={{ fontWeight: '600', color: 'var(--text-bright, #fff)', fontSize: '0.85rem', marginBottom: '8px' }}>
            Quick Stats
          </div>
          {validators.length === 0 ? (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted, #8b8b8f)', padding: '4px 0' }}>
              No validators registered yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted, #8b8b8f)' }}>Active Validators</span>
                <span style={{ fontWeight: '500', color: 'var(--text-bright, #fff)' }}>{activeValidatorsCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted, #8b8b8f)' }}>Highest Fee Share</span>
                <span style={{ fontWeight: '500', color: 'var(--text-bright, #fff)' }}>{highestFeeShare}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted, #8b8b8f)' }}>Last Fee Share</span>
                <span style={{ fontWeight: '500', color: 'var(--text-bright, #fff)' }}>{lastFeeShareText}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="ai-actions" style={{ marginTop: '15px' }}>
        <button
          className="btn btn-secondary"
          onClick={handleGetRecommendation}
          disabled={loading || isOffline}
          style={{ width: '100%' }}
        >
          {loading && recState === 'loading' ? 'Consulting AI...' : 'Get Recommendation'}
        </button>
      </div>

      {/* Response Box Display */}
      {!isOffline && (
        <>
          {loading && (
            <div style={{ color: 'var(--text-muted, #8b8b8f)', fontSize: '0.85rem', marginTop: '15px', textAlign: 'center' }}>
              Consulting AI Advisor...
            </div>
          )}

          {/* Premium required State (402) with Fallback values */}
          {recState === 'premium' && (
            <div className="ai-response-box" style={{ marginTop: '15px', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '6px', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
              <span className="ai-response-label" style={{ color: '#ef4444', fontWeight: '600', fontSize: '0.85rem' }}>Premium feature (0.001 MON via x402)</span>
              
              {fallbackVal && (
                <div style={{ borderTop: '1px solid var(--border, #2e303a)', paddingTop: '10px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted, #8b8b8f)' }}>Top Validator</span>
                    <span style={{ fontWeight: '500', color: 'var(--text-bright, #fff)' }}>{getValidatorName(fallbackVal.id)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted, #8b8b8f)' }}>Fee Share</span>
                    <span style={{ fontWeight: '500', color: 'var(--text-bright, #fff)' }}>{parseFloat(fallbackVal.feeSharePct || 0).toFixed(1)}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted, #8b8b8f)' }}>Status</span>
                    <span style={{ fontWeight: '500', color: '#10b981' }}>Active</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--text-muted, #8b8b8f)' }}>Reason</span>
                    <span style={{ fontWeight: '500', color: 'var(--text-bright, #fff)', textAlign: 'right', maxWidth: '160px' }}>Highest registered fee-sharing commitment.</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty / Fallback / Success Claude Response States */}
          {(recState === 'success' || recState === 'empty' || recState === 'fallback') && claudeText && (
            <div className="ai-response-box" style={{ marginTop: '15px' }}>
              <span className="ai-response-label">{recState === 'success' ? 'Claude' : 'System Notice'}</span>
              <div className="ai-response-text" style={{ marginTop: '6px' }}>
                <p style={{ margin: 0, whiteSpace: 'pre-line', fontSize: '0.85rem', lineHeight: '1.45', color: 'var(--text-secondary, #9ca3af)' }}>
                  {claudeText}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AIAdvisor;

import { paymentMiddleware } from 'x402-express';
import { TREASURY_ADDRESS } from '../config.js';

let activePaymentMiddleware = null;

const isTreasurySet = TREASURY_ADDRESS && 
                      TREASURY_ADDRESS !== '0xPLACEHOLDER' && 
                      TREASURY_ADDRESS !== '';

if (isTreasurySet) {
  try {
    const networkParam = 'base-sepolia';
    activePaymentMiddleware = paymentMiddleware(
      TREASURY_ADDRESS,
      {
        'GET /recommend': { price: 0.001, network: networkParam },
        'GET /validator/[id]/explain': { price: 0.001, network: networkParam },
        'GET /alerts': { price: 0.002, network: networkParam },
        'POST /report': { price: 0.005, network: networkParam }
      },
      { url: 'https://x402.org/facilitator' }
    );
    console.log('[x402] paymentMiddleware configured successfully.');
  } catch (err) {
    console.error('[x402] Error initializing x402-express middleware:', err.message);
  }
} else {
  console.warn('[x402] TREASURY_ADDRESS not set, premium routes disabled');
}

export const x402Handler = (req, res, next) => {
  if (!activePaymentMiddleware) {
    return res.status(503).json({ error: 'Premium analytics not configured' });
  }
  return activePaymentMiddleware(req, res, next);
};

export default x402Handler;

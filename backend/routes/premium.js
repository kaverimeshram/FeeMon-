import express from 'express';
import x402Handler from '../middleware/x402.js';
import * as ai from '../services/ai.js';

const router = express.Router();

// Helper to set standard headers
const setJsonHeaders = (res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
};

// 1. Get validator recommendation
// x402 price: 0.001 MON
router.get(
  '/recommend',
  (req, res, next) => {
    req.price = 0.001;
    req.x402Price = 0.001;
    res.locals.price = 0.001;
    next();
  },
  x402Handler,
  async (req, res, next) => {
    setJsonHeaders(res);
    try {
      const { question } = req.query;
      const result = await ai.recommendValidator(question);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// 2. Explain specific validator performance
// x402 price: 0.001 MON
router.get(
  '/validator/:id/explain',
  (req, res, next) => {
    req.price = 0.001;
    req.x402Price = 0.001;
    res.locals.price = 0.001;
    next();
  },
  x402Handler,
  async (req, res, next) => {
    setJsonHeaders(res);
    try {
      const validatorId = Number(req.params.id);
      const explanation = await ai.explainValidator(validatorId);
      res.json({
        validatorId,
        explanation,
      });
    } catch (err) {
      next(err);
    }
  }
);

// 3. System anomalies report
// x402 price: 0.002 MON
router.get(
  '/alerts',
  (req, res, next) => {
    req.price = 0.002;
    req.x402Price = 0.002;
    res.locals.price = 0.002;
    next();
  },
  x402Handler,
  async (req, res, next) => {
    setJsonHeaders(res);
    try {
      const result = await ai.detectAnomalies();
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// 4. Generate customized staking report
// x402 price: 0.005 MON
router.post(
  '/report',
  (req, res, next) => {
    req.price = 0.005;
    req.x402Price = 0.005;
    res.locals.price = 0.005;
    next();
  },
  x402Handler,
  async (req, res, next) => {
    setJsonHeaders(res);
    try {
      const { address } = req.body;
      if (!address || typeof address !== 'string' || !address.startsWith('0x') || address.length < 42) {
        return res.status(400).json({ error: 'Invalid address format' });
      }
      
      const result = await ai.generateReport(address);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;

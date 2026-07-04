import express from 'express';
import cors from 'cors';
import { PORT, MONAD_RPC, FEEMON_ADDRESS, REGISTRY_ADDRESS, ANTHROPIC_API_KEY } from './config.js';
import publicRoutes from './routes/public.js';
import premiumRoutes from './routes/premium.js';
import globalErrorHandler from './middleware/errors.js';
import { startIndexer } from './services/indexer.js';
import { startHarvester, updateProtocolStats } from './services/harvester.js';
import { startRegistrySync } from './services/registry.js';
import { getDB } from './db.js';

// 1. Unhandled promise rejections catch
process.on('unhandledRejection', (err) => {
  console.error('[Unhandled]', err);
});

const startServer = async () => {
  try {
    // 2. Initialize DB (lowdb preset initialized on import, let's verify connection)
    const dbInstance = getDB();
    console.log('[Database] Setup complete. File loaded successfully.');

    // 3. Log config
    console.log('[Config] monadRPC:', MONAD_RPC);
    console.log('[Config] feeMONAddress:', FEEMON_ADDRESS);
    console.log('[Config] registryAddress:', REGISTRY_ADDRESS);
    console.log('[Config] port:', PORT);

    if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === 'your_key_here') {
      console.warn('[Warning] ANTHROPIC_API_KEY is not set. AI advisory recommendations will not be available.');
    }

    const app = express();
    const allowedOrigins = new Set([
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5174',
      'http://localhost:5175',
      'http://127.0.0.1:5175',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ]);

    // CORS Setup
    const isAllowedOrigin = (origin) => {
      if (!origin) return true;
      if (allowedOrigins.has(origin)) return true;
      // Allow Vercel deployments
      if (origin.endsWith('.vercel.app')) return true;
      return false;
    };

    app.use(
      cors({
        origin: (origin, callback) => {
          callback(null, isAllowedOrigin(origin));
        },
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-402-Payment', 'X-PAYMENT'],
      })
    );
    app.options('*', cors()); // handle preflight

    app.use(express.json());

    // 4. Mount public routes at /
    app.use('/', publicRoutes);

    // 5. Mount premium routes at /premium
    app.use('/premium', premiumRoutes);

    // 6. Mount error handler (must be last)
    app.use(globalErrorHandler);

    // Start Express server
    const server = app.listen(PORT, () => {
      console.log(`[Server] Listening on port ${PORT}`);
    });

    // 7. Start Indexer
    startIndexer();

    // 8. Start Harvester
    startHarvester();

    // 9. Start Registry Sync
    startRegistrySync();

    // 10. Run updateProtocolStats once immediately on startup
    await updateProtocolStats();

    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      console.log('[Server] SIGTERM received. Closing Express server...');
      server.close(() => {
        console.log('[Server] Express server closed. Exiting.');
        process.exit(0);
      });
    });

  } catch (err) {
    console.error('[Server] Critical boot failure:', err.message);
    process.exit(1);
  }
};

startServer();

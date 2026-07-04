import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const MONAD_RPC = process.env.MONAD_RPC || 'https://testnet-rpc.monad.xyz';
export const FEEMON_ADDRESS = process.env.FEEMON_ADDRESS || '0x0000000000000000000000000000000000000000';
export const REGISTRY_ADDRESS = process.env.REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000';
export const FMON_ADDRESS = process.env.FMON_ADDRESS || '0x0000000000000000000000000000000000000000';
export const KEEPER_PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY || '';
export const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || '';
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
export const PORT = Number(process.env.PORT) || 3001;
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DB_PATH = process.env.DB_PATH && path.isAbsolute(process.env.DB_PATH)
  ? process.env.DB_PATH
  : path.resolve(__dirname, process.env.DB_PATH || './data/db.json');

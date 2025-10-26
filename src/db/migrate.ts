#!/usr/bin/env node
import { initDb, closeDb } from './index.js';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

const dbPath = process.env.DATABASE_PATH || './data/arcana.db';

// Ensure data directory exists
mkdirSync(dirname(dbPath), { recursive: true });

console.log('Running database migrations...');
initDb();
console.log('✓ Database initialized successfully');

closeDb();

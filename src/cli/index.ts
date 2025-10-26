#!/usr/bin/env node
import { Command } from 'commander';
import { config } from 'dotenv';
import { initDb } from '../db/index.js';
import { returnsCommand } from './commands/returns.js';
import { replayCommand } from './commands/replay.js';
import { ladderCommand } from './commands/ladder.js';
import { keysCommand } from './commands/keys.js';

// Load environment
config();

// Initialize database
initDb();

const program = new Command();

program
  .name('arcana')
  .description('Arcana Returns CLI - Analyst controls and simulation')
  .version('0.1.0');

// Register commands
program.addCommand(returnsCommand);
program.addCommand(replayCommand);
program.addCommand(ladderCommand);
program.addCommand(keysCommand);

program.parse();

import { Command } from 'commander';
import { AELService } from '../../services/ael.js';
import { writeFileSync } from 'fs';

const aelService = new AELService();

export const replayCommand = new Command('replay')
  .description('Replay and export decision artifacts');

replayCommand
  .command('export')
  .description('Export replay bundle for a decision')
  .requiredOption('--decision <decisionId>', 'Decision ID to replay')
  .requiredOption('--out <path>', 'Output file path')
  .action(async (options) => {
    try {
      console.log(`Generating replay for decision ${options.decision}...`);
      
      const replayId = await aelService.generateReplay(options.decision);
      const replay = aelService.getReplay(replayId);
      
      if (!replay) {
        throw new Error('Failed to generate replay');
      }
      
      // Create bundle
      const bundle = {
        replay_id: replay.replay_id,
        decision_id: replay.decision_id,
        env_lock: replay.env_lock,
        inputs: replay.inputs,
        outputs: replay.outputs,
        created_at: replay.created_at,
      };
      
      writeFileSync(options.out, JSON.stringify(bundle, null, 2));
      
      console.log(`\n✓ Replay bundle exported to ${options.out}`);
      console.log(`Replay ID: ${replayId}`);
      console.log(`Decision: ${replay.outputs.decision}`);
      console.log(`Policy Hash: ${replay.env_lock.policy_snapshot_hash.substring(0, 20)}...`);
      console.log();
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

replayCommand
  .command('diff')
  .description('Compare two decisions')
  .requiredOption('--baseline <decisionId>', 'Baseline decision ID')
  .requiredOption('--candidate <decisionId>', 'Candidate decision ID')
  .action(async (options) => {
    try {
      const diff = aelService.diffDecisions(options.baseline, options.candidate);
      
      console.log('\n=== Decision Diff ===\n');
      console.log('Baseline:', options.baseline);
      console.log('Candidate:', options.candidate);
      console.log();
      console.log('Decision Changed:', diff.changes.decision_delta.changed ? 'YES' : 'NO');
      if (diff.changes.decision_delta.changed) {
        console.log(`  ${diff.changes.decision_delta.baseline} → ${diff.changes.decision_delta.candidate}`);
      }
      console.log();
      console.log('Rationale Changes:', diff.changes.rationale_delta.length);
      for (const delta of diff.changes.rationale_delta) {
        console.log(`  - ${delta.baseline_value || '(none)'} → ${delta.candidate_value || '(none)'}`);
      }
      console.log();
      console.log('Summary:', diff.summary);
      console.log();
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

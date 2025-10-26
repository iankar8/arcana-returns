import { Command } from 'commander';

export const ladderCommand = new Command('ladder')
  .description('Evidence ladder configuration (v0: display only)');

ladderCommand
  .command('show')
  .description('Show current evidence ladder configuration')
  .action(() => {
    console.log('\n=== Evidence Ladder (v0) ===\n');
    console.log('Risk Threshold | Required Evidence');
    console.log('---------------|------------------');
    console.log('0.0 - 0.3      | None');
    console.log('0.3 - 0.6      | photo_packaging');
    console.log('0.6 - 1.0      | photo_packaging, photo_item');
    console.log();
    console.log('Note: v0 ladder is hardcoded. Use --set in future versions to adjust.');
    console.log();
  });

ladderCommand
  .command('set')
  .description('Set evidence requirement (v0: display only, non-enforcing)')
  .requiredOption('--evidence <type>', 'Evidence type')
  .requiredOption('--threshold <condition>', 'Condition (e.g., "risk>0.3")')
  .action((options) => {
    console.log('\n⚠️  Evidence ladder adjustment not enforced in v0');
    console.log(`Would set: ${options.evidence} required when ${options.threshold}`);
    console.log('This will be implemented in a future version.\n');
  });

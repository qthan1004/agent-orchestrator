import { PromptBuilder } from '../src/worker/prompt-builder.ts';

async function run() {
  const pb = new PromptBuilder();
  
  // Test 1: implement
  console.log('--- TEST 1: implement ---');
  console.log(await pb.buildPrompt({ id: 'TASK-01', action: 'implement', module: 'src/main.ts', workspaceRoot: '/foo/bar' }));
  
  // Test 2: missing skill
  console.log('\n--- TEST 2: missing skill ---');
  console.log(await pb.buildPrompt({ id: 'TASK-02', action: 'unknown', module: 'src/test.ts', workspaceRoot: '/foo/bar' }));
}

run().catch(console.error);

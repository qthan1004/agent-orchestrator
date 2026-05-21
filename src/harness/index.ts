import { pathToFileURL } from 'url';
import { parseHarnessPayload } from './payload.js';
import { executeHarness } from './runner.js';
import { SYSTEM_MESSAGE } from '../constants.js';

async function readStdin(): Promise<string> {
  let rawInput = '';
  for await (const chunk of process.stdin) {
    rawInput += chunk;
  }
  return rawInput;
}

export async function main(): Promise<number> {
  try {
    const payload = parseHarnessPayload(await readStdin());
    return await executeHarness(payload);
  } catch (err: any) {
    console.error(SYSTEM_MESSAGE.AGENT_PARSE_FAILED, err.message);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(code => process.exit(code));
}

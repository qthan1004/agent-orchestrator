import fs from 'fs/promises';
import { pathToFileURL } from 'url';
import { parseHarnessPayload } from './payload.js';
import { executeHarness } from './runner.js';
import { SYSTEM_MESSAGE } from '../constants.js';

function getArgValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function readPayloadInput(): Promise<string> {
  const payloadFile = getArgValue('--payload-file') || process.env.ORCHESTRATOR_HARNESS_PAYLOAD_FILE;
  if (payloadFile) {
    return await fs.readFile(payloadFile, 'utf-8');
  }

  let rawInput = '';
  for await (const chunk of process.stdin) {
    rawInput += chunk;
  }
  return rawInput;
}

export async function main(): Promise<number> {
  try {
    const payload = parseHarnessPayload(await readPayloadInput());
    return await executeHarness(payload);
  } catch (err: any) {
    console.error(SYSTEM_MESSAGE.AGENT_PARSE_FAILED, err.message);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(code => process.exit(code));
}

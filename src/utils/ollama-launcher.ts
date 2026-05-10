import { spawn, type ChildProcess } from 'child_process';

const OLLAMA_STARTUP_TIMEOUT_MS = 15_000;
const OLLAMA_HEALTH_POLL_MS = 500;

/**
 * Ensure Ollama is running. If not, auto-start `ollama serve` as background process.
 * Waits until health check passes or timeout.
 * 
 * @param baseUrl Ollama API base URL (default: http://localhost:11434)
 * @returns true if Ollama is ready
 */
export async function ensureOllamaRunning(baseUrl: string = 'http://localhost:11434'): Promise<boolean> {
  // 1. Quick health check — maybe already running
  if (await ollamaHealthCheck(baseUrl)) {
    return true;
  }

  console.log(`  ┌─ \x1b[35m[Ollama] Starting ollama serve...\x1b[0m`);

  let ollamaProcess: ChildProcess;
  try {
    ollamaProcess = spawn('ollama', ['serve'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
      shell: true,
    });

    // Unref so it doesn't prevent Node from exiting
    ollamaProcess.unref();

    // Forward Ollama output — spawn = must be visible
    ollamaProcess.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().trim();
      if (lines) {
        for (const line of lines.split('\n')) {
          console.log(`  │ \x1b[35m[Ollama]\x1b[0m ${line}`);
        }
      }
    });
    ollamaProcess.stderr?.on('data', (data: Buffer) => {
      const lines = data.toString().trim();
      if (lines) {
        for (const line of lines.split('\n')) {
          console.log(`  │ \x1b[35m[Ollama]\x1b[0m ${line}`);
        }
      }
    });

    ollamaProcess.on('error', (err) => {
      console.error(`  └─ \x1b[31m[Ollama] Failed to start: ${err.message}\x1b[0m`);
      console.error('     → Install Ollama: https://ollama.com/download');
    });

    ollamaProcess.on('exit', (code, signal) => {
      const exitInfo = signal ? `signal=${signal}` : `code=${code}`;
      console.log(`  └─ \x1b[90m[Ollama] Process exited (${exitInfo})\x1b[0m`);
    });
  } catch (err: any) {
    console.error(`  └─ \x1b[31m[Ollama] Cannot spawn: ${err.message}\x1b[0m`);
    return false;
  }

  // 3. Wait for health check to pass
  const startTime = Date.now();
  while (Date.now() - startTime < OLLAMA_STARTUP_TIMEOUT_MS) {
    await sleep(OLLAMA_HEALTH_POLL_MS);
    if (await ollamaHealthCheck(baseUrl)) {
      console.log(`  │ \x1b[32m[Ollama] Ready ✓\x1b[0m`);
      return true;
    }
  }

  console.error(`  └─ \x1b[31m[Ollama] Did not start within ${OLLAMA_STARTUP_TIMEOUT_MS / 1000}s\x1b[0m`);
  return false;
}

/**
 * Quick health check for Ollama API.
 */
async function ollamaHealthCheck(baseUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`${baseUrl}/api/tags`, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

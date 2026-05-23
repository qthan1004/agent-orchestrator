import { RESOURCE_TABLE_COLUMNS, RESOURCE_TABLE_TEXT } from './constants.js';
import type { InfraResourceSnapshot } from '../infra/index.js';
import type { VisibilityResourceTableRow } from './models.js';

export function renderInfraResourceTable(snapshot: InfraResourceSnapshot): string {
  const workerRows = snapshot.active_workers.length === 0
    ? [{
        resource: RESOURCE_TABLE_TEXT.RESOURCE_WORKERS,
        status: RESOURCE_TABLE_TEXT.IDLE,
        details: RESOURCE_TABLE_TEXT.NONE,
      }]
    : snapshot.active_workers.map(worker => ({
        resource: `${RESOURCE_TABLE_TEXT.RESOURCE_WORKER}:${shortId(worker.worker_id)}`,
        status: worker.phase || (worker.ready ? RESOURCE_TABLE_TEXT.RUNNING : RESOURCE_TABLE_TEXT.STARTING),
        details: formatWorkerDetails(worker),
      }));

  const rows: VisibilityResourceTableRow[] = [
    {
      resource: RESOURCE_TABLE_TEXT.RESOURCE_SNAPSHOT,
      status: formatUptime(snapshot.uptime_seconds),
      details: snapshot.checked_at,
    },
    {
      resource: RESOURCE_TABLE_TEXT.RESOURCE_DISPATCH,
      status: snapshot.dispatch_loop === RESOURCE_TABLE_TEXT.RUNNING
        ? RESOURCE_TABLE_TEXT.RUNNING
        : RESOURCE_TABLE_TEXT.STOPPED,
      details: `${RESOURCE_TABLE_TEXT.COUNT}=${snapshot.active_workers.length}`,
    },
    {
      resource: RESOURCE_TABLE_TEXT.RESOURCE_QUEUE,
      status: snapshot.queue.pending + snapshot.queue.active > 0
        ? RESOURCE_TABLE_TEXT.WORK
        : RESOURCE_TABLE_TEXT.IDLE,
      details: `${RESOURCE_TABLE_TEXT.QUEUE_PREFIX}=${snapshot.queue.pending}/${snapshot.queue.active}/${snapshot.queue.done}/${snapshot.queue.failed}/${snapshot.queue.blocked}/${snapshot.queue.total}`,
    },
    ...workerRows,
    {
      resource: RESOURCE_TABLE_TEXT.RESOURCE_CAPACITY,
      status: snapshot.capacity?.provider ?? RESOURCE_TABLE_TEXT.UNAVAILABLE,
      details: formatCapacity(snapshot),
    },
    {
      resource: RESOURCE_TABLE_TEXT.RESOURCE_OLLAMA,
      status: snapshot.ollama.healthy ? RESOURCE_TABLE_TEXT.ONLINE : RESOURCE_TABLE_TEXT.OFFLINE,
      details: formatOllama(snapshot),
    },
    {
      resource: RESOURCE_TABLE_TEXT.RESOURCE_WARM_CACHE,
      status: snapshot.warm_model_cache && snapshot.warm_model_cache.length > 0 ? RESOURCE_TABLE_TEXT.ACTIVE : RESOURCE_TABLE_TEXT.IDLE,
      details: formatWarmCache(snapshot),
    },
    {
      resource: RESOURCE_TABLE_TEXT.RESOURCE_VRAM,
      status: formatVramStatus(snapshot),
      details: formatVramDetails(snapshot),
    },
    {
      resource: RESOURCE_TABLE_TEXT.RESOURCE_RAM,
      status: `${snapshot.ram.percentage.toFixed(1)}%`,
      details: `${snapshot.ram.used_mb}/${snapshot.ram.total_mb} ${RESOURCE_TABLE_TEXT.UNIT_MB} ${RESOURCE_TABLE_TEXT.USED}`,
    },
    {
      resource: RESOURCE_TABLE_TEXT.RESOURCE_CPU,
      status: `${snapshot.cpu.load_1m.toFixed(2)}`,
      details: `${RESOURCE_TABLE_TEXT.LOAD}=${snapshot.cpu.load_1m.toFixed(2)}/${snapshot.cpu.load_5m.toFixed(2)}/${snapshot.cpu.load_15m.toFixed(2)}, ${RESOURCE_TABLE_TEXT.CORES}=${snapshot.cpu.cores}`,
    },
  ];

  return [
    `${RESOURCE_TABLE_TEXT.TITLE} ${snapshot.checked_at}`,
    separator(),
    row(RESOURCE_TABLE_TEXT.HEADER_RESOURCE, RESOURCE_TABLE_TEXT.HEADER_STATUS, RESOURCE_TABLE_TEXT.HEADER_DETAILS),
    separator(),
    ...rows.map(item => row(item.resource, item.status, item.details)),
    separator(),
  ].join('\n');
}

export function createInfraResourceTablePrinter(): (snapshot: InfraResourceSnapshot) => void {
  let lastLineCount = 0;
  return (snapshot: InfraResourceSnapshot) => {
    const table = renderInfraResourceTable(snapshot);
    if (!process.stdout.isTTY || process.env.ORCHESTRATOR_RESOURCE_TABLE_REDRAW === '0') {
      console.log(table);
      return;
    }

    if (lastLineCount > 0) {
      process.stdout.write(`\x1b[${lastLineCount}F\x1b[J`);
    }
    process.stdout.write(`${table}\n`);
    lastLineCount = table.split('\n').length;
  };
}

function formatWarmCache(snapshot: InfraResourceSnapshot): string {
  const cache = snapshot.warm_model_cache ?? [];
  if (cache.length === 0) return RESOURCE_TABLE_TEXT.NONE;
  return cache
    .map(entry => `${entry.key.backend}:${entry.key.model}`)
    .join(', ');
}

function formatCapacity(snapshot: InfraResourceSnapshot): string {
  if (!snapshot.capacity) return RESOURCE_TABLE_TEXT.UNAVAILABLE;
  return `${RESOURCE_TABLE_TEXT.RUNTIMES}=${snapshot.capacity.max_local_runtimes}, ${RESOURCE_TABLE_TEXT.BACKENDS}=${snapshot.capacity.supported_backends.join(', ')}`;
}

function formatUptime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;
  if (hours > 0) return `${hours}${RESOURCE_TABLE_TEXT.HOUR} ${minutes}${RESOURCE_TABLE_TEXT.MINUTE}`;
  if (minutes > 0) return `${minutes}${RESOURCE_TABLE_TEXT.MINUTE} ${remainingSeconds}${RESOURCE_TABLE_TEXT.SECOND}`;
  return `${remainingSeconds}${RESOURCE_TABLE_TEXT.SECOND}`;
}

function formatOllama(snapshot: InfraResourceSnapshot): string {
  if (snapshot.ollama.error) return snapshot.ollama.error;
  if (snapshot.ollama.loaded_models.length === 0) return `${RESOURCE_TABLE_TEXT.MODELS}=0`;
  return `${RESOURCE_TABLE_TEXT.MODELS}=${snapshot.ollama.loaded_models.join(', ')}`;
}

function formatWorkerDetails(worker: InfraResourceSnapshot['active_workers'][number]): string {
  const parts = [
    `pid=${worker.pid}`,
    `task=${worker.task_id ?? RESOURCE_TABLE_TEXT.NONE}`,
    worker.model ? `model=${worker.model}` : '',
    worker.backend ? `backend=${worker.backend}` : '',
    worker.current_tool ? `tool=${worker.current_tool}` : '',
    worker.current_file ? `file=${worker.current_file}` : '',
    worker.context_usage ? `ctx=${Math.round(worker.context_usage.percent)}%` : '',
    worker.visible_terminal ? 'terminal=visible' : '',
    worker.message ? `msg=${worker.message}` : '',
  ].filter(Boolean);
  return parts.join(' ');
}

function shortId(value: string): string {
  return value.length > 8 ? value.slice(0, 8) : value;
}

function formatVramStatus(snapshot: InfraResourceSnapshot): string {
  if (!snapshot.vram.available || typeof snapshot.vram.percentage !== 'number') {
    return RESOURCE_TABLE_TEXT.UNAVAILABLE;
  }
  return `${snapshot.vram.percentage.toFixed(1)}%`;
}

function formatVramDetails(snapshot: InfraResourceSnapshot): string {
  if (snapshot.vram.error) return snapshot.vram.error;
  if (!snapshot.vram.available || typeof snapshot.vram.used_mb !== 'number' || typeof snapshot.vram.total_mb !== 'number') {
    return RESOURCE_TABLE_TEXT.UNAVAILABLE;
  }
  return `${snapshot.vram.used_mb}/${snapshot.vram.total_mb} ${RESOURCE_TABLE_TEXT.UNIT_MB} ${RESOURCE_TABLE_TEXT.USED}`;
}

function separator(): string {
  const { RESOURCE, STATUS, DETAILS } = RESOURCE_TABLE_COLUMNS;
  return `+-${'-'.repeat(RESOURCE)}-+-${'-'.repeat(STATUS)}-+-${'-'.repeat(DETAILS)}-+`;
}

function row(resource: string, status: string, details: string): string {
  const { RESOURCE, STATUS, DETAILS } = RESOURCE_TABLE_COLUMNS;
  return `| ${cell(resource, RESOURCE)} | ${cell(status, STATUS)} | ${cell(details, DETAILS)} |`;
}

function cell(value: string, width: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  const clipped = normalized.length > width ? `${normalized.slice(0, Math.max(0, width - 3))}...` : normalized;
  return clipped.padEnd(width, ' ');
}

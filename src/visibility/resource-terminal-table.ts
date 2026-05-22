import { RESOURCE_TABLE_COLUMNS, RESOURCE_TABLE_TEXT } from './constants.js';
import type { InfraResourceSnapshot } from '../infra/models.js';

type ResourceRow = {
  resource: string;
  status: string;
  details: string;
};

export function renderInfraResourceTable(snapshot: InfraResourceSnapshot): string {
  const rows: ResourceRow[] = [
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
    {
      resource: RESOURCE_TABLE_TEXT.RESOURCE_WORKERS,
      status: snapshot.active_workers.length > 0 ? RESOURCE_TABLE_TEXT.ACTIVE : RESOURCE_TABLE_TEXT.IDLE,
      details: formatWorkers(snapshot),
    },
    {
      resource: RESOURCE_TABLE_TEXT.RESOURCE_OLLAMA,
      status: snapshot.ollama.healthy ? RESOURCE_TABLE_TEXT.ONLINE : RESOURCE_TABLE_TEXT.OFFLINE,
      details: formatOllama(snapshot),
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

function formatUptime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;
  if (hours > 0) return `${hours}${RESOURCE_TABLE_TEXT.HOUR} ${minutes}${RESOURCE_TABLE_TEXT.MINUTE}`;
  if (minutes > 0) return `${minutes}${RESOURCE_TABLE_TEXT.MINUTE} ${remainingSeconds}${RESOURCE_TABLE_TEXT.SECOND}`;
  return `${remainingSeconds}${RESOURCE_TABLE_TEXT.SECOND}`;
}

function formatWorkers(snapshot: InfraResourceSnapshot): string {
  if (snapshot.active_workers.length === 0) return RESOURCE_TABLE_TEXT.NONE;
  return snapshot.active_workers
    .map(worker => `${worker.worker_id}:${worker.task_id ?? RESOURCE_TABLE_TEXT.NONE}`)
    .join(', ');
}

function formatOllama(snapshot: InfraResourceSnapshot): string {
  if (snapshot.ollama.error) return snapshot.ollama.error;
  if (snapshot.ollama.loaded_models.length === 0) return `${RESOURCE_TABLE_TEXT.MODELS}=0`;
  return `${RESOURCE_TABLE_TEXT.MODELS}=${snapshot.ollama.loaded_models.join(', ')}`;
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

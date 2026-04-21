import fs from 'fs';
import path from 'path';
import { StateManager } from '../src/mcp-server/state-manager.js';
import { Logger } from '../src/utils/logger.js';
import { loadConfig } from '../src/config.js';
import { listFiles } from '../src/utils/file-backend.js';
import { TASK_STATUS } from '../src/constants.js';

const config = loadConfig();
const logger = new Logger(config.exchange.logs);

// Xóa sạch các file cũ trong các folder exchange để chạy test cho sạch sẽ
function resetExchange() {
  const dirs = [config.exchange.inbox, config.exchange.active, config.exchange.outbox];
  for (const dir of dirs) {
     if (fs.existsSync(dir)) {
       fs.readdirSync(dir).forEach((f) => fs.unlinkSync(path.join(dir, f)));
     }
  }
}

resetExchange();

const sm = new StateManager(logger, config);

// Graph DAG testing:
// Nhóm 1 (Task 1, 2) ---> Nhóm 2 (Task 3) ---> Nhóm 3 (Task 4)
const tasks = [
  { id: '1', module: 'visual-queue', action: 'Task 1 (Gr 1)', verification: 'Task 1 completes' },
  { id: '2', module: 'visual-queue', action: 'Task 2 (Gr 1)', verification: 'Task 2 completes' },
  { id: '3', module: 'visual-queue', action: 'Task 3 (Gr 2)', verification: 'Task 3 completes' },
  { id: '4', module: 'visual-queue', action: 'Task 4 (Gr 3)', verification: 'Task 4 completes' }
];
const graph = {
  groups: [
    { group_id: 1, tasks: ['1', '2'] },
    { group_id: 2, tasks: ['3'], depends_on: [1] },
    { group_id: 3, tasks: ['4'], depends_on: [2] }
  ]
};

// Hàm hỗ trợ in trực quan terminal
function displayState(stepTitle: string) {
  console.log(`\n======================================================`);
  console.log(`  ${stepTitle}`);
  console.log(`======================================================`);
  const status = sm.getStatus();
  
  // Hiển thị trạng thái RAM (Logical Queue)
  console.log(`📊 [IN-MEMORY] Pending: ${status.pending} | Active: ${status.active} | Done: ${status.done} | Failed: ${status.failed}`);
  
  // Hiển thị các block đang được Unlock có thể bốc đi chạy
  const unlocked = sm.queue.getUnlockedTasks();
  console.log('🔓 [UNLOCKED] (NXT):', unlocked.map(t => t.action).join(' | ') || '(None)');

  // Hiển thị thư mục ổ cứng (Dual-Write persistence)
  const inbox = listFiles(config.exchange.inbox, '.json');
  const active = listFiles(config.exchange.active, '.json');
  const outbox = listFiles(config.exchange.outbox, '.json');
  
  console.log('------------------------------------------------------');
  console.log('📁 Inbox  (Files):', inbox.join(', ') || '(empty)');
  console.log('🔄 Active (Files):', active.join(', ') || '(empty)');
  console.log('✅ Outbox (Files):', outbox.join(', ') || '(empty)');
}

// Bắt đầu simulate từng step
async function runTest() {
  sm.storeTasks(tasks, graph);
  displayState('1. KHỞI TẠO BƯỚC ĐẦU (Store Tasks)');
  await new Promise(r => setTimeout(r, 2000));

  sm.moveToActive('1');
  displayState('2. WORKER CHỌN TASK 1 (Chuyển sang Active)');
  await new Promise(r => setTimeout(r, 2000));

  sm.moveToActive('2');
  displayState('3. WORKER CHỌN TASK 2 (Chuyển sang Active)');
  await new Promise(r => setTimeout(r, 2000));

  // Lúc này Nhóm 2 (Task 3) VẪN CHƯA BỊ UNLOCK vì Nhóm 1 chưa hoàn thành hoàn toàn
  sm.moveToOutbox('1', {
    task_id: '1',
    status: TASK_STATUS.DONE,
    summary: 'ok1',
    worker_id: 'visual-queue-test',
    completed_at: new Date().toISOString()
  });
  displayState('4. TASK 1 HOÀN THÀNH (Task 2 vẫn đang Active)');
  await new Promise(r => setTimeout(r, 2000));

  sm.moveToOutbox('2', {
    task_id: '2',
    status: TASK_STATUS.DONE,
    summary: 'ok2',
    worker_id: 'visual-queue-test',
    completed_at: new Date().toISOString()
  });
  displayState('5. TASK 2 HOÀN THÀNH (Nhóm 1 đã xong toàn bộ)'); 
  // Lúc này Task 3 (Nhóm 2) sẽ hiện ở mục Unlocked!
  await new Promise(r => setTimeout(r, 2000));

  sm.moveToActive('3');
  displayState('6. WORKER CHỌN TASK 3 (Đã qua phụ thuộc)');
  await new Promise(r => setTimeout(r, 2000));
}

runTest();

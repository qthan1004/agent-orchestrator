import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTools } from './src/mcp-server/tools.mjs';
import { StateManager } from './src/mcp-server/state-manager.mjs';
import { Logger } from './src/utils/logger.mjs';
import { loadConfig } from './src/config.mjs';

const config = loadConfig();
const mockLogger = new Logger(config.exchange.logs);
const mockState = new StateManager(mockLogger);

const server = new McpServer({ name: 'test', version: '1.0.0' });
registerTools(server, { stateManager: mockState, logger: mockLogger, config });

console.log('Server tools registered successfully');


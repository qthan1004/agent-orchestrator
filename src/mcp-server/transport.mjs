import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import crypto from 'crypto';
import { createServer } from './server.mjs';
import { API_ROUTES } from '../constants.mjs';

export function setupMcpRoutes(app) {
  const transports = {};

  // GET /mcp
  app.get(API_ROUTES.MCP, async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] || req.query.sessionId;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    await transports[sessionId].handleRequest(req, res);
  });

  // POST /mcp
  app.post(API_ROUTES.MCP, async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] || req.query.sessionId;

    if (sessionId && transports[sessionId]) {
      // ✅ Reuse existing session
      await transports[sessionId].handleRequest(req, res, req.body);
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // ✅ New session → new transport + new server
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (sid) => {
          transports[sid] = transport;
        }
      });
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) delete transports[sid];
      };
      const server = createServer();
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } else {
      // ❌ Bad request
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
        id: null
      });
    }
  });

  // DELETE /mcp
  app.delete(API_ROUTES.MCP, async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] || req.query.sessionId;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    await transports[sessionId].handleRequest(req, res);
  });

  return transports;
}

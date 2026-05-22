import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import crypto from 'crypto';
import type { Express, Request, Response } from 'express';
import { createServer } from './server.js';
import { API_ROUTES } from '../constants.js';
import type { ServerContext } from './context.js';

export type McpTransports = Record<string, StreamableHTTPServerTransport>;

function getSessionId(req: Request): string | undefined {
  const header = req.headers['mcp-session-id'];
  const sessionId = Array.isArray(header) ? header[0] : header;
  const queryId = Array.isArray(req.query.sessionId) ? req.query.sessionId[0] : req.query.sessionId;
  return sessionId || (typeof queryId === 'string' ? queryId : undefined);
}

export function setupMcpRoutes(app: Express, context: ServerContext): McpTransports {
  const transports: McpTransports = {};

  // GET /mcp
  app.get(API_ROUTES.MCP, async (req: Request, res: Response) => {
    const sessionId = getSessionId(req);
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    await transports[sessionId].handleRequest(req, res);
  });

  // POST /mcp
  app.post(API_ROUTES.MCP, async (req: Request, res: Response) => {
    const sessionId = getSessionId(req);

    if (sessionId && transports[sessionId]) {
      // Reuse existing session
      await transports[sessionId].handleRequest(req, res, req.body);
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New session → new transport + new server
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (sid: string) => {
          transports[sid] = transport;
        }
      });
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) delete transports[sid];
      };
      const server = createServer(context);
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } else {
      // Bad request
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
        id: null
      });
    }
  });

  // DELETE /mcp
  app.delete(API_ROUTES.MCP, async (req: Request, res: Response) => {
    const sessionId = getSessionId(req);
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    await transports[sessionId].handleRequest(req, res);
  });

  return transports;
}

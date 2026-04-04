import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import crypto from 'crypto';

export function setupMcpRoutes(app, server) {
  const sessions = new Map();
  
  app.post('/mcp', async (req, res, next) => {
    try {
      /* 
      // Uncomment to debug incoming requests
      console.log(`[REQ] ${req.method} ${req.url}`);
      console.log(`[HEADERS]`, req.headers);
      console.log(`[QUERY]`, req.query);
      console.log(`[BODY]`, req.body);
      */
      
      let sessionId = req.headers['mcp-session-id'] || req.query.sessionId;
      let transport = sessionId ? sessions.get(sessionId) : null;
      
      if (!transport) {
        // console.log(`[SESSION] Creating new transport for session`);
        let generatedId;
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => {
            generatedId = crypto.randomUUID();
            return generatedId;
          },
        });
        
        transport.onclose = () => {
          // console.log(`[SESSION] Closed ${transport.sessionId}`);
          sessions.delete(transport.sessionId);
        };
        
        // Close existing transport if we only support 1 single connection for this POC
        if (sessions.size > 0) {
          // console.log(`[SESSION] Clearing ${sessions.size} existing sessions`);
          sessions.forEach(t => t.close());
          sessions.clear();
        }
        
        try {
          await server.connect(transport);
          // console.log(`[SESSION] Server connected`);
        } catch (err) {
          if (err.message.includes('Already connected')) {
            // console.log(`[SESSION] Re-connecting server instance`);
            await server.close();
            await server.connect(transport);
          } else {
            throw err;
          }
        }
        
        // Ensure transport handleRequest runs first so sessionIdGenerator is invoked!
        await transport.handleRequest(req, res, req.body);
        
        if (generatedId) {
          // console.log(`[SESSION] Saving transport with ID: ${generatedId}`);
          sessions.set(generatedId, transport);
        } else if (transport.sessionId) {
          // console.log(`[SESSION] Saving transport with fallback ID: ${transport.sessionId}`);
          sessions.set(transport.sessionId, transport);
        } else {
          console.error(`[SESSION] Missing session ID. Generator wasn't called?`);
        }
      } else {
        // console.log(`[SESSION] Reusing transport ${sessionId}`);
        await transport.handleRequest(req, res, req.body);
      }
    } catch (error) {
      console.error(`[ERROR]`, error);
      next(error);
    }
  });
}

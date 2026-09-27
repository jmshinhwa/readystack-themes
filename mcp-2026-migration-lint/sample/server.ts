import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  InitializeRequestSchema,
  PingRequestSchema,
  SetLevelRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";

const PROTOCOL_VERSION = "2025-06-18";

const server = new Server(
  { name: "notes-server", version: "1.3.0" },
  { capabilities: { tools: {}, logging: {} } }
);

server.setRequestHandler(InitializeRequestSchema, async (req) => ({
  protocolVersion: PROTOCOL_VERSION,
  capabilities: { tools: {} },
  serverInfo: { name: "notes-server", version: "1.3.0" },
}));

server.setRequestHandler(PingRequestSchema, async () => ({}));

server.setRequestHandler(SetLevelRequestSchema, async (req) => {
  currentLevel = req.params.level;
  return {};
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{ name: "search_notes", inputSchema: { type: "object" } }],
}));

const app = express();
const transports: Record<string, SSEServerTransport> = {};

app.get("/sse", async (req, res) => {
  const sessionId = req.header("Mcp-Session-Id");
  const resumeFrom = req.header("Last-Event-ID");
  const transport = new SSEServerTransport("/messages", res);
  transports[transport.sessionId] = transport;
  await server.connect(transport);
});

function notFound(uri: string) {
  return { code: -32002, message: "Resource not found: " + uri };
}

app.listen(3001);

import express from 'express';
import 'dotenv/config';

import './connectors/github.js';
import './connectors/smtp.js';
import './connectors/slack.js';

import { getTool, listTools } from './registry/tool-registry.js';
import { authenticate } from './security/auth.js';
import { executeTool } from './execution-engine.js';
import { getMetrics } from './observability.js';

const app = express();
app.use(express.json());

app.get('/tools', (req, res) => {
  const tools = listTools().map(([name, tool]) => ({
    name,
    description: tool.description,
    inputSchema: tool.inputSchema || null,
    outputSchema: tool.outputSchema || null,
    auth: tool.auth || null,
  }));
  res.json({ tools });
});

app.post('/tools/:name', async (req, res) => {
  try {
    const tool = getTool(req.params.name);
    if (!tool) return res.status(404).json({ error: 'Tool not found' });
    let authInfo;
    try {
      authInfo = authenticate(req.headers);
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const context = { tenant: authInfo.tenantId || 'default', customSecret: process.env.CUSTOM_SECRET };
    const result = await executeTool(tool, context, req.body || {}, { retries: tool.retries, timeoutMs: tool.timeoutMs });
    res.json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.get('/metrics', (req, res) => {
  res.json({ metrics: getMetrics() });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.error(`HTTP proxy listening on http://localhost:${port}`);
});

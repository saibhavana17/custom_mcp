import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { listTools } from './registry/tool-registry.js';
import 'dotenv/config';  
import { executeTool } from './execution-engine.js';

// Import connectors — each self-registers its tools in the registry
import './connectors/github.js';
import './connectors/smtp.js';
import './connectors/slack.js';

const server = new McpServer({
    name: "connector-platform",
    version: "1.0.0",
});

const CUSTOM_SECRET = process.env.CUSTOM_SECRET;

if (!CUSTOM_SECRET) {
  console.error("CUSTOM_SECRET environment variable is required");
  process.exit(1);
}

// Convert a JSON Schema property definition to a Zod schema
function jsonSchemaToZod(property) {
    let schema;
    switch (property.type) {
        case "string":
            schema = z.string();
            break;
        case "number":
            schema = z.number();
            break;
        case "integer":
            schema = z.number().int();
            break;
        case "boolean":
            schema = z.boolean();
            break;
        case "array":
            schema = z.array(
                property.items ? jsonSchemaToZod(property.items) : z.any()
            );
            break;
        case "object":
            schema = z.object({});
            break;
        default:
            schema = z.any();
    }
    if (property.description) {
        schema = schema.describe(property.description);
    }
    return schema;
}

function registerConnectorTools() {
    const tools = listTools();

    for (const [name, tool] of tools) {
        const properties = tool.inputSchema?.properties || {};
        const required = tool.inputSchema?.required || [];

        const zodShape = {};
        for (const [key, prop] of Object.entries(properties)) {
            let zodProp = jsonSchemaToZod(prop);
            if (!required.includes(key)) {
                zodProp = zodProp.optional();
            }
            zodShape[key] = zodProp;
        }
        server.tool(
            name,
            tool.description,
            zodShape,
            async (input) => {
                const context = { tenant: "default", customSecret: CUSTOM_SECRET };
                const result = await executeTool(tool, context, input, { retries: tool.retries, timeoutMs: tool.timeoutMs });
                return {
                    content: [
                        {
                            type: "text",
                            text: typeof result === "string"
                                ? result
                                : JSON.stringify(result, null, 2),
                        },
                    ],
                };
            }
        );

        console.error(`Registered tool: ${name}`);
    }
}

registerConnectorTools();

// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Connector Platform running on stdio");
}

main().catch(console.error);

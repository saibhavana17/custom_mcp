import { registerTool } from '../registry/tool-registry.js';
import { getKey } from '../security/credential-vault.js';
import axios from 'axios';

registerTool({
    "name": "post_slack_message",
    "description": "Posts a message to a Slack incoming webhook",
    "inputSchema": {
        "type": "object",
        "properties": {
            "webhook_url": {
                "type": "string",
                "description": "The full Slack incoming webhook URL (overrides stored credential)"
            },
            "text": {
                "type": "string",
                "description": "Plain text message to post"
            },
            "blocks": {
                "type": "array",
                "description": "Optional Slack Block Kit blocks payload",
                "items": { "type": "object" }
            }
        },
        "required": ["text"]
    },
    async handler(context, input) {
        const webhook = input.webhook_url || getKey(context.tenant, "slack") || process.env.SLACK_WEBHOOK;

        if (!webhook) {
            throw new Error("Slack webhook URL not found. Provide webhook_url or set SLACK_WEBHOOK or a 'slack' key in the credential vault.");
        }

        const payload = {};
        if (input.blocks) payload.blocks = input.blocks;
        if (input.text) payload.text = input.text;

        const res = await axios.post(
            webhook,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        return res.data;
    }
})

// Example usage (cURL equivalent):
// curl --location 'https://hooks.slack.com/services/XXXX/XXXX/XXXX' \
//   --header 'Content-type: application/json' \
//   --data '{"text":"Hello, World!"}'

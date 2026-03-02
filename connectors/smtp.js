import { registerTool } from '../registry/tool-registry.js';
import { getKey } from '../security/credential-vault.js';
import axios from 'axios';

registerTool({
    "name": "send_email",
    "description": "Sends an email using SMTP via Brevo API",
    "inputSchema": {
        "type": "object",
        "properties": {
            "sender_name": {
                "type": "string",
                "description": "The name of the person sending the email"
            },
            "sender_email": {
                "type": "string",
                "description": "The email address of the sender"
            },
            "to_name": {
                "type": "string",
                "description": "The name of the recipient"
            },
            "to_email": {
                "type": "string",
                "description": "The email address of the recipient"
            },
            "subject": {
                "type": "string",
                "description": "The subject line of the email"
            },
            "htmlContent": {
                "type": "string",
                "description": "The HTML body content of the email"
            }
        },
        "required": ["sender_email", "to_email", "subject", "htmlContent"]
    },
    async handler(context, input) {
        const token = getKey(context.tenant, "smtp") || process.env.SMTP_TOKEN;

        if (!token) {
            throw new Error("SMTP token not found. Set SMTP_TOKEN environment variable.");
        }

        const url = `https://api.brevo.com/v3/smtp/email`;
        const payload = {
            "sender": {
                "name": input.sender_name || "MCP Platform",
                "email": input.sender_email
            },
            "to": [
                {
                    "email": input.to_email,
                    "name": input.to_name || input.to_email
                }
            ],
            "subject": input.subject,
            "htmlContent": input.htmlContent
        };

        const res = await axios.post(
            url,
            payload,
            {
                headers: {
                    "api-key": token,
                    Accept: "application/json",
                },
            }
        );

        return res.data;
    }
})

// "outputSchema": {
//         "type": "object",
//         "properties": {
//             "content": {
//                 "type": "array",
//                 "items": {
//                     "type": "object",
//                     "properties": {
//                         "type": { "type": "string", "const": "text" },
//                         "text": { "type": "string", "description": "JSON string of the created issue" }
//                     }
//                 }
//             }
//         }
//     }
import { registerTool } from '../registry/tool-registry.js';
import { getKey } from '../security/credential-vault.js';
import axios from 'axios';

registerTool({
    "name": "create_issue",
    "description": "Creates a new issue in a GitHub repository",
    "inputSchema": {
        "type": "object",
        "properties": {
            "owner": {
                "type": "string",
                "description": "The owner of the repository"
            },
            "repo": {
                "type": "string",
                "description": "The name of the repository"
            },
            "title": {
                "type": "string",
                "description": "The title of the issue"
            },
            "body": {
                "type": "string",
                "description": "The body content of the issue"
            },
            "assignees": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "description": "An array of GitHub usernames to assign the issue to"
            },
            "labels": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "description": "An array of label names to add to the issue"
            },
        },
        "required": ["owner", "repo", "title"]
    },
    async handler(context, input) {
        // Try credential vault first, fall back to environment variable
        const token = getKey(context.tenant, "github") || process.env.GITHUB_TOKEN;

        if (!token) {
            throw new Error("GitHub token not found. Set GITHUB_TOKEN environment variable.");
        }

        const url = `https://api.github.com/repos/${input.owner}/${input.repo}/issues`;

        const res = await axios.post(
            url,
            {
                title: input.title,
                body: input.body || "",
                assignees: input.assignees || [],
                labels: input.labels || [],
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/vnd.github+json",
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
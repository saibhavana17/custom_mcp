const tools = new Map();

export function registerTool(tool){
    if(!tool || !tool.name) throw new Error('Tool must have a name');
    tool.retries = tool.retries ?? 2;
    tool.timeoutMs = tool.timeoutMs ?? 10000;
    // tool.outputSchema = tool.outputSchema || null;
    // tool.auth = tool.auth || null;
    tools.set(tool.name, tool);
}

export function getTool(name){
    return tools.get(name);
}

export function listTools(){
    return [...tools]
}
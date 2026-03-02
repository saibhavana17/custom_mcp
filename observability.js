const metrics = {
    calls: {},
    latencies: {},
    failures: {},
};

export function logExecution(toolName, status, durationMs, error){
    const entry = {
        timestamp: new Date().toISOString(),
        tool: toolName,
        status,
        durationMs,
        error: error ? String(error.message || error) : null
    };
    console.log(JSON.stringify({ type: 'tool_execution', ...entry }));

    metrics.calls[toolName] = (metrics.calls[toolName] || 0) + 1;
    if(error) metrics.failures[toolName] = (metrics.failures[toolName] || 0) + 1;
    if(typeof durationMs === 'number'){
        metrics.latencies[toolName] = metrics.latencies[toolName] || [];
        metrics.latencies[toolName].push(durationMs);
    }
}

export function recordLatency(toolName, durationMs){
    metrics.latencies[toolName] = metrics.latencies[toolName] || [];
    metrics.latencies[toolName].push(durationMs);
}

export function getMetrics(){
    const out = {};
    for(const tool of Object.keys(metrics.calls)){
        const latArr = metrics.latencies[tool] || [];
        const avg = latArr.length ? (latArr.reduce((a,b)=>a+b,0)/latArr.length) : 0;
        out[tool] = {
            calls: metrics.calls[tool] || 0,
            failures: metrics.failures[tool] || 0,
            avgLatencyMs: Math.round(avg)
        };
    }
    return out;
}

export default {
    logExecution,
    getMetrics,
};

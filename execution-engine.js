import { performance } from 'perf_hooks';
import { logExecution, recordLatency } from './observability.js';

const idempotencyStore = new Map(); // key -> {response, timestamp}
const circuitStore = new Map(); // toolName -> {failCount, openUntil}

function isCircuitOpen(toolName){
    const state = circuitStore.get(toolName);
    if(!state) return false;
    if(state.openUntil && Date.now() < state.openUntil) return true;
    return false;
}

function recordFailure(toolName){
    const state = circuitStore.get(toolName) || { failCount: 0, openUntil: null };
    state.failCount = (state.failCount || 0) + 1;
    // open circuit after 5 failures for 30s
    if(state.failCount >= 5){
        state.openUntil = Date.now() + 30 * 1000;
        state.failCount = 0; // reset after tripping
    }
    circuitStore.set(toolName, state);
}

function recordSuccess(toolName){
    const state = circuitStore.get(toolName) || { failCount: 0, openUntil: null };
    state.failCount = 0;
    state.openUntil = null;
    circuitStore.set(toolName, state);
}

async function withTimeout(promise, ms){
    if(!ms) return promise;
    let timeout;
    const timer = new Promise((_, rej) => { timeout = setTimeout(() => rej(new Error('Execution timed out')), ms); });
    try{
        const res = await Promise.race([promise, timer]);
        clearTimeout(timeout);
        return res;
    }catch(err){
        clearTimeout(timeout);
        throw err;
    }
}

export async function executeTool(tool, context, input, options = {}){
    const name = tool.name || 'unknown_tool';
    const retries = options.retries ?? 2;
    const timeoutMs = options.timeoutMs ?? 10000;
    const idempotencyKey = input && (input.idempotency_key || input._idempotency_key);

    if(isCircuitOpen(name)){
        const err = new Error('Circuit open for tool: ' + name);
        logExecution(name, 'rejected', 0, err);
        throw err;
    }

    if(idempotencyKey){
        const cacheKey = `${context.tenant}:${name}:${idempotencyKey}`;
        if(idempotencyStore.has(cacheKey)){
            logExecution(name, 'idempotent_hit', 0, null);
            return idempotencyStore.get(cacheKey).response;
        }
    }

    let attempt = 0;
    let lastErr;
    const start = performance.now();
    while(attempt <= retries){
        attempt++;
        try{
            const exec = tool.handler(context, input);
            const result = await withTimeout(exec, timeoutMs);
            const duration = performance.now() - start;
            logExecution(name, 'success', duration, null);
            recordLatency(name, duration);
            recordSuccess(name);
            if(idempotencyKey){
                const cacheKey = `${context.tenant}:${name}:${idempotencyKey}`;
                idempotencyStore.set(cacheKey, { response: result, timestamp: Date.now() });
            }
            return result;
        }catch(err){
            lastErr = err;
            const duration = performance.now() - start;
            logExecution(name, 'failure', duration, err);
            recordLatency(name, duration);
            recordFailure(name);
            await new Promise(r => setTimeout(r, 100 * attempt));
        }
    }

    throw lastErr || new Error('Execution failed');
}

export function clearIdempotency(){
    idempotencyStore.clear();
}

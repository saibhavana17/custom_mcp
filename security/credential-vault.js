const vault = new Map();

export function storeKey(tenant, key, value){
    vault.set(`${tenant}:${key}`, value);
}

export function getKey(tenant, key){
    const val = vault.get(`${tenant}:${key}`);
    if(!val) return undefined;
    return val;
}
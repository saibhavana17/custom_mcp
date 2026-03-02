export function authenticate(headers){
    const token = headers['x-api-key'];
    if(!token){
        throw new Error("Unauthorized");
    }
    const tenantId = String(token);

    return {
        tenantId,
        role: "user"
    }
}
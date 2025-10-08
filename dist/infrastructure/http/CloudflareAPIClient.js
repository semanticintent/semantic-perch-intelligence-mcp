"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudflareAPIClient = exports.CloudflareAPIError = void 0;
class CloudflareAPIError extends Error {
    statusCode;
    errors;
    constructor(message, statusCode, errors) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        this.name = 'CloudflareAPIError';
    }
}
exports.CloudflareAPIError = CloudflareAPIError;
class CloudflareAPIClient {
    baseUrl;
    accountId;
    apiToken;
    constructor(config) {
        this.accountId = config.accountId;
        this.apiToken = config.apiToken;
        this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}`;
    }
    /**
     * Execute SQL query on D1 database
     *
     * @param databaseId - D1 database identifier
     * @param sql - SQL query string
     * @returns Query results
     */
    async query(databaseId, sql) {
        const url = `${this.baseUrl}/d1/database/${databaseId}/query`;
        const response = await fetch(url, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ sql }),
        });
        if (!response.ok) {
            await this.handleErrorResponse(response);
        }
        const data = (await response.json());
        if (!data.success) {
            throw new CloudflareAPIError(`D1 query failed: ${data.errors.map((e) => e.message).join(', ')}`, response.status, data.errors);
        }
        // D1 API returns array of results, we want the first one
        return data.result[0];
    }
    /**
     * Get database information
     *
     * @param databaseId - D1 database identifier
     */
    async getDatabaseInfo(databaseId) {
        const url = `${this.baseUrl}/d1/database/${databaseId}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: this.getHeaders(),
        });
        if (!response.ok) {
            await this.handleErrorResponse(response);
        }
        const data = (await response.json());
        if (!data.success) {
            throw new CloudflareAPIError(`Failed to get database info: ${data.errors.map((e) => e.message).join(', ')}`, response.status, data.errors);
        }
        return data.result;
    }
    /**
     * Get request headers with authentication
     */
    getHeaders() {
        return {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
        };
    }
    /**
     * Handle HTTP error responses
     */
    async handleErrorResponse(response) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errors;
        try {
            const data = (await response.json());
            if (data.errors && data.errors.length > 0) {
                errorMessage = data.errors.map((e) => e.message).join(', ');
                errors = data.errors;
            }
        }
        catch {
            // JSON parsing failed, use default message
        }
        throw new CloudflareAPIError(errorMessage, response.status, errors);
    }
}
exports.CloudflareAPIClient = CloudflareAPIClient;
//# sourceMappingURL=CloudflareAPIClient.js.map
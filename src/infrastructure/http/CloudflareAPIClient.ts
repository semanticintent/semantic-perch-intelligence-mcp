import type { CloudflareConfig } from '../config/CloudflareConfig';

/**
 * 🎯 SEMANTIC INTENT: CloudflareAPIClient handles HTTP communication with D1 REST API
 *
 * WHY: Infrastructure HTTP client for Cloudflare D1 API
 * - Manages authentication headers
 * - Handles request/response formatting
 * - Error handling for network failures
 *
 * INFRASTRUCTURE LAYER: Technical HTTP concerns
 * ADAPTER PATTERN: Wraps fetch API with D1-specific logic
 */

export interface D1Response<T = unknown> {
  success: boolean;
  result: T;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
}

export interface D1QueryResponse {
  success: boolean;
  results: unknown[];
  meta?: {
    duration?: number;
    rows_read?: number;
    rows_written?: number;
  };
}

export class CloudflareAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly errors?: Array<{ code: number; message: string }>
  ) {
    super(message);
    this.name = 'CloudflareAPIError';
  }
}

export class CloudflareAPIClient {
  private readonly baseUrl: string;
  private readonly accountId: string;
  private readonly apiToken: string;

  constructor(config: CloudflareConfig) {
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
  async query(databaseId: string, sql: string): Promise<D1QueryResponse> {
    const url = `${this.baseUrl}/d1/database/${databaseId}/query`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ sql }),
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    const data = (await response.json()) as D1Response<D1QueryResponse[]>;

    if (!data.success) {
      throw new CloudflareAPIError(
        `D1 query failed: ${data.errors.map((e) => e.message).join(', ')}`,
        response.status,
        data.errors
      );
    }

    // D1 API returns array of results, we want the first one
    return data.result[0];
  }

  /**
   * Get database information
   *
   * @param databaseId - D1 database identifier
   */
  async getDatabaseInfo(databaseId: string): Promise<unknown> {
    const url = `${this.baseUrl}/d1/database/${databaseId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    const data = (await response.json()) as D1Response;

    if (!data.success) {
      throw new CloudflareAPIError(
        `Failed to get database info: ${data.errors.map((e) => e.message).join(', ')}`,
        response.status,
        data.errors
      );
    }

    return data.result;
  }

  /**
   * Get request headers with authentication
   */
  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Handle HTTP error responses
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errors: Array<{ code: number; message: string }> | undefined;

    try {
      const data = (await response.json()) as D1Response;
      if (data.errors && data.errors.length > 0) {
        errorMessage = data.errors.map((e) => e.message).join(', ');
        errors = data.errors;
      }
    } catch {
      // JSON parsing failed, use default message
    }

    throw new CloudflareAPIError(errorMessage, response.status, errors);
  }
}

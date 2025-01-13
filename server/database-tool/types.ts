/**
 * Database operation types supported by the service
 */
export type DatabaseOperation = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'LIST_TABLES' | 'DESCRIBE';

/**
 * Database query request structure
 */
export interface QueryRequest {
  query: string;
  operation: DatabaseOperation;
  params?: any[];
}

/**
 * Database query response structure
 */
export interface QueryResponse {
  rows: any[];
  rowCount: number;
}

/**
 * Connection test response structure
 */
export interface ConnectionStatus {
  connected: boolean;
  timestamp: string;
  version?: string;
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  error: string;
  details?: string;
}
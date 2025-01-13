import { QueryResult } from 'pg';
import pool from './connection';
import { QueryResponse, ConnectionStatus, DatabaseOperation } from './types';

export class DatabaseService {
  /**
   * Execute a database query with proper connection management
   */
  private static async executeQuery(query: string, params?: any[]): Promise<QueryResult> {
    const client = await pool.connect();
    
    try {
      return await client.query(query, params);
    } finally {
      client.release();
    }
  }

  /**
   * Validate and sanitize a SQL query
   */
  private static validateQuery(query: string, operation: DatabaseOperation): void {
    // Basic input validation
    if (!query?.trim()) {
      throw new Error('Query cannot be empty');
    }

    const sanitizedQuery = query.toLowerCase().trim();

    // Security checks
    const forbiddenKeywords = ['drop', 'truncate'];
    if (forbiddenKeywords.some(keyword => sanitizedQuery.includes(keyword))) {
      throw new Error('Unsafe query detected');
    }

    // Operation-specific checks
    if (operation === 'DELETE' && !sanitizedQuery.includes('where')) {
      throw new Error('DELETE operations require a WHERE clause');
    }
  }

  /**
   * Format database result into standard response
   */
  private static formatResult(result: QueryResult): QueryResponse {
    return {
      rows: result.rows,
      rowCount: result.rowCount ?? 0
    };
  }

  /**
   * Test database connection
   */
  static async testConnection(): Promise<ConnectionStatus> {
    try {
      const result = await this.executeQuery('SELECT version()');
      return {
        connected: true,
        timestamp: new Date().toISOString(),
        version: result.rows[0]?.version
      };
    } catch (error) {
      return {
        connected: false,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get list of available tables
   */
  static async getTables(): Promise<QueryResponse> {
    const query = `
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    const result = await this.executeQuery(query);
    return this.formatResult(result);
  }

  /**
   * Get detailed information about a specific table
   */
  static async describeTable(tableName: string): Promise<QueryResponse> {
    const query = `
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        column_default,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `;

    const result = await this.executeQuery(query, [tableName]);
    return this.formatResult(result);
  }

  /**
   * Execute a query safely with proper validation and error handling
   */
  static async safeExecute(
    query: string,
    operation: DatabaseOperation,
    params?: any[]
  ): Promise<QueryResponse> {
    // Validate the query
    this.validateQuery(query, operation);

    try {
      // Execute and format the result
      const result = await this.executeQuery(query, params);
      return this.formatResult(result);
    } catch (error) {
      // Enhance error message for client
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Query execution failed: ${message}`);
    }
  }
}
export interface QueryResult {
  rows: any[];
  error?: string;
}

export interface CommandHistoryEntry {
  command: string;
  output?: string;
  timestamp: string;
}

export interface ToolResponse {
  success: boolean;
  output?: any;
  error?: string;
}
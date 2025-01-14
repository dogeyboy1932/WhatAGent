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


export interface ToolComponentProps {
  title: string;
  className?: string;
  children: React.ReactNode;
}


export interface ShellToolProps {
  commandHistory: CommandHistoryEntry[];
}

export interface GraphingToolProps {
  altairJson: string;
}

export interface DatabaseToolProps {
  queryResult: QueryResult | null;
}


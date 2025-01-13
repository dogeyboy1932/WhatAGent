import { executeQuery } from './database-tool';
import { executeCommand } from './shell-executor-tool';
import { type ToolResponse, type QueryResult, type CommandHistoryEntry } from '../types';



export const handleDatabaseQuery = async (
  query: string, 
  operation: string, 
  setQueryResult: (result: QueryResult) => void,
  setError: (error: string) => void,
  params?: string[]
): Promise<ToolResponse> => {
  try {
    const response = await executeQuery(query, operation, params);
    setQueryResult({ rows: response.rows || [] });
    return { success: true, output: response };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Database query failed';
    setError(errorMessage);
    return { success: false, error: errorMessage };
  }
};



export const handleShellCommand = async (
  shell: "cmd" | "powershell" | "gitbash",
  command: string,
  workingDir: string | undefined,
  setCommandHistory: (fn: (prev: CommandHistoryEntry[]) => CommandHistoryEntry[]) => void,
  setError: (error: string) => void
): Promise<ToolResponse> => {
  try {
    const result = await executeCommand(shell, command, workingDir);
    const newEntry: CommandHistoryEntry = {
      command: `${shell}: ${command}`,
      output: result.output || result.error,
      timestamp: new Date().toISOString(),
    };
    setCommandHistory(prev => [...prev, newEntry]);
    return { success: result.success, output: result.output, error: result.error };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Shell command failed';
    setError(errorMessage);
    return { success: false, error: errorMessage };
  }
};




export const handleAltairVisualization = (
  jsonGraph: string,
  setAltairJson: (json: string) => void,
  setError: (error: string) => void
): ToolResponse => {
  try {
    setAltairJson(jsonGraph);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Visualization failed';
    setError(errorMessage);
    return { success: false, error: errorMessage };
  }
};

export const handleToolCall = async (
  functionCall: any,
  functionId: string,
  handlers: {
    handleDatabaseQuery: typeof handleDatabaseQuery,
    handleShellCommand: typeof handleShellCommand,
    handleAltairVisualization: typeof handleAltairVisualization,
  },
  setters: {
    setQueryResult: (result: QueryResult) => void,
    setCommandHistory: (fn: (prev: CommandHistoryEntry[]) => CommandHistoryEntry[]) => void,
    setAltairJson: (json: string) => void,
    setError: (error: string) => void,
  },
  client: any
) => {
  let response: ToolResponse;







  try {
    switch (functionCall.name) {
      case "query_database": {
        const { query, operation, params } = functionCall.args;
        response = await handlers.handleDatabaseQuery(
          query, 
          operation, 
          setters.setQueryResult,
          setters.setError,
          params
        );
        break;
      }
      case "execute_shell_command": {
        const { shell, command, workingDir } = functionCall.args;
        response = await handlers.handleShellCommand(
          shell, 
          command, 
          workingDir,
          setters.setCommandHistory,
          setters.setError
        );
        break;
      }
      case "render_altair": {
        const { json_graph } = functionCall.args;
        response = handlers.handleAltairVisualization(
          json_graph,
          setters.setAltairJson,
          setters.setError
        );
        break;
      }
      default:
        throw new Error(`Unknown function: ${functionCall.name}`);
    }

    client.sendToolResponse({
      functionResponses: [{
        response: { output: response },
        id: functionId,
      }],
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    setters.setError(errorMessage);
    client.sendToolResponse({
      functionResponses: [{
        response: { output: { success: false, error: errorMessage }},
        id: functionId,
      }],
    });
  }
};
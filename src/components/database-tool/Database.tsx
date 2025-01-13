import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { useEffect, useState, memo } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { ToolCall } from "../../multimodal-live-types";

// Database Service Integration
class DatabaseService {
    private static baseUrl = 'http://localhost:3001/api/database';

    static async executeQuery(query: string, operation: string, params?: any[]): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, operation, params }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.details || error.error || 'Query execution failed');
            }

            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    // static async getTables(): Promise<string[]> {
    //     const response = await fetch(`${this.baseUrl}/tables`);
    //     if (!response.ok) throw new Error('Failed to fetch tables');
    //     return await response.json();
    // }

    // static async describeTable(tableName: string): Promise<any[]> {
    //     const response = await fetch(`${this.baseUrl}/describe/${tableName}`);
    //     if (!response.ok) throw new Error(`Failed to describe table ${tableName}`);
    //     return await response.json();
    // }
}

// Function declarations for the LLM
export const databaseDeclarations: FunctionDeclaration = 
  {
    name: "query_database",
    description: "Executes SQL queries on a PostgreSQL database and returns the results.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
            type: SchemaType.STRING,
            description: "SQL query to execute. Should be a valid PostgreSQL query.",
        },
        operation: {
            type: SchemaType.STRING,
            description: "The operation type: select, insert, update, or delete",
            enum: ["select", "insert", "update", "delete"]
        },
        params: {
            type: SchemaType.ARRAY,
            description: "Optional array of parameters for parameterized queries",
            items: { type: SchemaType.STRING }
        }
      },
      required: ["query", "operation"],
    },
  }


interface QueryResult {
    rows: any[];
    error?: string;
}

function DatabaseComponent() {
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const { client, setConfig } = useLiveAPIContext();

  // Configure LLM settings
  useEffect(() => {
    console.log('Setting up database tool config');
    setConfig({
        model: "models/gemini-2.0-flash-exp",
        generationConfig: {
            responseModalities: "audio",
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: "Charon" } },
            },
        },
        systemInstruction: {
            parts: [{
              text: `You are a PostgreSQL database expert assistant. Available functions:
                1. query_database: Execute SQL queries with parameterized inputs
                2. get_tables: List all available tables
                3. describe_table: Get table schema details

                Guidelines:
                - Always use parameterized queries for user inputs
                - Validate table and column names
                - Provide clear error explanations
                - For complex queries, explain the approach
                - Use appropriate operation types
                - Focus on query optimization`,
            }],
        },
        tools: [{ functionDeclarations: [databaseDeclarations] }],
    });

    console.log('Database tool config set');
  }, [setConfig]);

  // Handle tool calls
  useEffect(() => {
    const handleToolCall = async (toolCall: ToolCall) => {
      const functionCall = toolCall.functionCalls[0];

      console.log('Received databasetool call:', toolCall);
      
      const fc = toolCall.functionCalls.find(
        (fc) => fc.name === databaseDeclarations.name
      );

      if (fc) {
        try {
          let response;
          switch (functionCall.name) {
              case "query_database": {
                  const args = functionCall.args as { query: string; operation: string; params?: string[] };
                  response = await DatabaseService.executeQuery(args.query, args.operation, args.params);
                  
                  console.log("response: ", response);
                  break;
              }
              // case "get_tables": {
              //     response = { rows: await DatabaseService.getTables() };
              //     break;
              // }
              // case "describe_table": {
              //     const args = functionCall.args as { tableName: string };
              //     response = { rows: await DatabaseService.describeTable(args.tableName) };
              //     break;
              // }
              default:
                  throw new Error(`Unknown function: ${functionCall.name}`);
          }

          setQueryResult({ rows: response.rows || [] });
          client.sendToolResponse({
              functionResponses: [{
                  response: { output: response },
                  id: functionCall.id,
              }],
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          setQueryResult({ rows: [], error: errorMessage });
          client.sendToolResponse({
              functionResponses: [{
                  response: { output: { success: false, error: errorMessage }},
                  id: functionCall.id,
              }],
          });
        }
      }
    };

    client.on("toolcall", handleToolCall);
    
    // Ensure the cleanup function returns void
    return () => {
      client.off("toolcall", handleToolCall);
    };
  }, [client]);

  // Render results
  return (
    <div className="database-results">
      {queryResult && (
        <div>
          {queryResult.error ? (
            <div className="error-message text-red-500 p-4 rounded bg-red-50 border border-red-200">
              Error: {queryResult.error}
            </div>
          ) : (
          <div className="results-table">
            {queryResult.rows.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200 shadow-sm rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(queryResult.rows[0]).map((key) => (
                      <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                
                <tbody className="bg-white divide-y divide-gray-200">
                  {queryResult.rows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {Object.values(row).map((value: any, j) => (
                        <td key={j} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
            
              <p className="text-gray-500 p-4 bg-gray-50 rounded">
                Query executed successfully. No results to display.
              </p>
            )}
          </div>
        )}
        </div>
      )}
    </div>
  );
}

export const Database = memo(DatabaseComponent);
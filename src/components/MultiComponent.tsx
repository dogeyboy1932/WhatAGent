import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { useEffect, useRef, useState, memo } from "react";
import vegaEmbed from "vega-embed";
import { useLiveAPIContext } from "../contexts/LiveAPIContext";
import { ToolCall } from "../multimodal-live-types";
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle } from 'lucide-react';

// Database Service
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
}

// Shell Service
async function executeCommand(shell: string, command: string, workingDir?: string) {
    const response = await fetch('http://localhost:3001/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            command: `${shell} /c ${command}`,
            timeout: 30000 
        }),
    });
    return response.json();
}

// Function Declarations
const functionDeclarations: FunctionDeclaration[] = [
    // Database Declaration
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
    },
    // Shell Executor Declaration
    {
        name: "execute_shell_command",
        description: "Executes shell commands and returns their output. Available shells: cmd, powershell, gitbash",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                shell: {
                    type: SchemaType.STRING,
                    description: "Shell to use (cmd, powershell, or gitbash)",
                    enum: ["cmd", "powershell", "gitbash"]
                },
                command: {
                    type: SchemaType.STRING,
                    description: "The shell command to execute",
                },
                workingDir: {
                    type: SchemaType.STRING,
                    description: "Working directory for command execution (optional)",
                }
            },
            required: ["shell", "command"],
        },
    },
    // Altair Declaration
    {
        name: "render_altair",
        description: "Displays an altair graph in json format.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                json_graph: {
                    type: SchemaType.STRING,
                    description: "JSON STRING representation of the graph to render. Must be a string, not a json object",
                }
            },
            required: ["json_graph"],
        },
    }
];

// Types
interface QueryResult {
    rows: any[];
    error?: string;
}

interface CommandHistoryEntry {
    command: string;
    output?: string;
    timestamp: string;
}

function UnifiedToolComponent() {
    // State management
    const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
    const [commandHistory, setCommandHistory] = useState<CommandHistoryEntry[]>([]);
    const [error, setError] = useState<string>('');
    const [altairJson, setAltairJson] = useState<string>('');
    const { client, setConfig } = useLiveAPIContext();
    const embedRef = useRef<HTMLDivElement>(null);

    // Configure LLM settings
    useEffect(() => {
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
                    text: `You are a multi-tool assistant capable of:
                        1. PostgreSQL database operations
                        2. Shell command execution (cmd, powershell, gitbash)
                        3. Data visualization using Altair

                        Guidelines:
                        - For database: Use parameterized queries, validate inputs
                        - For shell: Execute commands safely, handle errors
                        - For visualization: Create clear, informative graphs
                        
                        Choose the appropriate tool based on the user's request.`,
                }],
            },
            tools: [
                { googleSearch: {} },
                { functionDeclarations: functionDeclarations }
            ],
        });
    }, [setConfig]);

    // Tool Router Function
    const handleToolCall = async (functionCall: any, functionId: string) => {
        try {
            let response;
            switch (functionCall.name) {
                case "query_database": {
                    const args = functionCall.args as { query: string; operation: string; params?: string[] };
                    response = await DatabaseService.executeQuery(args.query, args.operation, args.params);
                    setQueryResult({ rows: response.rows || [] });
                    break;
                }
                case "execute_shell_command": {
                    const args = functionCall.args as {
                        shell: "cmd" | "powershell" | "gitbash";
                        command: string;
                        workingDir?: string;
                    };
                    const result = await executeCommand(args.shell, args.command, args.workingDir);
                    const newEntry: CommandHistoryEntry = {
                        command: `${args.shell}: ${args.command}`,
                        output: result.output || result.error,
                        timestamp: new Date().toISOString(),
                    };
                    setCommandHistory(prev => [...prev, newEntry]);
                    response = { success: result.success, output: result.output, error: result.error };
                    break;
                }
                case "render_altair": {
                    const args = functionCall.args as { json_graph: string };
                    setAltairJson(args.json_graph);
                    response = { success: true };
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
            setError(errorMessage);
            client.sendToolResponse({
                functionResponses: [{
                    response: { output: { success: false, error: errorMessage }},
                    id: functionId,
                }],
            });
        }
    };

    // Handle tool calls
    useEffect(() => {
        const onToolCall = async (toolCall: ToolCall) => {
            console.log('Received tool call:', toolCall);
            
            for (const functionCall of toolCall.functionCalls) {
                await handleToolCall(functionCall, functionCall.id);
            }
        };

        client.on("toolcall", onToolCall);
        return () => {
            client.off("toolcall", onToolCall);
        };
    }, [client]);

    // Handle Altair visualization
    useEffect(() => {
        if (embedRef.current && altairJson) {
            vegaEmbed(embedRef.current, JSON.parse(altairJson));
        }
    }, [embedRef, altairJson]);

    return (
        <div className="space-y-4">
            {/* Error Display */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Database Results */}
            {queryResult && (
                <div className="database-results">
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

            {/* Shell Command History */}
            <div className="space-y-2">
                {commandHistory.map((entry, index) => (
                    <div key={index} className="p-3 hover:bg-gray-50">
                        <div className="font-mono text-sm text-gray-600">$ {entry.command}</div>
                        {entry.output && (
                            <pre className="mt-2 text-sm whitespace-pre-wrap text-gray-700">
                                {entry.output}
                            </pre>
                        )}
                        <div className="mt-1 text-xs text-gray-400">
                            {new Date(entry.timestamp).toLocaleString()}
                        </div>
                    </div>
                ))}
            </div>

            {/* Altair Visualization */}
            <div className="vega-embed" ref={embedRef} />
        </div>
    );
}

export const UnifiedTool = memo(UnifiedToolComponent);
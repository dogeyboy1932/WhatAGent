import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";

import { memo } from 'react';
import { DatabaseToolProps, ToolResponse } from "../../types/tool-types"

const baseDataUrl = process.env.baseDataUrl;


// Database Declaration
export const QUERY_DATABASE_DECLARATION: FunctionDeclaration = {
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
};


export async function executeQuery(query: string, operation: string, params?: any[]): Promise<any> {
    try {
        const response = await fetch(`http://localhost:3001/api/database/query`, {
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



export const handleDatabaseQuery = async (query: string, operation: string, params?: string[]): Promise<ToolResponse> => {
    try {
      const response = await executeQuery(query, operation, params);
      return { success: true, output: response };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Database query failed';
      return { success: false, error: errorMessage };
    }
};




function DatabaseTool ({ queryResult }: DatabaseToolProps) {

  return (
    <div className="unified-tool space-y-4">

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

            )
        }

    </div>
  )
}

export const DatabaseQuery = memo(DatabaseTool);


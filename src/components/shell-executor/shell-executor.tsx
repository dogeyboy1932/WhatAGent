/**
 * Shell executor component for running shell commands
 * and displaying command history with outputs
 */
import React, { useState, useEffect } from 'react';
import { AlertCircle, Terminal, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { useLiveAPIContext } from '../../contexts/LiveAPIContext';
import { ToolCall } from '../../multimodal-live-types';
import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";



// Add this function at the top level
async function executeCommand(shell: string, command: string, workingDir?: string) {
  const response = await fetch('http://localhost:3001/api/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      command: `${shell} /c ${command}`,  // Format command for shell execution
      timeout: 30000 
    }),
  });
  return response.json();
}


// Function Declaration for shell execution
export const shellExecutorDeclaration: FunctionDeclaration = {
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
};


// Type Declarations
interface CommandHistoryEntry {
  command: string;
  output?: string;
  timestamp: string;
}


// Main Component Implementation
function ShellExecutorComponent() {
  const [commandHistory, setCommandHistory] = useState<CommandHistoryEntry[]>([]);
  const [command, setCommand] = useState<string>('');
  const [executing, setExecuting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const { client, setConfig } = useLiveAPIContext();

  useEffect(() => {
    console.log('Setting up shell executor config');
    setConfig({
      model: "models/gemini-2.0-flash-exp",
      generationConfig: {
        responseModalities: "audio",
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Charon" } },
        },
      },
      systemInstruction: {
        parts: [
          {
            text: 'You will run shell commands and return the output. You will only run commands that are provided to you.',
          },
        ],
      },
      tools: [
        // there is a free-tier quota for search
        { googleSearch: {} },
        { functionDeclarations: [shellExecutorDeclaration] },
      ],
    });
    console.log('Shell executor config set');
  }, [setConfig]);

  // Handle tool calls
  useEffect(() => {
    const onToolCall = async (toolCall: ToolCall) => {
      console.log('Received tool call:', toolCall);
      
      const fc = toolCall.functionCalls.find(
        (fc) => fc.name === shellExecutorDeclaration.name
      );

      if (fc) {
        console.log('Found shell executor function call:', fc);
        const args = fc.args as {
          shell: "cmd" | "powershell" | "gitbash";
          command: string;
          workingDir?: string;
        };
        console.log('Parsed arguments:', args);

        setExecuting(true);
        try {
          const newEntry: CommandHistoryEntry = {
            command: `${args.shell}: ${args.command}`,
            timestamp: new Date().toISOString(),
          };
          
          // Execute command using our server
          const result = await executeCommand(args.shell, args.command, args.workingDir);
          
          // Update command history with the output
          newEntry.output = result.output || result.error;
          setCommandHistory(prev => [...prev, newEntry]);

          // Send response back to the client
          const response = {
            functionResponses: [{
              response: { 
                output: { 
                  success: result.success, 
                  command: args.command,
                  output: result.output,
                  error: result.error 
                } 
              },
              id: fc.id,
            }],
          };
          
          client.sendToolResponse(response);

        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'An error occurred';
          console.error('Shell execution error:', errorMessage);
          setError(errorMessage);
          
          const errorResponse = {
            functionResponses: [{
              response: { error: errorMessage },
              id: fc.id,
            }],
          };
          client.sendToolResponse(errorResponse);
        } finally {
          setExecuting(false);
        }
      }
    };

    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client]);

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
    </div>
  );
}

// Export memoized component
export const ShellExecutor = React.memo(ShellExecutorComponent);
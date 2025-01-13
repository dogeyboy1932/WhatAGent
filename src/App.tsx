/**
 * Copyright 2024 Google LLC
 * Licensed under the Apache License, Version 2.0
 */

import { useEffect, useRef, useState } from "react";
import { LiveAPIProvider } from "./contexts/LiveAPIContext";
import { useLiveAPIContext } from "./contexts/LiveAPIContext";
import { type FunctionDeclaration } from "@google/generative-ai";

import cn from "classnames";

// Components
import SidePanel from "./components/side-panel/SidePanel";
import ControlTray from "./components/control-tray/ControlTray";
import { Alert, AlertDescription } from './components/ui/alert';
import { AlertCircle } from 'lucide-react';

// Styles
import "./App.scss";



import { ToolCall } from "./multimodal-live-types";


// Tool declarations and utilities
import { DatabaseQuery, executeQuery } from './tools/database-tool';
import { ShellTool, executeCommand } from './tools/shell-executor-tool';
import { GraphingTool } from "./tools/altair-tool";

import { functionDeclarations } from ".";


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

interface ToolResponse {
  success: boolean;
  output?: any;
  error?: string;
}






// Main App Component
const App = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

    // State
    const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
    const [commandHistory, setCommandHistory] = useState<CommandHistoryEntry[]>([]);
    const [error, setError] = useState<string>('');
    const [altairJson, setAltairJson] = useState<string>('');
    
    const { client, setConfig } = useLiveAPIContext();
    
  
    // LLM Configuration
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
  
    
  
    const handleShellCommand = async (
      shell: "cmd" | "powershell" | "gitbash",
      command: string,
      workingDir?: string
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
  
    const handleAltairVisualization = (jsonGraph: string): ToolResponse => {
      try {
        setAltairJson(jsonGraph);
        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Visualization failed';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    };
  
    // Tool handling functions
    const handleDatabaseQuery = async (query: string, operation: string, params?: string[]): Promise<ToolResponse> => {
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
  
    // Main tool call handler
    const handleToolCall = async (functionCall: any, functionId: string) => {
      let response: ToolResponse;
  
      try {
        switch (functionCall.name) {
          case "query_database": {
            const { query, operation, params } = functionCall.args;
            response = await handleDatabaseQuery(query, operation, params);
            break;
          }
          case "execute_shell_command": {
            const { shell, command, workingDir } = functionCall.args;
            response = await handleShellCommand(shell, command, workingDir);
            break;
          }
          case "render_altair": {
            const { json_graph } = functionCall.args;
            response = handleAltairVisualization(json_graph);
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

  return (
    <div className="App">
      
        <div className="streaming-console">
          <SidePanel />
          <main>
            <div className="main-app-area">
              <div className="tools-container">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <DatabaseQuery queryResult={queryResult}/>

              <ShellTool commandHistory={commandHistory} />
              
              <GraphingTool altairJson={altairJson}/>
              </div>
              <video
                className={cn("stream", {
                  hidden: !videoRef.current || !videoStream,
                })}
                ref={videoRef}
                autoPlay
                playsInline
              />
            </div>
            <ControlTray
              videoRef={videoRef}
              supportsVideo={true}
              onVideoStreamChange={setVideoStream}
            />
          </main>
        </div>
      {/* </LiveAPIProvider> */}
    </div>
  );
};

export default App;
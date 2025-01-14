/**
 * Copyright 2024 Google LLC
 * Licensed under the Apache License, Version 2.0
 */
import cn from "classnames";
import { useEffect, useRef, useState } from "react";
import { useLiveAPIContext } from "./contexts/LiveAPIContext";

// Types
import { QueryResult, CommandHistoryEntry, ToolResponse } from './types/tool-types';
import { ToolCall } from "./types/multimodal-live-types";

// Components
import SidePanel from "./components/side-panel/SidePanel";
import ControlTray from "./components/control-tray/ControlTray";
import { Alert, AlertDescription } from './components/alert/alert';
import { AlertCircle } from 'lucide-react';

// Tools and Components
import { DatabaseQuery, handleDatabaseQuery } from './tools/database-tool';
import { ShellTool, handleShellCommand } from './tools/shell-executor-tool';
import { GraphingTool } from "./tools/altair-tool";

import { LLM_CONFIG } from "./config/llmConfig";

// Styles
import "./App.scss";







// Main App Component
const App = () => {
  const { client, setConfig } = useLiveAPIContext();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  
  // State
  const [error, setError] = useState<string>('');

  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [commandHistory, setCommandHistory] = useState<CommandHistoryEntry[]>([]);
  const [altairJson, setAltairJson] = useState<string>('');

    
  // LLM Configuration  ***
  useEffect(() => {
    setConfig(LLM_CONFIG);
  }, [setConfig]);

  



  // Main tool call handler
  const handleToolCall = async (functionCall: any, functionId: string) => {
    let response: ToolResponse;

    try {
      switch (functionCall.name) {
        case "query_database": {
          const { query, operation, params } = functionCall.args;
          response = await handleDatabaseQuery(query, operation, params);
          
          if (response.success) { setQueryResult({ rows: response.output.rows || [] }); } 
          else { setError(response.error ?? ''); }

          break;
        }

        case "execute_shell_command": {
          const { shell, command, workingDir } = functionCall.args;
          response = await handleShellCommand(shell, command, workingDir);
          
          if (response.success) { setCommandHistory(prev => [...prev, response.output]); } 
          else { setError(response.error ?? ''); }
          
          break;
        }

        case "render_altair": {
          const { json_graph } = functionCall.args;
          response = { success: true};

          setAltairJson(json_graph);

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

            <GraphingTool altairJson={altairJson}/>
            <DatabaseQuery queryResult={queryResult}/>
            <ShellTool commandHistory={commandHistory} />
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
    
  );
};

export default App;
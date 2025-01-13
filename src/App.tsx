/**
 * Copyright 2024 Google LLC
 * Licensed under the Apache License, Version 2.0
 */
import cn from "classnames";
import { useEffect, useRef, useState } from "react";
import { useLiveAPIContext } from "./contexts/LiveAPIContext";


// Types
import { QueryResult, CommandHistoryEntry } from './types';
import { ToolCall } from "./multimodal-live-types";

// Components
import SidePanel from "./components/side-panel/SidePanel";
import ControlTray from "./components/control-tray/ControlTray";
import { Alert, AlertDescription } from './components/ui/alert';
import { AlertCircle } from 'lucide-react';

// Tools and Components
import { functionDeclarations } from ".";
import { DatabaseQuery } from './tools/database-tool';
import { ShellTool } from './tools/shell-executor-tool';
import { GraphingTool } from "./tools/altair-tool";

// Handlers
import { handleDatabaseQuery, handleShellCommand, handleAltairVisualization, handleToolCall } from './tools/toolHandlers';

// Styles
import "./App.scss";





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

  // Handle tool calls
  useEffect(() => {
    const onToolCall = async (toolCall: ToolCall) => {
      console.log('Received tool call:', toolCall);
      
      const handlers = {
        handleDatabaseQuery,
        handleShellCommand,
        handleAltairVisualization
      };

      const setters = {
        setQueryResult,
        setCommandHistory,
        setAltairJson,
        setError
      };
      
      for (const functionCall of toolCall.functionCalls) {
        await handleToolCall(
          functionCall, 
          functionCall.id, 
          handlers,
          setters,
          client
        );
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
    </div>
  );
};

export default App;
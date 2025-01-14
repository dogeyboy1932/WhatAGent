import { LiveConfig } from "../types/multimodal-live-types";
import { functionDeclarations } from "./functionDeclarations";



export const API_CONFIG = {
  host: "generativelanguage.googleapis.com",
  uri: "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent",
  functionDeclarations: functionDeclarations
};


const DATABASE_GUIDELINES = "Use parameterized queries, validate inputs"
const GRAPH_GUIDELINES = "Execute commands safely, handle errors"
const SHELL_GUIDELINES = "Create clear, informative graphs"



export const LLM_CONFIG: LiveConfig = 
{
  model: "models/gemini-2.0-flash-exp",
  generationConfig: {
    responseModalities: "audio", // Ensure this is one of the allowed types
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
        - For database: ${DATABASE_GUIDELINES}

        - For shell: ${SHELL_GUIDELINES}

        - For visualization: ${GRAPH_GUIDELINES}
        
        Choose the appropriate tool based on the user's request.`,
    }],
  },
  tools: [
    { googleSearch: {} },
    { functionDeclarations: functionDeclarations }
  ],
};
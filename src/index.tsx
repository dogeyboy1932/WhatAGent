/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { LiveAPIProvider } from './contexts/LiveAPIContext';




import { 
  QUERY_DATABASE_DECLARATION,
} from './tools/database-tool';

import {
  RENDER_ALTAIR_DECLARATION 
} from "./tools/altair-tool";

import { 
  EXECUTE_SHELL_COMMAND_DECLARATION,
} from './tools/shell-executor-tool';



// Configuration
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
if (!API_KEY) throw new Error("Missing REACT_APP_GEMINI_API_KEY in .env");


export const functionDeclarations = [
  QUERY_DATABASE_DECLARATION,
  EXECUTE_SHELL_COMMAND_DECLARATION,
  RENDER_ALTAIR_DECLARATION,
]


const API_CONFIG = {
  host: "generativelanguage.googleapis.com",
  uri: "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent",
  functionDeclarations: functionDeclarations
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <LiveAPIProvider url={API_CONFIG.uri} apiKey={API_KEY}>
      <App />
    </LiveAPIProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

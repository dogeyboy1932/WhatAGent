import { exec } from 'child_process';
import path from 'path';

export class ExecuteFileTool {
  static async execute(command: string, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const process = exec(command, {
        timeout: timeout
      }, (error, stdout, stderr) => {
        resolve({
          success: !error,
          exitCode: error?.code,
          output: stdout,
          error: stderr
        });
      });
    });
  }

  static async executeFile(filePath: string, timeout = 30000) {
    const ext = path.extname(filePath).toLowerCase();
    
    const commandMap: Record<string, string> = {
      '.py': `python "${filePath}"`,
      '.js': `node "${filePath}"`,
      '.sh': `bash "${filePath}"`,
      '.bat': `"${filePath}"`,
      '.ps1': `powershell -File "${filePath}"`,
      '.rb': `ruby "${filePath}"`,
      '.php': `php "${filePath}"`,
      '.pl': `perl "${filePath}"`,
      '.r': `Rscript "${filePath}"`,
      '.java': `java "${filePath}"`,
      '.exe': `"${filePath}"`
    };

    const command: string = commandMap[ext];
    
    if (!command) {
      throw new Error(`Unsupported file type: ${ext}. Supported types: ${Object.keys(commandMap).join(', ')}`);
    }

    return ExecuteFileTool.execute(command, timeout);
  }
} 
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "../..");
const logDir = join(rootDir, "logs");

// Ensure log directory exists
try {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
} catch (err) {
  // Fall back to using the current directory if we can't create/access logs dir
  console.error("Could not access or create logs directory:", err);
}

export class Logger {
  private static instance: Logger;
  private isStdioTransport: boolean;
  private debugMode: boolean;
  private logFilePath: string;

  private constructor() {
    // Determine if running with stdio transport based on env or command line args
    this.isStdioTransport = process.env.TRANSPORT_TYPE === 'stdio' || 
                            process.argv.includes('--stdio') ||
                            process.argv[1]?.includes('mcp-ragdocs');
    
    this.debugMode = process.env.DEBUG === 'true' || 
                     process.argv.includes('--debug');
    
    this.logFilePath = join(logDir, 'mcp-ragdocs.log');
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  log(...args: any[]): void {
    const message = this.formatMessage('INFO', ...args);
    
    if (!this.isStdioTransport) {
      console.log(...args);
    }
    
    if (this.debugMode || this.isStdioTransport) {
      try {
        fs.appendFileSync(this.logFilePath, message + '\n');
      } catch (err) {
        // Last resort if we can't write to file
        if (!this.isStdioTransport) {
          console.error("Could not write to log file:", err);
        }
      }
    }
  }

  error(...args: any[]): void {
    const message = this.formatMessage('ERROR', ...args);
    
    if (!this.isStdioTransport) {
      console.error(...args);
    } else {
      // When using stdio transport, we can safely write to stderr 
      // as MCP only uses stdout for communication
      process.stderr.write(message + '\n');
    }
    
    // Always log errors to file
    try {
      fs.appendFileSync(this.logFilePath, message + '\n');
    } catch (err) {
      // Last resort if we can't write to file
      if (!this.isStdioTransport) {
        console.error("Could not write error to log file:", err);
      }
    }
  }

  info(...args: any[]): void {
    this.log(...args);
  }

  warn(...args: any[]): void {
    const message = this.formatMessage('WARN', ...args);
    
    if (!this.isStdioTransport) {
      console.warn(...args);
    } else {
      process.stderr.write(message + '\n');
    }
    
    try {
      fs.appendFileSync(this.logFilePath, message + '\n');
    } catch (err) {
      // Last resort if we can't write to file
      if (!this.isStdioTransport) {
        console.error("Could not write warning to log file:", err);
      }
    }
  }

  debug(...args: any[]): void {
    if (!this.debugMode) return;
    
    const message = this.formatMessage('DEBUG', ...args);
    
    if (!this.isStdioTransport) {
      console.debug(...args);
    }
    
    try {
      fs.appendFileSync(this.logFilePath, message + '\n');
    } catch (err) {
      // Fall back
      if (!this.isStdioTransport) {
        console.error("Could not write debug info to log file:", err);
      }
    }
  }

  private formatMessage(level: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
    
    return `${timestamp} [${level}] ${formattedArgs}`;
  }
}

export const logger = Logger.getInstance();

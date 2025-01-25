import fs from "fs/promises";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { McpToolResponse, ToolDefinition } from "../types.js";
import { BaseTool } from "./base-tool.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.join(__dirname, "../..");
const QUEUE_FILE = path.join(rootDir, "queue.txt");

export class ListQueueTool extends BaseTool {
  constructor() {
    super();
  }

  get definition(): ToolDefinition {
    return {
      name: "list_queue",
      description:
        "List all URLs currently in the documentation processing queue",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    };
  }

  async execute(_args: any): Promise<McpToolResponse> {
    try {
      // Check if queue file exists
      try {
        await fs.access(QUEUE_FILE);
      } catch {
        return {
          content: [
            {
              type: "text",
              text: "",
            },
          ],
        };
      }

      // Read queue file
      const content = await fs.readFile(QUEUE_FILE, "utf-8");
      const urls = content.split("\n").filter((url) => url.trim() !== "");

      if (urls.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "",
            },
          ],
        };
      }

      // Return just the URLs, one per line
      return {
        content: [
          {
            type: "text",
            text: urls.join("\n"),
          },
        ],
      };
    } catch (error) {
      console.error("Error reading queue:", error);
      return {
        content: [
          {
            type: "text",
            text: "",
          },
        ],
      };
    }
  }
}

#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ApiClient } from "./api-client.js";
import { HandlerRegistry } from "./handler-registry.js";
import { WebInterface } from "./server.js";
import { logger } from "./utils/logger.js";

const COLLECTION_NAME = "documentation";

class RagDocsServer {
  private server: Server;
  private apiClient: ApiClient;
  private handlerRegistry: HandlerRegistry;
  private webInterface: WebInterface;

  constructor() {
    this.server = new Server(
      {
        name: "mcp-ragdocs",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.apiClient = new ApiClient();
    this.handlerRegistry = new HandlerRegistry(this.server, this.apiClient);
    this.webInterface = new WebInterface(this.apiClient);

    // Error handling
    this.server.onerror = (error) => logger.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.cleanup();
      process.exit(0);
    });
  }

  private async cleanup() {
    await this.apiClient.cleanup();
    await this.webInterface.stop();
    await this.server.close();
  }

  async run() {
    try {
      // Initialize Qdrant collection
      logger.info("Initializing Qdrant collection...");
      await this.apiClient.initCollection(COLLECTION_NAME);
      logger.info("Qdrant collection initialized successfully");

      // Start web interface
      await this.webInterface.start();
      logger.info("Web interface is running");

      // Start MCP server
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      logger.info("RAG Docs MCP server running on stdio");
    } catch (error) {
      logger.error("Failed to initialize server:", error);
      process.exit(1);
    }
  }
}

const server = new RagDocsServer();
server.run().catch((error) => {
  logger.error("Fatal error:", error);
  process.exit(1);
});

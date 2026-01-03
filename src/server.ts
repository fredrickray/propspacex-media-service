import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import http from "http";
import * as grpc from "@grpc/grpc-js";
import config from "@config/dotenv.config";
import { MediaService } from "./grpc/index";
import { mediaGrpcService } from "./grpc/servers/media.server";
import v1Routes from "./v1/route/index";
import {
  errorMiddleware,
  notFoundMiddleware,
} from "./middlewares/error.middleware";
import { connectDatabase } from "@config/db";

export default class Server {
  public app: Application;
  public grpcServer: grpc.Server;
  private httpServer: http.Server | null = null;

  constructor() {
    this.app = express();
    this.grpcServer = new grpc.Server();
    this.setupMiddlewares();
    this.setupRoutes();
    this.setupGrpcServices();
    this.setupErrorHandling();
    this.connectDatabase();
    this.setupGracefulShutdown();
    this.startGrpcServer();
  }

  private setupMiddlewares(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(
      "/uploads",
      express.static(path.join(process.cwd(), "uploads"))
    );
  }

  private setupRoutes(): void {
    this.app.get("/health", (_req, res) => {
      res.json({
        success: true,
        message: "Media service is running",
        timestamp: new Date().toISOString(),
      });
    });

    this.app.use("/v1/api/media", v1Routes);
  }

  private setupGrpcServices(): void {
    this.grpcServer.addService(MediaService.service, mediaGrpcService);
  }

  private setupErrorHandling(): void {
    this.app.use(notFoundMiddleware);
    this.app.use(errorMiddleware);
  }

  private async connectDatabase(): Promise<void> {
    try {
      await connectDatabase();
    } catch (error) {
      console.error("Database connection failed:", error);
      process.exit(1);
    }
  }

  private async startGrpcServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.grpcServer.bindAsync(
        `0.0.0.0:${config.grpcPort}`,
        grpc.ServerCredentials.createInsecure(),
        (err, port) => {
          if (err) {
            reject(err);
            return;
          }
          console.log(`gRPC server running on port ${port}`);
          resolve();
        }
      );
    });
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string): Promise<void> => {
      console.log(`\n${signal} received. Shutting down gracefully...`);

      if (this.httpServer) {
        this.httpServer.close(() => {
          console.log("✅ HTTP server closed");
        });
      }

      this.grpcServer.tryShutdown(() => {
        console.log("✅ gRPC server closed");
      });

      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  }

  public async start(port: number = config.port): Promise<void> {
    try {
      this.httpServer = this.app.listen(port, () => {
        console.log(`Media Service initialized and ready for action! 🤖`);
        console.log(`HTTP server running on port ${port}`);
        console.log(`Storage provider: ${config.storageProvider}`);
        console.log(`Environment: ${config.nodeEnv}`);
      });
      await this.startGrpcServer();
    } catch (error) {
      console.error("Failed to start server:", error);
      process.exit(1);
    }
  }
}

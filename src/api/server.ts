import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import { Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Middleware
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { requestIdMiddleware } from './middleware/requestId';

// Routes
import healthRouter from './routes/health';
import quotesRouter from './routes/quotes';
import swapRouter from './routes/swap';
import routesRouter from './routes/routes';
import agentsRouter from './routes/agents';

// WebSocket
import { setupPriceStream } from './websocket/priceStream';

// Config
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Application server class
 */
export class AppServer {
  private app: Application;
  private server: Server | null = null;
  private io: SocketIOServer | null = null;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    // Security
    this.app.use(helmet());
    this.app.use(
      cors({
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true,
      })
    );

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request ID
    this.app.use(requestIdMiddleware);

    // Logging
    this.app.use(requestLogger);

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      message: 'Too many requests from this IP',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // API routes
    this.app.use('/api/health', healthRouter);
    this.app.use('/api/quotes', quotesRouter);
    this.app.use('/api/swap', swapRouter);
    this.app.use('/api/routes', routesRouter);
    this.app.use('/api/agents', agentsRouter);

    // Root endpoint
    this.app.get('/', (_req, res) => {
      res.json({
        name: 'LiquidityFlow API',
        version: process.env.npm_package_version || '1.0.0',
        status: 'running',
        endpoints: [
          'GET /api/quotes',
          'POST /api/swap',
          'GET /api/routes',
          'POST /api/agents/execute',
          'GET /api/health',
          'WS /api/stream',
        ],
      });
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'E404',
          message: 'Endpoint not found',
        },
        metadata: {
          timestamp: Date.now(),
          requestId: req.headers['x-request-id'] as string,
          serverVersion: process.env.npm_package_version || '1.0.0',
        },
      });
    });
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(config.port, () => {
        logger.info(`🚀 LiquidityFlow API listening on port ${config.port}`);
        logger.info(`📊 Environment: ${config.nodeEnv}`);
        logger.info(`🔗 Solana RPC: ${config.solana.rpcEndpoint}`);

        // Setup WebSocket server
        if (this.server) {
          this.io = new SocketIOServer(this.server, {
            cors: {
              origin: '*',
            },
          });
          setupPriceStream(this.io);
          logger.info('📡 WebSocket server initialized');
        }

        resolve();
      });
    });
  }

  /**
   * Stop the server
   */
  public async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.io) {
        this.io.close();
      }

      if (this.server) {
        this.server.close((err) => {
          if (err) reject(err);
          else {
            logger.info('Server stopped');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get Express app instance
   */
  public getApp(): Application {
    return this.app;
  }

  /**
   * Get WebSocket server
   */
  public getIO(): SocketIOServer | null {
    return this.io;
  }
}


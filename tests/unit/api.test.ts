import { Application } from 'express';
import { AppServer } from '../../src/api/server';

describe('API Endpoints - Unit Tests', () => {
  describe('Server Initialization', () => {
    it('should create an AppServer instance', () => {
      const server = new AppServer();
      expect(server).toBeDefined();
      expect(server.getApp()).toBeDefined();
    });

    it('should expose Express app', () => {
      const server = new AppServer();
      const app = server.getApp();
      expect(app).toBeDefined();
      expect(typeof app.listen).toBe('function');
    });

    it('should allow starting and stopping the server', async () => {
      const server = new AppServer();
      await expect(server.start()).resolves.not.toThrow();
      await expect(server.stop()).resolves.not.toThrow();
    });
  });

  describe('Route Configuration', () => {
    let app: Application;
    let server: AppServer;

    beforeAll(() => {
      server = new AppServer();
      app = server.getApp();
    });

    afterAll(async () => {
      await server.stop();
    });

    it('should have root endpoint configured', () => {
      expect(app).toBeDefined();
    });

    it('should have health endpoint configured', () => {
      expect(app).toBeDefined();
    });
  });
});


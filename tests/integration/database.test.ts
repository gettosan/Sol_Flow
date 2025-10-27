import { getPool, connectDatabase, closeDatabase } from '../../src/database/postgres/connection';
import { createTables } from '../../src/database/postgres/schema';
import { getRedis, connectRedis, closeRedis } from '../../src/database/redis/client';

describe('Database Integration Tests', () => {
  beforeAll(async () => {
    // These tests require Docker containers to be running
    // Skip if containers are not available
    try {
      await connectDatabase();
      await connectRedis();
    } catch (error) {
      console.log('Docker containers not available, skipping integration tests');
      console.log('Start containers with: docker-compose up -d');
      return;
    }
  });

  afterAll(async () => {
    await closeDatabase();
    await closeRedis();
  });

  describe('PostgreSQL Connection', () => {
    it('should connect to PostgreSQL successfully', async () => {
      const pool = getPool();
      expect(pool).toBeDefined();
      
      const client = await pool.connect();
      expect(client).toBeDefined();
      
      const result = await client.query('SELECT NOW()');
      expect(result.rows).toBeDefined();
      
      client.release();
    });

    it('should create tables successfully', async () => {
      await createTables();
      // If we get here without error, tables were created
      expect(true).toBe(true);
    });

    it('should query tables', async () => {
      const result = await getPool().query('SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\'');
      expect(result.rows.length).toBeGreaterThan(0);
      
      const tableNames = result.rows.map((row: any) => row.table_name);
      expect(tableNames).toContain('trades');
    });
  });

  describe('Redis Connection', () => {
    it('should connect to Redis successfully', async () => {
      const redis = getRedis();
      expect(redis).toBeDefined();
      
      const result = await redis.ping();
      expect(result).toBe('PONG');
    });

    it('should set and get values', async () => {
      const redis = getRedis();
      
      await redis.set('test:key', 'test:value');
      const value = await redis.get('test:key');
      expect(value).toBe('test:value');
      
      await redis.del('test:key');
    });

    it('should expire keys', async () => {
      const redis = getRedis();
      
      await redis.set('test:expire', 'value', 'EX', 1);
      const value1 = await redis.get('test:expire');
      expect(value1).toBe('value');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const value2 = await redis.get('test:expire');
      expect(value2).toBeNull();
    });
  });
});


import { FastifyInstance } from 'fastify';
import { initDb } from '../../db/index.js';

/**
 * Admin Routes (use with caution!)
 */
export async function adminRoutes(server: FastifyInstance) {
  /**
   * POST /admin/init-db - Initialize database
   * Creates all tables if they don't exist
   */
  server.post('/init-db', async () => {
    try {
      initDb();
      return { success: true, message: 'Database initialized successfully' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}

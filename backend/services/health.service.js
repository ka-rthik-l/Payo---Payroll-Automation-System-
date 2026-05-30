import prisma from '../utils/prisma.js';

export const healthService = {
  async check() {
    const timestamp = new Date().toISOString();

    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        database: 'connected',
        timestamp
      };
    } catch {
      return {
        status: 'error',
        database: 'disconnected',
        timestamp
      };
    }
  }
};

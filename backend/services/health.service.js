import prisma from '../utils/prisma.js';

export const healthService = {
  async check() {
    const timestamp = new Date().toISOString();

    try {
      const dbNameResult = await prisma.$queryRawUnsafe('SELECT DATABASE() as db;');
      const activeDatabase = dbNameResult[0]?.db || 'none';

      const tablesResult = await prisma.$queryRawUnsafe('SHOW TABLES;');
      const visibleTables = tablesResult.map(row => Object.values(row)[0]);

      return {
        status: 'ok',
        database: 'connected',
        activeDatabase,
        visibleTables,
        timestamp
      };
    } catch (err) {
      return {
        status: 'error',
        database: 'disconnected',
        errorDetails: {
          message: err.message,
          code: err.code,
          stack: err.stack
        },
        timestamp
      };
    }
  }
};

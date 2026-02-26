const { PrismaClient } = require('@prisma/client');

// Singleton pattern — reuse across serverless invocations
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error'],
  });
} else {
  // In dev, attach to globalThis so hot-reload doesn't create new connections
  if (!globalThis.__prisma) {
    globalThis.__prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }
  prisma = globalThis.__prisma;
}

module.exports = prisma;

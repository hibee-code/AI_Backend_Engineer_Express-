import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { config } from './config';

// Prisma 7 connects through a driver adapter. Pool settings (max connections,
// timeouts) are configured here, not via ?connection_limit= in the URL.
const adapter = new PrismaPg({ connectionString: config.DATABASE_URL });

// Create ONE instance and export it
export const prisma = new PrismaClient({
  adapter,
  log: config.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
});

// Every file in your application imports from here:
//   import { prisma } from '../lib/prisma';
//
// NEVER do this:
//   const prisma = new PrismaClient(); // in a service file
//   const prisma = new PrismaClient(); // in a repository file
//   // Two instances = two pools = wasted connections

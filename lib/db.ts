// dbClient / clientBD : instanciation centralisée de Prisma
// Centralized Prisma instantiation for database access

import { PrismaClient } from '@prisma/client';

// globalForPrisma / globalPourPrisma : évite de recréer le client en mode dev (Hot Reload)
// Prevents creating multiple clients in dev mode (Hot Reload)
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    // logConfig / configLog : utile en dev pour voir les requêtes SQL
    // Helpful in dev to see SQL queries
    log: ['error', 'warn'],
  });

// cacheClientInDev / miseEnCacheClientEnDev : on stocke l'instance en global pour éviter les doublons
// Store the client instance globally in dev to avoid duplicates
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

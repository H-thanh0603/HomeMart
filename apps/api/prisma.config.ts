// prisma.config.ts — Prisma 7: connection URLs live here, not in schema.prisma
import { defineConfig } from 'prisma/config';
import { PrismaPg } from '@prisma/adapter-pg';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
  adapter: async () => {
    const { Pool } = await import('pg');
    return new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL }));
  },
});

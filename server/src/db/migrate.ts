import prisma from './prisma.js';

let isSchemaEnsured = false;

/**
 * Ensures that all necessary database columns and constraints exist in PostgreSQL.
 * Safe, idempotent, and non-destructive.
 */
export async function ensureDatabaseSchema(): Promise<void> {
  if (isSchemaEnsured) return;
  if (!process.env.DATABASE_URL) return;

  try {
    // 1. Ensure Message.parentId column exists
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "parentId" TEXT;
    `);

    // 2. Ensure Message.parentId index exists
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Message_parentId_idx" ON "Message"("parentId");
    `);

    // 3. Ensure foreign key constraint if missing
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'Message_parentId_fkey'
        ) THEN
          ALTER TABLE "Message"
            ADD CONSTRAINT "Message_parentId_fkey"
            FOREIGN KEY ("parentId") REFERENCES "Message"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    isSchemaEnsured = true;
    console.log('[Database] Production schema verified (Message.parentId column ensured).');
  } catch (err: unknown) {
    console.warn('[Database] Schema self-healing notice:', err instanceof Error ? err.message : err);
  }
}

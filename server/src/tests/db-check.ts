import prisma from '../db/prisma.js';

async function checkDatabase() {
  try {
    const tables: Array<{ table_name: string }> = await prisma.$queryRawUnsafe(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;`
    );
    console.log('--- Database Tables in PostgreSQL ---');
    console.log(tables.map((t) => t.table_name));

    // Check count in each table safely
    for (const { table_name } of tables) {
      if (table_name.startsWith('_')) continue;
      const countResult: Array<{ count: bigint | number }> = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) FROM "${table_name}";`
      );
      console.log(`Table "${table_name}": ${countResult[0]?.count ?? 0} rows`);
    }
  } catch (err) {
    console.error('Database query failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();

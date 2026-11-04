const { PrismaClient } = require('@prisma/client');
const testDbUrl = 'postgresql://postgres:postgres@localhost:5432/ibeno_test?schema=public';
process.env.DATABASE_URL = testDbUrl;

const prisma = new PrismaClient({
  datasources: { db: { url: testDbUrl } }
});

async function test() {
  await prisma.$connect();
  console.log('Successfully connected to local PostgreSQL database ibeno_test!');
}

test().catch(err => {
  console.error('Connection failed:', err.message);
  process.exit(1);
}).finally(() => prisma.$disconnect());

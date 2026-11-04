const { PrismaClient } = require('@prisma/client');

async function test(host) {
  const url = `postgresql://postgres:postgres@${host}:5432/ibeno_test?schema=public`;
  process.env.DATABASE_URL = url;
  const p = new PrismaClient({ datasources: { db: { url } } });
  try {
    const start = Date.now();
    const count = await p.application.count();
    console.log(`Success with host ${host}: count=${count} in ${Date.now() - start}ms`);
  } catch (e) {
    console.error(`Failed with host ${host}:`, e.message);
  } finally {
    await p.$disconnect();
  }
}

async function main() {
  await test('127.0.0.1');
  await test('localhost');
}

main();

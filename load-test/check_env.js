const fs = require('fs');
const path = require('path');

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const prodEnv = parseEnv(path.resolve('.env.production.local'));
const dbUrl = prodEnv.DATABASE_URL;
console.log('dbUrl exists?', !!dbUrl, 'typeof:', typeof dbUrl, 'prefix:', dbUrl ? dbUrl.substring(0, 15) : 'none');
process.env.DATABASE_URL = dbUrl;

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } }
});

async function main() {
  const count = await prisma.application.count();
  console.log('Current application count in database:', count);
  const apps = await prisma.application.findMany({
    take: 5,
    orderBy: { submitted_at: 'desc' },
    select: { id: true, reference_number: true, full_name: true, submitted_at: true }
  });
  console.log('Latest applications:', apps);
}

main().catch(err => {
  console.error('Database connection error:', err);
  process.exit(1);
}).finally(() => prisma.$disconnect());

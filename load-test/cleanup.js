const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const url = 'postgresql://postgres:postgres@127.0.0.1:5432/ibeno_test?schema=public';
process.env.DATABASE_URL = url;
const prisma = new PrismaClient({ datasources: { db: { url } } });

async function cleanup(onlyPrefix = null) {
  try {
    let deletedApps;
    if (onlyPrefix) {
      deletedApps = await prisma.application.deleteMany({
        where: {
          OR: [
            { reference_number: { startsWith: onlyPrefix } },
            { full_name: { startsWith: 'TEST' } },
            { jamb_number: { startsWith: 'TEST' } },
            { matric_number: { startsWith: 'TEST' } },
          ]
        }
      });
    } else {
      deletedApps = await prisma.application.deleteMany({});
    }
    console.log(`Cleaned up ${deletedApps.count} application records from ibeno_test database.`);

    // Clean .local_storage
    const storageDir = path.resolve('.local_storage');
    if (fs.existsSync(storageDir)) {
      fs.rmSync(storageDir, { recursive: true, force: true });
      console.log('Cleaned up .local_storage directory.');
    }
  } catch (err) {
    console.error('Cleanup error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  cleanup();
}

module.exports = { cleanup };

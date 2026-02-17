const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Prisma Client Keys:', Object.keys(prisma));
    if (prisma.document) {
        console.log('prisma.document exists!');
    } else {
        console.error('prisma.document MISSING');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());

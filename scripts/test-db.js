const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('Attempting to connect to database...');
    try {
        const userCount = await prisma.user.count();
        console.log(`Connection successful! Found ${userCount} users.`);
    } catch (error) {
        console.error('Connection failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

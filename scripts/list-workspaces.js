
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const workspaces = await prisma.workspace.findMany();
    console.log("Workspaces:", workspaces);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

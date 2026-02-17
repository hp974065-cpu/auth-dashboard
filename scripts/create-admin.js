const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@example.com';
    const password = await bcrypt.hash('password123', 10);

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (!existingUser) {
        const user = await prisma.user.create({
            data: {
                email,
                name: 'Admin User',
                password,
                role: 'ADMIN',
                isApproved: true,
            },
        });
        console.log('Created admin user:', user.email);
    } else {
        const user = await prisma.user.update({
            where: { email },
            data: {
                isApproved: true,
                role: 'ADMIN',
            },
        });
        console.log('Updated admin user:', user.email);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

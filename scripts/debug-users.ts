
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
    try {
        const users = await prisma.user.findMany();
        console.log('--- Database Users ---');
        if (users.length === 0) {
            console.log('No users found in the database.');
        } else {
            users.forEach(user => {
                console.log(`Email: ${user.email}, Role: ${user.role}, Approved: ${user.isApproved}`);
            });
        }
        console.log('----------------------');
    } catch (error) {
        console.error('Error fetching users:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkUsers();

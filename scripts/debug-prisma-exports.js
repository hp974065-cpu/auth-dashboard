const { PrismaClient } = require('@prisma/client');
console.log('Successfully required PrismaClient');

// We can't easily check typescript exports in JS, but we can check if the code runs.
// valid imports are compile time check.

// Let's check if we can verify the d.ts files.
const fs = require('fs');
const path = require('path');

const clientDir = path.dirname(require.resolve('@prisma/client'));
console.log('@prisma/client dir:', clientDir);

const indexDts = path.join(clientDir, 'index.d.ts');
if (fs.existsSync(indexDts)) {
    console.log('index.d.ts content:', fs.readFileSync(indexDts, 'utf-8'));
}

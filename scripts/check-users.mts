import { Pool } from 'pg'

const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_YyRv8j5uampW@ep-flat-smoke-ai3vpybv-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require'
})

async function main() {
    try {
        const result = await pool.query('SELECT id, name, email, role, "isApproved" FROM "User"')
        console.log('Users in database:', JSON.stringify(result.rows, null, 2))
    } catch (error: any) {
        console.error('Error:', error.message)
    } finally {
        await pool.end()
    }
}

main()

import { Pool } from 'pg'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
    // Keep minimal logging; server can still start for /health
    console.warn('[db] DATABASE_URL is not set; DB features disabled')
}

export const pool = new Pool({
    connectionString: databaseUrl,
    // sensible defaults for dev
    max: 10,
    idleTimeoutMillis: 10_000,
})

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
    const client = await pool.connect()
    try {
        const res = await client.query(text, params)
        return { rows: res.rows as T[] }
    } finally {
        client.release()
    }
}



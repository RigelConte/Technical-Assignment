import express from 'express'
import cors from 'cors'
import { initDb } from './db/init'
import { connectPrisma, prisma } from './db/prisma'
import { statesRouter } from './routes/states.routes'
import { nlpRouter } from './routes/nlp.routes'

const app = express()
app.use(cors())
app.use(express.json({ limit: '5mb' }))

const port = Number(process.env.PORT || process.env.API_PORT || 3000)

app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
})

app.use('/api/states', statesRouter)
app.use('/api/nlp', nlpRouter)

// Basic JSON error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[api] error', err)
    res.status(500).json({ error: 'internal_error' })
})

async function start() {
    try {
        // Try to initialize database, but don't fail if unavailable
        await initDb().catch((e) => console.warn('[db] init failed, NLP will still work:', e.message))
        await connectPrisma().catch((e) => console.warn('[prisma] connection failed, state persistence disabled:', e.message))

        app.listen(port, () => {
            console.log(`[api] listening on :${port}`)
            console.log('[api] NLP commands available at /api/nlp/*')
            if (!process.env.DATABASE_URL) {
                console.warn('[api] Database not configured - state persistence disabled')
            }
        })
    } catch (error) {
        console.error('[startup] Failed to start server:', error)
        process.exit(1)
    }
}

start()

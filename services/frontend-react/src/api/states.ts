const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export type SnapshotCategory = 'wardrobe' | 'kitchen_cabinets'

export type StateSummary = {
    id: string
    name: string
    category: SnapshotCategory
    thumbnail_data_url?: string | null
    created_at: string
    updated_at: string
}

export async function listStates(params: { limit?: number; offset?: number; query?: string; category?: SnapshotCategory } = {}) {
    const u = new URL('/api/states', API_URL)
    if (params.limit) u.searchParams.set('limit', String(params.limit))
    if (params.offset) u.searchParams.set('offset', String(params.offset))
    if (params.query) u.searchParams.set('query', params.query)
    if (params.category) u.searchParams.set('category', params.category)
    const res = await fetch(u)
    if (!res.ok) {
        try { const err = await res.json(); throw new Error(`Failed to list states: ${JSON.stringify(err)}`) } catch { throw new Error('Failed to list states') }
    }
    return res.json() as Promise<{ items: StateSummary[] }>
}

export async function getState(id: string) {
    const res = await fetch(`${API_URL}/api/states/${id}`)
    if (!res.ok) {
        try { const err = await res.json(); throw new Error(`Failed to get state: ${JSON.stringify(err)}`) } catch { throw new Error('Failed to get state') }
    }
    return res.json() as Promise<any>
}

export async function createState(body: { name: string; thumbnail_data_url?: string; state: unknown; category?: SnapshotCategory }) {
    const res = await fetch(`${API_URL}/api/states`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
    if (!res.ok) {
        try { const err = await res.json(); throw new Error(`Failed to create state: ${JSON.stringify(err)}`) } catch { throw new Error('Failed to create state') }
    }
    return res.json() as Promise<StateSummary>
}

export async function updateState(id: string, body: { name?: string; thumbnail_data_url?: string; state?: unknown; category?: SnapshotCategory }) {
    const res = await fetch(`${API_URL}/api/states/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
    if (!res.ok) {
        try { const err = await res.json(); throw new Error(`Failed to update state: ${JSON.stringify(err)}`) } catch { throw new Error('Failed to update state') }
    }
    return res.json() as Promise<{ ok: true }>
}

export async function deleteState(id: string) {
    const res = await fetch(`${API_URL}/api/states/${id}`, { method: 'DELETE' })
    if (!res.ok) {
        try { const err = await res.json(); throw new Error(`Failed to delete state: ${JSON.stringify(err)}`) } catch { throw new Error('Failed to delete state') }
    }
}



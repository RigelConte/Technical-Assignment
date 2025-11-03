import type { Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { ConfiguratorStateZ, CreateStateBodyZ, UpdateStateBodyZ } from '../schemas/configuratorState';

function badRequest(res: Response, issues: unknown) {
  return res.status(400).json({ error: 'validation_error', issues });
}

export async function listStates(req: Request, res: Response) {
  const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '24')), 1), 100);
  const offset = Math.max(parseInt(String(req.query.offset ?? '0')), 0);
  const q = String(req.query.query ?? '').trim();
  const category = req.query.category as string | undefined;

  const where: any = {};

  if (q) {
    where.name = {
      contains: q,
      mode: 'insensitive'
    };
  }

  if (category && (category === 'wardrobe' || category === 'kitchen_cabinets')) {
    where.category = category;
  }

  const items = await prisma.configuratorSnapshot.findMany({
    where,
    orderBy: {
      createdAt: 'desc'
    },
    take: limit,
    skip: offset,
    select: {
      id: true,
      name: true,
      category: true,
      thumbnailUrl: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return res.json({ items });
}

export async function getState(req: Request, res: Response) {
  const id = req.params.id as string;

  const snapshot = await prisma.configuratorSnapshot.findUnique({
    where: { id }
  });

  if (!snapshot) {
    return res.status(404).json({ error: 'not_found' });
  }

  const parsed = ConfiguratorStateZ.safeParse(snapshot.state);
  if (!parsed.success) {
    return badRequest(res, parsed.error.issues);
  }

  return res.json({
    id: snapshot.id,
    name: snapshot.name,
    category: snapshot.category,
    thumbnail_data_url: snapshot.thumbnailUrl,
    state: parsed.data,
    created_at: snapshot.createdAt,
    updated_at: snapshot.updatedAt
  });
}

export async function createState(req: Request, res: Response) {
  console.log('[states] create body keys:', Object.keys(req.body || {}));

  const parsed = CreateStateBodyZ.safeParse(req.body);
  if (!parsed.success) {
    console.warn('[states] create validation error:', parsed.error.issues);
    return badRequest(res, parsed.error.issues);
  }

  const { name, thumbnail_data_url, state, category } = parsed.data;
  console.log('[states] creating', { name, category, thumbLen: thumbnail_data_url?.length ?? 0 });

  const snapshot = await prisma.configuratorSnapshot.create({
    data: {
      name,
      category: category || 'wardrobe',
      thumbnailUrl: thumbnail_data_url ?? null,
      state: state as any
    },
    select: {
      id: true,
      name: true,
      category: true,
      thumbnailUrl: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return res.status(201).json({
    id: snapshot.id,
    name: snapshot.name,
    category: snapshot.category,
    thumbnail_data_url: snapshot.thumbnailUrl,
    created_at: snapshot.createdAt,
    updated_at: snapshot.updatedAt
  });
}

export async function updateState(req: Request, res: Response) {
  const id = req.params.id as string;
  console.log('[states] update id:', id, 'body keys:', Object.keys(req.body || {}));

  const parsed = UpdateStateBodyZ.safeParse(req.body);
  if (!parsed.success) {
    console.warn('[states] update validation error:', parsed.error.issues);
    return badRequest(res, parsed.error.issues);
  }

  const { name, thumbnail_data_url, state, category } = parsed.data;

  const data: any = {};
  if (name !== undefined) data.name = name;
  if (thumbnail_data_url !== undefined) data.thumbnailUrl = thumbnail_data_url;
  if (state !== undefined) data.state = state;
  if (category !== undefined) data.category = category;

  if (Object.keys(data).length === 0) {
    return res.json({ ok: true });
  }

  await prisma.configuratorSnapshot.update({
    where: { id },
    data
  });

  return res.json({ ok: true });
}

export async function deleteState(req: Request, res: Response) {
  const id = req.params.id as string;

  await prisma.configuratorSnapshot.delete({
    where: { id }
  });

  return res.status(204).end();
}

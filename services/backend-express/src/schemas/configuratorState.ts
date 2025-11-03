import { z } from 'zod'

export const IdZ = z.string().uuid()

export const DimensionsZ = z.object({
    width: z.number().finite(),
    height: z.number().finite(),
    depth: z.number().finite(),
})

export const ColumnZ = z.object({
    id: z.string().min(1),
    x: z.number().finite(),
    width: z.number().finite(),
})

export const ShelfZ = z.object({
    id: z.string().min(1),
    y: z.number().finite(),
})

export const DoorZ = z.object({
    id: z.string().min(1),
    x: z.number().finite(),
    width: z.number().finite(),
})

export const MaterialDefZ = z.object({
    name: z.string().min(1),
    color: z.string().optional(),
    mapUrl: z.string().url().or(z.string()).optional().nullable(),
})

export const WoodParamsZ = z.object({
    ringFrequency: z.number(),
    ringSharpness: z.number(),
    ringThickness: z.number().optional(),
    grainScale: z.number(),
    grainWarp: z.number(),
    fbmOctaves: z.number(),
    fbmGain: z.number(),
    fbmLacunarity: z.number(),
    poreScale: z.number().optional(),
    poreStrength: z.number().optional(),
    lightColor: z.string(),
    darkColor: z.string(),
    roughMin: z.number(),
    roughMax: z.number(),
    centerSize: z.number().optional(),
    largeWarpScale: z.number().optional(),
    largeGrainStretch: z.number().optional(),
    smallWarpStrength: z.number().optional(),
    smallWarpScale: z.number().optional(),
    fineWarpStrength: z.number().optional(),
    fineWarpScale: z.number().optional(),
    ringBias: z.number().optional(),
    ringSizeVariance: z.number().optional(),
    ringVarianceScale: z.number().optional(),
    barkThickness: z.number().optional(),
    splotchScale: z.number().optional(),
    splotchIntensity: z.number().optional(),
    cellScale: z.number().optional(),
    cellSize: z.number().optional(),
    clearcoat: z.number().optional(),
    clearcoatRoughness: z.number().optional(),
})

export const ConfiguratorStateZ = z.object({
    version: z.literal('1'),
    dimensions: DimensionsZ,
    columns: z.array(ColumnZ),
    shelves: z.array(ShelfZ),
    doors: z.array(DoorZ),
    columnThickness: z.number(),
    shelfThickness: z.number(),
    doorThickness: z.number(),
    frameThickness: z.number(),
    materials: z.record(z.string(), MaterialDefZ),
    selectedMaterialKey: z.string().nullable(),
    woodParams: WoodParamsZ,
    selectedGenus: z.string().min(1).optional(),
    selectedFinish: z.string().min(1).optional(),
    hoveredId: z.object({ type: z.enum(['shelf', 'column', 'door']).nullable(), id: z.string().nullable() }).optional(),
    selectedId: z.object({ type: z.enum(['shelf', 'column', 'door']).nullable(), id: z.string().nullable() }).optional(),
})

export type ConfiguratorState = z.infer<typeof ConfiguratorStateZ>

export const CategoryZ = z.enum(['wardrobe', 'kitchen_cabinets'])

export const CreateStateBodyZ = z.object({
    name: z.string().min(1),
    thumbnail_data_url: z.string().optional(),
    state: ConfiguratorStateZ,
    category: CategoryZ.optional(),
})

export const UpdateStateBodyZ = z.object({
    name: z.string().min(1).optional(),
    thumbnail_data_url: z.string().optional(),
    state: ConfiguratorStateZ.optional(),
    category: CategoryZ.optional(),
})



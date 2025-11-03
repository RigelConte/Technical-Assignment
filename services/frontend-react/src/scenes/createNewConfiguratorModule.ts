import { createStore } from "zustand";
import { MIN_SPACING } from "@/state/Config";

export interface ModuleDimensions {
    width: number; // meters
    height: number; // meters
    depth: number; // meters
}

export interface ModuleColumn {
    id: string;
    x: number; // meters from left
    width: number; // meters
}

export interface ModuleShelf {
    id: string;
    y: number; // meters from bottom
}

export interface ModuleDoor {
    id: string;    
    x: number; // meters from left
    width: number; // meters
}

export interface ModuleState {
    dimensions: ModuleDimensions;
    columns: ModuleColumn[];
    shelves: ModuleShelf[];
    doors: ModuleDoor[];
    // Thickness controls (meters)
    columnThickness: number;
    shelfThickness: number;    
    doorThickness: number;    
    frameThickness: number;
    materials: Record<string, { name: string; color?: string; mapUrl?: string | undefined }>;
    selectedMaterialKey: string | null;
    woodParams: {
        // Legacy/simple controls
        ringFrequency: number;
        ringSharpness: number;
        ringThickness?: number;
        grainScale: number;
        grainWarp: number;
        fbmOctaves: number;
        fbmGain: number;
        fbmLacunarity: number;
        poreScale?: number;
        poreStrength?: number;
        lightColor: string; // hex css
        darkColor: string; // hex css
        roughMin: number;
        roughMax: number;

        // WoodNodeMaterial extended controls
        centerSize?: number;
        largeWarpScale?: number;
        largeGrainStretch?: number;
        smallWarpStrength?: number;
        smallWarpScale?: number;
        fineWarpStrength?: number;
        fineWarpScale?: number;
        ringBias?: number;
        ringSizeVariance?: number;
        ringVarianceScale?: number;
        barkThickness?: number;
        splotchScale?: number;
        splotchIntensity?: number;
        cellScale?: number;
        cellSize?: number;
        clearcoat?: number;
        clearcoatRoughness?: number;
    };
    selectedGenus?: string;
    selectedFinish?: string;
    hoveredId: { type: "shelf" | "column" | "door" | null; id: string | null };
    selectedId: { type: "shelf" | "column" | "door" | null; id: string | null };    
}

export interface ModuleActions {
    setDimensions: (next: Partial<ModuleDimensions>) => void;
    
    setColumnsEven: (count: number, columnWidth?: number) => void;
    setShelvesEven: (count: number) => void;
    setDoorsEven: (count: number, columnWidth?: number) => void;
        
    addColumn: (atX?: number, width?: number) => void;
    moveColumn: (id: string, nextX: number) => void;
    removeColumn: (id: string) => void;
    setColumnThickness: (value: number) => void;
    
    addDoor: (atX?: number, width?: number) => void;
    moveDoor: (id: string, nextX: number) => void;
    removeDoor: (id: string) => void;    
    setDoorThickness: (value: number) => void;

    addShelf: (atY?: number) => void;
    moveShelf: (id: string, nextY: number) => void;
    removeShelf: (id: string) => void;      
    setShelfThickness: (value: number) => void;

    
    setFrameThickness: (value: number) => void;
    registerMaterial: (key: string, def: { name: string; color?: string; mapUrl?: string | undefined }) => void;
    setSelectedMaterial: (key: string) => void;
    setWoodParams: (next: Partial<ModuleState["woodParams"]>) => void;
    applyPreset: (
        genus: string,
        finish: string,
    ) => void;
    setHovered: (payload: { type: "shelf" | "column" | "door" | null; id: string | null }) => void;
    setSelected: (payload: { type: "shelf" | "column" | "door" | null; id: string | null }) => void;
}

export type ModuleStore = ModuleState & ModuleActions;

export interface ModuleOptions extends Partial<ModuleState> { }

function sortBy<T>(arr: T[], get: (t: T) => number): T[] {
    return [...arr].sort((a, b) => get(a) - get(b));
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

export function getInnerCavity(dim: ModuleDimensions, frameThickness: number) {
    const t = Math.max(0, frameThickness);
    const x0 = t;
    const x1 = Math.max(t, dim.width - t);
    const y0 = t;
    const y1 = Math.max(t, dim.height - t);
    return {
        x0,
        x1,
        y0,
        y1,
        innerWidth: Math.max(0, x1 - x0),
        innerHeight: Math.max(0, y1 - y0),
    } as const;
}

export function createModuleStore(options: ModuleOptions) {
    return createStore<ModuleStore>()((set, get) => ({ 
        dimensions: options.dimensions ?? { width: 1.8, height: 2.2, depth: 0.6 },
        columns: options.columns ?? [],
        shelves: options.shelves ?? [],
        doors: options.doors ?? [],
        columnThickness: (options as any)?.columnThickness ?? 0.02,
        shelfThickness: (options as any)?.shelfThickness ?? 0.02,
        frameThickness: (options as any)?.frameThickness ?? 0.02,
        doorThickness: (options as any)?.doorThickness ?? 0.02,        
        materials: options.materials ?? {},
        selectedMaterialKey: (options as any)?.selectedMaterialKey ?? null,
        woodParams: (options as any)?.woodParams ?? {
            // White oak inspired defaults matching Three.js TSL example (legacy fields)
            ringFrequency: 5.0,
            ringSharpness: 1.6,
            ringThickness: 0.35,
            grainScale: 10.0,
            grainWarp: 0.08,
            fbmOctaves: 4,
            fbmGain: 0.5,
            fbmLacunarity: 2.1,
            poreScale: 18.0,
            poreStrength: 0.12,
            lightColor: "#926c50",
            darkColor: "#0c0504",
            roughMin: 0.6,
            roughMax: 0.76,

            // Extended defaults mirrored from example custom material
            centerSize: 1.11,
            largeWarpScale: 0.32,
            largeGrainStretch: 0.24,
            smallWarpStrength: 0.059,
            smallWarpScale: 2,
            fineWarpStrength: 0.006,
            fineWarpScale: 32.8,
            ringBias: 0.03,
            ringSizeVariance: 0.03,
            ringVarianceScale: 4.4,
            barkThickness: 0.3,
            splotchScale: 0.2,
            splotchIntensity: 0.541,
            cellScale: 910,
            cellSize: 0.1,
            clearcoat: 1,
            clearcoatRoughness: 0.2,
        },
        selectedGenus: (options as any)?.selectedGenus ?? 'white_oak',
        selectedFinish: (options as any)?.selectedFinish ?? 'matte',
        hoveredId: { type: null, id: null },
        selectedId: { type: null, id: null },

        setDimensions: (next) =>
            set((state) => {
                const prev = state.dimensions;
                let targetWidth = next.width ?? prev.width;
                let targetHeight = next.height ?? prev.height;
                const targetDepth = next.depth ?? prev.depth;

                // Compute minimal feasible size based on current elements and spacing
                const frameT = state.frameThickness;
                const minWidth = (2 * frameT)
                    + MIN_SPACING.columns * (state.columns.length + 1)
                    + state.columns.reduce((sum, c) => sum + c.width, 0);
                const minHeight = (2 * frameT)
                    + MIN_SPACING.shelves * (state.shelves.length + 1);
                
                //const minHeight = (2 * frameT)
                  //  + MIN_SPACING.doors * (state.doors.length + 1);

                if (targetWidth < minWidth) targetWidth = minWidth;
                if (targetHeight < minHeight) targetHeight = minHeight;

                // Proportional scaling factors for interior elements
                const scaleX = targetWidth / prev.width;
                const scaleY = targetHeight / prev.height;

                // Scale columns x positions proportionally then enforce spacing constraints
                let scaledColumns = sortBy(state.columns.map((c) => ({ ...c, x: c.x * scaleX })), (c) => c.x);
                const { x0, x1, y0, y1 } = getInnerCavity({ width: targetWidth, height: targetHeight, depth: targetDepth }, frameT);
                // Forward pass: ensure left constraints inside inner cavity
                let leftEdge = x0 + MIN_SPACING.columns;
                scaledColumns = scaledColumns.map((c) => {
                    const maxX = x1 - c.width - MIN_SPACING.columns;
                    const clampedX = clamp(c.x, leftEdge, maxX);
                    leftEdge = clampedX + c.width + MIN_SPACING.columns;
                    return { ...c, x: clampedX };
                });
                // Backward pass: ensure right constraints inside inner cavity
                for (let i = scaledColumns.length - 1; i >= 0; i -= 1) {
                    const rightNeighbor = scaledColumns[i + 1];
                    const maxAllowed = rightNeighbor
                        ? rightNeighbor.x - scaledColumns[i]!.width - MIN_SPACING.columns
                        : x1 - scaledColumns[i]!.width - MIN_SPACING.columns;
                    const minAllowed = i > 0
                        ? scaledColumns[i - 1]!.x + scaledColumns[i - 1]!.width + MIN_SPACING.columns
                        : x0 + MIN_SPACING.columns;
                    scaledColumns[i] = {
                        ...scaledColumns[i]!,
                        x: clamp(scaledColumns[i]!.x, minAllowed, maxAllowed),
                    };
                }

                // Scale shelves y positions proportionally then enforce spacing constraints (centered thickness)
                let scaledShelves = sortBy(state.shelves.map((s) => ({ ...s, y: s.y * scaleY })), (s) => s.y);
                // Forward pass: from bottom to top
                const shelfHalf = (state.shelfThickness ?? 0.02) / 2;
                let bottom = y0 + shelfHalf + MIN_SPACING.shelves;
                scaledShelves = scaledShelves.map((s) => {
                    const topLimit = y1 - shelfHalf - MIN_SPACING.shelves;
                    const clampedY = clamp(s.y, bottom, topLimit);
                    bottom = clampedY + (2 * shelfHalf) + MIN_SPACING.shelves;
                    return { ...s, y: clampedY };
                });
                // Backward pass: from top to bottom
                for (let i = scaledShelves.length - 1; i >= 0; i -= 1) {
                    const above = scaledShelves[i + 1];
                    const maxAllowed = above ? above.y - ((2 * shelfHalf) + MIN_SPACING.shelves) : y1 - shelfHalf - MIN_SPACING.shelves;
                    const minAllowed = i > 0 ? scaledShelves[i - 1]!.y + ((2 * shelfHalf) + MIN_SPACING.shelves) : y0 + shelfHalf + MIN_SPACING.shelves;
                    scaledShelves[i] = { ...scaledShelves[i]!, y: clamp(scaledShelves[i]!.y, minAllowed, maxAllowed) };
                }       
                
                // Scale columns x positions proportionally then enforce spacing constraints
                let scaledDoors = sortBy(state.doors.map((c) => ({ ...c, x: c.x * scaleX })), (c) => c.x);
                //const { xd0, xd1, yd0, yd1 } = getInnerCavity({ width: targetWidth, height: targetHeight, depth: targetDepth }, frameT);                
                // Forward pass: ensure left constraints inside inner cavity
                let leftDoorEdge = x0 + MIN_SPACING.doors;
                scaledDoors = scaledDoors.map((c) => {
                    const maxX = x1 - c.width - MIN_SPACING.doors;
                    const clampedX = clamp(c.x, leftDoorEdge, maxX);
                    leftDoorEdge = clampedX + c.width + MIN_SPACING.doors;
                    return { ...c, x: clampedX };
                });
                
                // Backward pass: ensure right constraints inside inner cavity
                for (let i = scaledDoors.length - 1; i >= 0; i -= 1) {
                    const rightNeighbor = scaledDoors[i + 1];
                    const maxAllowed = rightNeighbor
                        ? rightNeighbor.x - scaledDoors[i]!.width - MIN_SPACING.doors
                        : x1 - scaledDoors[i]!.width - MIN_SPACING.doors;
                    const minAllowed = i > 0
                        ? scaledDoors[i - 1]!.x + scaledDoors[i - 1]!.width + MIN_SPACING.doors
                        : x0 + MIN_SPACING.doors;
                    scaledDoors[i] = {
                        ...scaledDoors[i]!,
                        x: clamp(scaledDoors[i]!.x, minAllowed, maxAllowed),
                    };
                }

                return {
                    dimensions: { width: targetWidth, height: targetHeight, depth: targetDepth },
                    columns: scaledColumns,
                    shelves: scaledShelves,
                    doors: scaledDoors
                };
            }),

        setColumnsEven: (desiredCount, explicitWidth) =>
            set((state) => {
                const { x0, x1 } = getInnerCavity(state.dimensions, state.frameThickness);
                const W = x1 - x0;
                const defaultW = state.columns[0]?.width ?? state.columnThickness ?? 0.02;
                const colW = explicitWidth ?? defaultW;
                const maxCount = Math.max(0, Math.floor((W - MIN_SPACING.columns) / (colW + MIN_SPACING.columns)) - 1);
                const count = Math.max(0, Math.min(desiredCount, maxCount));
                if (count === 0) return { columns: [] };
                const gap = Math.max(
                    MIN_SPACING.columns,
                    (W - count * colW) / (count + 1),
                );
                const next: ModuleColumn[] = Array.from({ length: count }).map((_, i) => {
                    const x = x0 + gap * (i + 1) + colW * i; // absolute left edge
                    return { id: crypto.randomUUID(), x, width: colW };
                });
                return { columns: next };
            }),

        setDoorsEven: (desiredCount, explicitWidth) =>
            set((state) => {
                const { x0, x1 } = getInnerCavity(state.dimensions, state.doorThickness);
                const W = x1 - x0;
                const defaultW = state.doors[0]?.width ?? state.doorThickness ?? 0.02;
                const colW = explicitWidth ?? defaultW;
                const maxCount = Math.max(0, Math.floor((W - MIN_SPACING.doors) / (colW + MIN_SPACING.doors)) - 1);
                const count = Math.max(0, Math.min(desiredCount, maxCount));
                if (count === 0) return { doors: [] };
                const gap = Math.max(
                    MIN_SPACING.doors,
                    (W - count * colW) / (count + 1),
                );
                const next: ModuleDoor[] = Array.from({ length: count }).map((_, i) => {
                    const x = x0 + gap * (i + 1) + colW * i; // absolute left edge
                    return { id: crypto.randomUUID(), x, width: colW };
                });
                return { doors: next };
            }),

        setShelvesEven: (desiredCount) =>
            set((state) => {
                const { y0, y1 } = getInnerCavity(state.dimensions, state.frameThickness);
                const H = y1 - y0;
                const maxCount = Math.max(0, Math.floor((H - MIN_SPACING.shelves) / MIN_SPACING.shelves) - 1);
                const count = Math.max(0, Math.min(desiredCount, maxCount));
                if (count === 0) return { shelves: [] };
                const shelfHalf = (state.shelfThickness ?? 0.02) / 2;
                const start = y0 + shelfHalf + MIN_SPACING.shelves;
                const end = y1 - shelfHalf - MIN_SPACING.shelves;
                const step = (end - start) / (count + 1);
                const next: ModuleShelf[] = Array.from({ length: count }).map((_, i) => ({
                    id: crypto.randomUUID(),
                    y: start + step * (i + 1),
                }));
                return { shelves: next };
            }),

        addColumn: (atX = 0.3, width = 0.02) =>
            set((state) => ({
                columns: sortBy(
                    [
                        ...state.columns,
                        { id: crypto.randomUUID(), x: atX, width },
                    ],
                    (c) => c.x,
                ),
            })),

       addDoor: (atX = 0.3, width = 0.02) =>
              set((state) => ({
                doors: sortBy(
                    [
                        ...state.doors,
                        { id: crypto.randomUUID(), x: atX, width },
                    ],
                    (d) => d.x,
                ),
            })),
            

        removeColumn: (id) =>
            set((state) => ({ columns: state.columns.filter((c) => c.id !== id) })),

        removeDoor: (id) =>
            set((state) => ({ doors: state.doors.filter((d) => d.id !== id) })),

        moveColumn: (id, nextX) =>
            set((state) => {
                const { x0, x1 } = getInnerCavity(state.dimensions, state.frameThickness);
                const columns = sortBy(state.columns, (c) => c.x);
                const idx = columns.findIndex((c) => c.id === id);
                if (idx < 0) return {};
                const current = columns[idx]!;
                const leftNeighbor = columns[idx - 1];
                const rightNeighbor = columns[idx + 1];
                const minX = leftNeighbor
                    ? leftNeighbor.x + leftNeighbor.width + MIN_SPACING.columns
                    : x0 + MIN_SPACING.columns;
                const maxX = rightNeighbor
                    ? rightNeighbor.x - current.width - MIN_SPACING.columns
                    : x1 - current!.width - MIN_SPACING.columns;
                const clamped = clamp(nextX, minX, maxX);
                const updated = columns.map((c) => (c.id === id ? { ...c, x: clamped } : c));
                return { columns: updated };
            }),

        moveDoor: (id, nextX) =>
          set((state) => {
                const { x0, x1 } = getInnerCavity(state.dimensions, state.doorThickness);
                const doors = sortBy(state.doors, (c) => c.x);
                const idx = doors.findIndex((c) => c.id === id);
                if (idx < 0) return {};
                const current = doors[idx]!;
                const leftNeighbor = doors[idx - 1];
                const rightNeighbor = doors[idx + 1];
                const minX = leftNeighbor
                    ? leftNeighbor.x + leftNeighbor.width + MIN_SPACING.doors
                    : x0 + MIN_SPACING.doors;
                const maxX = rightNeighbor
                    ? rightNeighbor.x - current.width - MIN_SPACING.doors
                    : x1 - current!.width - MIN_SPACING.doors;
                const clamped = clamp(nextX, minX, maxX);
                const updated = doors.map((c) => (c.id === id ? { ...c, x: clamped } : c));
                return { doors: updated };
            }),


        addShelf: (atY = 0.4) =>
            set((state) => ({
                shelves: sortBy(
                    [...state.shelves, { id: crypto.randomUUID(), y: atY }],
                    (s) => s.y,
                ),
            })),

        removeShelf: (id) =>
            set((state) => ({ shelves: state.shelves.filter((s) => s.id !== id) })),

        moveShelf: (id, nextY) =>
            set((state) => {
                const { y0, y1 } = getInnerCavity(state.dimensions, state.frameThickness);
                const shelves = sortBy(state.shelves, (s) => s.y);
                const idx = shelves.findIndex((s) => s.id === id);
                if (idx < 0) return {};
                const shelfHalf = (state.shelfThickness ?? 0.02) / 2;
                const top = y1 - shelfHalf - MIN_SPACING.shelves;
                const bottom = y0 + shelfHalf + MIN_SPACING.shelves;
                const above = shelves[idx + 1];
                const below = shelves[idx - 1];
                let minY = bottom;
                let maxY = top;
                if (below) minY = below.y + (2 * shelfHalf) + MIN_SPACING.shelves;
                if (above) maxY = above.y - (2 * shelfHalf) + - MIN_SPACING.shelves;
                const clamped = clamp(nextY, minY, maxY);
                const updated = shelves.map((s) => (s.id === id ? { ...s, y: clamped } : s));
                return { shelves: updated };
            }),
        setColumnThickness: (value) =>
            set((state) => {
                const t = Math.max(0.01, Math.min(0.08, value));
                // Update all columns to new width and reclamp using inner cavity
                const { x0, x1 } = getInnerCavity(state.dimensions, state.frameThickness);
                let cols = sortBy(state.columns.map((c) => {
                    const center = c.x + c.width / 2;
                    const desiredX = center - t / 2;
                    return { ...c, width: t, x: desiredX };
                }), (c) => c.x);
                // forward pass
                let leftEdge = x0 + MIN_SPACING.columns;
                cols = cols.map((c) => {
                    const maxX = x1 - c.width - MIN_SPACING.columns;
                    const clampedX = clamp(c.x, leftEdge, maxX);
                    leftEdge = clampedX + c.width + MIN_SPACING.columns;
                    return { ...c, x: clampedX };
                });
                // backward pass
                for (let i = cols.length - 1; i >= 0; i -= 1) {
                    const rightNeighbor = cols[i + 1];
                    const maxAllowed = rightNeighbor ? rightNeighbor.x - cols[i]!.width - MIN_SPACING.columns : x1 - cols[i]!.width - MIN_SPACING.columns;
                    const minAllowed = i > 0 ? cols[i - 1]!.x + cols[i - 1]!.width + MIN_SPACING.columns : x0 + MIN_SPACING.columns;
                    cols[i] = { ...cols[i]!, x: clamp(cols[i]!.x, minAllowed, maxAllowed) };
                }
                return { columnThickness: t, columns: cols };
            }),
            
        setDoorThickness: (value) =>
                set((state) => {
                const t = Math.max(0.01, Math.min(0.08, value));
                // Update all columns to new width and reclamp using inner cavity
                const { x0, x1 } = getInnerCavity(state.dimensions, state.frameThickness);
                let drs = sortBy(state.doors.map((d) => {
                    const center = d.x + d.width / 2;
                    const desiredX = center - t / 2;
                    return { ...d, width: t, x: desiredX };
                }), (d) => d.x);

                // forward pass
                let leftEdge = x0 + MIN_SPACING.doors;
                drs = drs.map((d) => {
                    const maxX = x1 - d.width - MIN_SPACING.doors;
                    const clampedX = clamp(d.x, leftEdge, maxX);
                    leftEdge = clampedX + d.width + MIN_SPACING.doors;
                    return { ...d, x: clampedX };
                });
                // backward pass
                for (let i = drs.length - 1; i >= 0; i -= 1) {
                    const rightNeighbor = drs[i + 1];
                    const maxAllowed = rightNeighbor ? rightNeighbor.x - drs[i]!.width - MIN_SPACING.doors : x1 - drs[i]!.width - MIN_SPACING.doors;
                    const minAllowed = i > 0 ? drs[i - 1]!.x + drs[i - 1]!.width + MIN_SPACING.doors : x0 + MIN_SPACING.doors;
                    drs[i] = { ...drs[i]!, x: clamp(drs[i]!.x, minAllowed, maxAllowed) };
                }
                return { doorThickness: t, doors: drs };
            }),

        setShelfThickness: (value) =>
            set(() => ({ shelfThickness: Math.max(0.01, Math.min(0.06, value)) })),

        setFrameThickness: (value) =>
            set((state) => {
                const t = Math.max(0.005, Math.min(0.06, value));
                
                // Re-clamp columns and shelves within new cavity
                const { x0, x1, y0, y1 } = getInnerCavity(state.dimensions, t);
                
                // Columns forward/backward pass
                let cols = sortBy(state.columns, (c) => c.x);
                let leftEdge = x0 + MIN_SPACING.columns;
                cols = cols.map((c) => {
                    const maxX = x1 - c.width - MIN_SPACING.columns;
                    const clampedX = clamp(c.x, leftEdge, maxX);
                    leftEdge = clampedX + c.width + MIN_SPACING.columns;
                    return { ...c, x: clampedX };
                });
                for (let i = cols.length - 1; i >= 0; i -= 1) {
                    const rightNeighbor = cols[i + 1];
                    const maxAllowed = rightNeighbor ? rightNeighbor.x - cols[i]!.width - MIN_SPACING.columns : x1 - cols[i]!.width - MIN_SPACING.columns;
                    const minAllowed = i > 0 ? cols[i - 1]!.x + cols[i - 1]!.width + MIN_SPACING.columns : x0 + MIN_SPACING.columns;
                    cols[i] = { ...cols[i]!, x: clamp(cols[i]!.x, minAllowed, maxAllowed) };
                }

                // Shelves forward/backward pass (centered thickness)
                const shelfHalf = (state.shelfThickness ?? 0.02) / 2;
                let sh = sortBy(state.shelves, (s) => s.y);
                let bottom = y0 + shelfHalf + MIN_SPACING.shelves;
                sh = sh.map((s) => {
                    const topLimit = y1 - shelfHalf - MIN_SPACING.shelves;
                    const clampedY = clamp(s.y, bottom, topLimit);
                    bottom = clampedY + (2 * shelfHalf) + MIN_SPACING.shelves;
                    return { ...s, y: clampedY };
                });
                for (let i = sh.length - 1; i >= 0; i -= 1) {
                    const above = sh[i + 1];
                    const maxAllowed = above ? above.y - ((2 * shelfHalf) + MIN_SPACING.shelves) : y1 - shelfHalf - MIN_SPACING.shelves;
                    const minAllowed = i > 0 ? sh[i - 1]!.y + ((2 * shelfHalf) + MIN_SPACING.shelves) : y0 + shelfHalf + MIN_SPACING.shelves;
                    sh[i] = { ...sh[i]!, y: clamp(sh[i]!.y, minAllowed, maxAllowed) };
                }

                // Doors forward/backward pass
                let dors = sortBy(state.doors, (d) => d.x);
                //let leftEdge = x0 + MIN_SPACING.columns;
                dors = dors.map((d) => {
                    const maxX = x1 - d.width - MIN_SPACING.doors;
                    const clampedX = clamp(d.x, leftEdge, maxX);
                    leftEdge = clampedX + d.width + MIN_SPACING.doors;
                    return { ...d, x: clampedX };
                });
                for (let i = dors.length - 1; i >= 0; i -= 1) {
                    const rightNeighbor = dors[i + 1];
                    const maxAllowed = rightNeighbor ? rightNeighbor.x - dors[i]!.width - MIN_SPACING.doors : x1 - dors[i]!.width - MIN_SPACING.doors;
                    const minAllowed = i > 0 ? dors[i - 1]!.x + dors[i - 1]!.width + MIN_SPACING.doors : x0 + MIN_SPACING.doors;
                    dors[i] = { ...dors[i]!, x: clamp(dors[i]!.x, minAllowed, maxAllowed) };
                }
                

                return { frameThickness: t, columns: cols, shelves: sh, doors: dors };
            }),

        registerMaterial: (key, def) =>
            set((state) => ({ materials: { ...state.materials, [key]: def } })),

        setSelectedMaterial: (key) => set({ selectedMaterialKey: key }),

        setWoodParams: (next) =>
            set((state) => ({ woodParams: { ...state.woodParams, ...next } })),

        applyPreset: (genus, finish) => {
            // Dynamic import to avoid ESM require issues and circular deps
            void import('@/lib/tslmaterials/wood-noise/compat').then((compat) => {
                const mapped = compat.getPresetParams(genus as any, finish as any) as Partial<ModuleState["woodParams"]>;
                set((state) => ({
                    selectedGenus: genus,
                    selectedFinish: finish,
                    woodParams: { ...state.woodParams, ...mapped },
                }));
            }).catch(() => {
                set({ selectedGenus: genus, selectedFinish: finish });
            });
        },

        setHovered: (payload) => set({ hoveredId: payload }),
        setSelected: (payload) => set({ selectedId: payload }),
    }));
}



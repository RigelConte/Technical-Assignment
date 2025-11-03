import type { StoreApi } from "zustand";
import { createModuleStore, type ModuleStore } from "@/scenes/createNewConfiguratorModule";
import { generateWoodPreview } from "@/lib/tslmaterials/wood-noise";

export type DoorType = "hinge" | "sliding" | "open";

export interface WardrobeDoor {
    id: string;
    type: DoorType;
    materialId: string | null;
}

export interface WardrobeState {
    doors: WardrobeDoor[];
}

export interface WardrobeActions {
    setDoor: (id: string, next: Partial<WardrobeDoor>) => void;
}

export type WardrobeStore = ModuleStore & WardrobeState & WardrobeActions;

export function createWardrobeStore(): StoreApi<WardrobeStore> {
    const base = createModuleStore({
        dimensions: { width: 3.2, height: 2.4, depth: 0.65 },
        columns: [
            { id: crypto.randomUUID(), x: 0.8, width: 0.02 },
            { id: crypto.randomUUID(), x: 1.6, width: 0.02 },
            { id: crypto.randomUUID(), x: 2.4, width: 0.02 },
        ],
        shelves: [
            { id: crypto.randomUUID(), y: 0.35 },
            { id: crypto.randomUUID(), y: 1.1 },
        ],
        doors: [
            { id: crypto.randomUUID(), x: 0.55, width: 0.02 },
            { id: crypto.randomUUID(), x: 1.1 , width: 0.02},
        ],

    }) as StoreApi<WardrobeStore>;

    // Register initial materials
    const woodThumb = typeof document !== 'undefined' ? generateWoodPreview(64) : undefined;
    base.getState().registerMaterial("wood-noise", {
        name: "Procedural Wood",
        mapUrl: woodThumb ?? undefined,
    });
    base.getState().setSelectedMaterial("wood-noise");

    // Augment base store with wardrobe-only state and actions
    base.setState({ doors: [] } as Partial<WardrobeStore>);
    const setDoor: WardrobeActions["setDoor"] = (id, next) => {
        const current = (base.getState().doors ?? []) as WardrobeDoor[];
        base.setState({
            doors: current.map((d) => (d.id === id ? { ...d, ...next } : d)),
        } as Partial<WardrobeStore>);
    };
    base.setState({ setDoor } as Partial<WardrobeStore>);

    return base;
}



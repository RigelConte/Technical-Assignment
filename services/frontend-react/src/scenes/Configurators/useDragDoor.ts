import { useMemo } from "react";
import { useDrag } from "@use-gesture/react";
import type { StoreApi } from "zustand";
import type { ModuleStore } from "@/scenes/createNewConfiguratorModule";
import { useAppStore } from "@/state/App.store";

export function useDragDoor(store: StoreApi<ModuleStore>, doorId: string) {
    const getState = store.getState;
    const setIsInteracting = useAppStore((s) => s.setIsInteracting);

    const bind = useDrag(({ delta: [dx], first, last, event }) => {
        // Stop events so camera-controls doesn't capture them
        (event as unknown as { stopPropagation?: () => void })?.stopPropagation?.();
        if (first) {
            setIsInteracting(true);
            // Immediately select the column being dragged
            store.getState().setSelected({ type: "door", id: doorId });
            store.getState().setHovered({ type: "door", id: doorId });
            document.body.style.cursor = "ew-resize";
        }
        const { doors } = getState();
        const current = doors.find((d) => d.id === doorId);
        if (!current) return;
        const nextX = current.x + dx * 0.003; // increase sensitivity a bit

        store.getState().moveDoor(doorId, nextX);
        if (last) {
            setIsInteracting(false);
            document.body.style.cursor = "auto";
        }
    });

    return useMemo(() => bind, [bind]);
}



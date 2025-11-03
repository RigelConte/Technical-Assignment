import { MIN_SPACING } from "@/state/Config";

export function clampShelf(y: number, belowY: number | null, aboveY: number | null, height: number, frameThickness = 0) {
    const bottom = frameThickness + MIN_SPACING.shelves;
    const top = height - frameThickness - MIN_SPACING.shelves;
    let minY = bottom;
    let maxY = top;
    if (belowY != null) minY = belowY + MIN_SPACING.shelves;
    if (aboveY != null) maxY = aboveY - MIN_SPACING.shelves;
    return Math.max(minY, Math.min(maxY, y));
}

export function clampColumn(x: number, leftX: number | null, leftW: number | null, rightX: number | null, selfW: number, totalWidth: number, frameThickness = 0) {
    const leftLimit = leftX != null && leftW != null ? leftX + leftW + MIN_SPACING.columns : frameThickness + MIN_SPACING.columns;
    const rightLimit = rightX != null ? rightX - selfW - MIN_SPACING.columns : (totalWidth - frameThickness - selfW - MIN_SPACING.columns);
    return Math.max(leftLimit, Math.min(rightLimit, x));
}


export function clampDoor(y: number, belowY: number | null, aboveY: number | null, height: number, frameThickness = 0) {
    const bottom = frameThickness + MIN_SPACING.doors;
    const top = height - frameThickness - MIN_SPACING.doors;
    let minY = bottom;
    let maxY = top;
    if (belowY != null) minY = belowY + MIN_SPACING.doors;
    if (aboveY != null) maxY = aboveY - MIN_SPACING.doors;
    return Math.max(minY, Math.min(maxY, y));
}



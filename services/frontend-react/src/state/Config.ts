export const MIN_SPACING = {
    shelves: 0.04, // meters
    columns: 0.06, // meters
    doors: 0.10, // meters
} as const;

export const DEFAULT_DIMENSIONS = {
    width: 1.8, // meters
    height: 2.2, // meters
    depth: 0.6, // meters
} as const;

// Default camera angle only (direction), other camera logic lives in scenes/CameraManager.tsx
export const DEFAULT_CAMERA_ANGLE = {
    azimuthDeg: 30,
    polarDeg: 75,
} as const;

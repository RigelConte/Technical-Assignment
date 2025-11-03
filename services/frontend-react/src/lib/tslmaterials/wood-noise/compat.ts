import * as THREE from 'three';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { WoodNodeMaterial } from 'three/addons/materials/WoodNodeMaterial.js';
import { createWoodNodeMaterialTSL, updateWoodNodeMaterialTSL } from './material';

type WoodGenus = string;
type WoodFinish = string;

// Backward compatible params (legacy) + Extended params following WoodNodeMaterial
export type WoodParams = {
    // legacy/simple params (kept for compatibility with existing store/UI)
    ringFrequency: number;
    ringSharpness: number;
    ringThickness?: number;
    ringNoiseScale?: number;
    grainScale: number; // ignored in WoodNodeMaterial path
    grainWarp: number;  // maps to warp-like warping in TSL path only
    fbmOctaves: number; // ignored in WoodNodeMaterial path
    fbmGain: number;    // ignored in WoodNodeMaterial path
    fbmLacunarity: number; // ignored in WoodNodeMaterial path
    poreScale?: number;     // ignored in WoodNodeMaterial path
    poreStrength?: number;  // ignored in WoodNodeMaterial path
    lightColor: string; // hex
    darkColor: string;  // hex
    roughMin: number;   // ignored in WoodNodeMaterial path
    roughMax: number;   // ignored in WoodNodeMaterial path
    relativeUV?: boolean; // ignored
    objectInvSize?: [number, number, number]; // ignored

    // Extended TSL WoodNodeMaterial params (GUI parity)
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
    roughness?: number;
    envMapIntensity?: number;
};

function hexToRgb01(hex: string): [number, number, number] {
    const c = new THREE.Color(hex);
    return [c.r, c.g, c.b];
}

export function createTriplanarWoodMaterial(params?: Partial<WoodParams>): THREE.Material {
    // Use simple MeshStandardMaterial for WebGL compatibility
    // WoodNodeMaterial requires WebGPU and will render gray in WebGL
    const {
        lightColor = '#926c50',
        darkColor = '#0c0504',
        clearcoat = 0.4,
        clearcoatRoughness = 0.3,
        roughness = 0.65,
    } = params ?? {};

    const lightRgb = hexToRgb01(lightColor);
    const darkRgb = hexToRgb01(darkColor);
    const avgColor = new THREE.Color(
        (lightRgb[0] + darkRgb[0]) / 2,
        (lightRgb[1] + darkRgb[1]) / 2,
        (lightRgb[2] + darkRgb[2]) / 2
    );

    const mat = new THREE.MeshStandardMaterial({
        color: avgColor,
        roughness: roughness,
        metalness: 0.0,
    });
    (mat as any).clearcoat = clearcoat;
    (mat as any).clearcoatRoughness = clearcoatRoughness;
    (mat as any).envMapIntensity = 1.0;
    console.log('[Wood Material] Created WebGL-compatible material with color:', avgColor.getHexString());
    return mat;
}

export function updateTriplanarWoodMaterial(mat: THREE.Material, params: Partial<WoodParams>) {
    // no debug logs
    // If material is an instance of the official WoodNodeMaterial, update its properties
    const isWoodNode = Boolean((mat as any)?.isWoodNodeMaterial === true || (mat as any)?.constructor?.name?.includes('WoodNodeMaterial'));
    if (isWoodNode) {
        const wm = mat as unknown as InstanceType<typeof WoodNodeMaterial> & { needsUpdate?: boolean };
        if (params.centerSize !== undefined) (wm as any).centerSize = params.centerSize;
        if (params.largeWarpScale !== undefined) (wm as any).largeWarpScale = params.largeWarpScale;
        if (params.largeGrainStretch !== undefined) (wm as any).largeGrainStretch = params.largeGrainStretch;
        if (params.smallWarpStrength !== undefined) (wm as any).smallWarpStrength = params.smallWarpStrength;
        if (params.smallWarpScale !== undefined) (wm as any).smallWarpScale = params.smallWarpScale;
        if (params.fineWarpStrength !== undefined) (wm as any).fineWarpStrength = params.fineWarpStrength;
        if (params.fineWarpScale !== undefined) (wm as any).fineWarpScale = params.fineWarpScale;
        if (params.ringThickness !== undefined) (wm as any).ringThickness = params.ringThickness;
        if (params.ringBias !== undefined) (wm as any).ringBias = params.ringBias;
        if (params.ringSizeVariance !== undefined) (wm as any).ringSizeVariance = params.ringSizeVariance;
        if (params.ringVarianceScale !== undefined) (wm as any).ringVarianceScale = params.ringVarianceScale;
        if (params.barkThickness !== undefined) (wm as any).barkThickness = params.barkThickness;
        if (params.splotchScale !== undefined) (wm as any).splotchScale = params.splotchScale;
        if (params.splotchIntensity !== undefined) (wm as any).splotchIntensity = params.splotchIntensity;
        if (params.cellScale !== undefined) (wm as any).cellScale = params.cellScale;
        if (params.cellSize !== undefined) (wm as any).cellSize = params.cellSize;
        if (params.lightColor) (wm as any).lightGrainColor = new THREE.Color(params.lightColor);
        if (params.darkColor) (wm as any).darkGrainColor = new THREE.Color(params.darkColor);
        if (params.clearcoat !== undefined) (wm as any).clearcoat = params.clearcoat;
        if (params.clearcoatRoughness !== undefined) (wm as any).clearcoatRoughness = params.clearcoatRoughness;
        if (params.roughness !== undefined) (wm as any).roughness = params.roughness as number;
        if (params.envMapIntensity !== undefined) (wm as any).envMapIntensity = params.envMapIntensity as number;
        (wm as any).needsUpdate = true;
        return;
    }

    // Fallback: update simple MeshStandardMaterial color
    if (mat instanceof THREE.MeshStandardMaterial) {
        if (params.lightColor || params.darkColor) {
            const lightRgb = hexToRgb01(params.lightColor || '#926c50');
            const darkRgb = hexToRgb01(params.darkColor || '#0c0504');
            const avgColor = new THREE.Color(
                (lightRgb[0] + darkRgb[0]) / 2,
                (lightRgb[1] + darkRgb[1]) / 2,
                (lightRgb[2] + darkRgb[2]) / 2
            );
            mat.color.copy(avgColor);
        }
        if (params.roughness !== undefined) mat.roughness = params.roughness;
        if (params.clearcoat !== undefined) (mat as any).clearcoat = params.clearcoat;
        if (params.clearcoatRoughness !== undefined) (mat as any).clearcoatRoughness = params.clearcoatRoughness;
        mat.needsUpdate = true;
    }
}

export function getPresetParams(genus: WoodGenus, finish: WoodFinish): Partial<WoodParams> {
    try {
        const wm = WoodNodeMaterial.fromPreset(genus as any, finish as any) as any;
        const light = new THREE.Color(wm.lightGrainColor);
        const dark = new THREE.Color(wm.darkGrainColor);
        const toHex = (c: THREE.Color) => `#${c.getHexString()}`;
        const mapped: Partial<WoodParams> = {
            centerSize: wm.centerSize,
            largeWarpScale: wm.largeWarpScale,
            largeGrainStretch: wm.largeGrainStretch,
            smallWarpStrength: wm.smallWarpStrength,
            smallWarpScale: wm.smallWarpScale,
            fineWarpStrength: wm.fineWarpStrength,
            fineWarpScale: wm.fineWarpScale,
            ringThickness: wm.ringThickness,
            ringBias: wm.ringBias,
            ringSizeVariance: wm.ringSizeVariance,
            ringVarianceScale: wm.ringVarianceScale,
            barkThickness: wm.barkThickness,
            splotchScale: wm.splotchScale,
            splotchIntensity: wm.splotchIntensity,
            cellScale: wm.cellScale,
            cellSize: wm.cellSize,
            lightColor: toHex(light),
            darkColor: toHex(dark),
            clearcoat: wm.clearcoat,
            clearcoatRoughness: wm.clearcoatRoughness,
        };
        // Amplify finish difference for clarity under simple lighting
        if (finish === 'gloss') {
            mapped.clearcoat = Math.max(0.8, Math.min(0.85, mapped.clearcoat ?? 0.82));
            mapped.clearcoatRoughness = Math.max(0.1, mapped.clearcoatRoughness ?? 0.1);
            mapped.roughness = 0.45;
            mapped.envMapIntensity = 0.85;
        } else if (finish === 'semigloss') {
            mapped.clearcoat = Math.max(0.6, mapped.clearcoat ?? 0.6);
            mapped.clearcoatRoughness = Math.min(0.2, mapped.clearcoatRoughness ?? 0.2);
            mapped.roughness = 0.35;
            mapped.envMapIntensity = 1.3;
        } else if (finish === 'matte') {
            mapped.clearcoat = Math.min(mapped.clearcoat ?? 0.2, 0.2);
            mapped.clearcoatRoughness = Math.max(0.4, mapped.clearcoatRoughness ?? 0.4);
            mapped.roughness = 0.6;
            mapped.envMapIntensity = 1.0;
        } else if (finish === 'raw') {
            mapped.clearcoat = 0.0;
            mapped.clearcoatRoughness = Math.max(0.75, mapped.clearcoatRoughness ?? 0.75);
            mapped.roughness = 0.95;
            mapped.envMapIntensity = 0.1;
        }
        return mapped;
    } catch {
        // Fallback: return empty and let caller keep current values
        return {};
    }
}



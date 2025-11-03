//import { memo } from "react";
//import { useAppStore } from "@/state/App.store";
//import type { StoreApi } from "zustand";
//import type { ModuleStore } from "@/scenes/createNewConfiguratorModule";

import { memo, useEffect, useMemo, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { StoreApi } from "zustand";
import { useStore } from "zustand";
import type { ModuleStore } from "@/scenes/createNewConfiguratorModule";
import * as THREE from "three";
import {
  createTriplanarWoodMaterial,
  updateTriplanarWoodMaterial,
} from "@/lib/tslmaterials/wood-noise";
import { useAppStore } from "@/state/App.store";
import { MathUtils } from "three";

type Props = {
    height: number;
    depth: number;
    x: number;
    width: number;
    id?: string;
    store?: StoreApi<ModuleStore>;
    baseY?: number;
    gesture?: Record<string, unknown>;
};
      
/*function DoorsImpl({ width, height, depth }: Props) {
  return (
    <group>
      <mesh
        castShadow
        receiveShadow
        position={[0, height / 2, depth / 2 + 0.01]}
      >
        <boxGeometry args={[width, height, 0.2]} />
        <meshStandardMaterial
          color="#38b342ff"
          metalness={0.05}
          roughness={0.7}
        />
      </mesh>
    </group>
  );
}*/

function DoorsImpl({
  height,
  depth,
  x,
  width,
  id,
  store,
  baseY = 0,
  gesture,      
}: Props) {
  const isInteractive = Boolean(id && store);

  const hovered = store  ? useStore(store, (s) => s.hoveredId) : { type: null, id: null };
  const selected = store ? useStore(store, (s) => s.selectedId): { type: null, id: null };

  const isInteracting = useAppStore((s) => s.isInteracting);
  const selectedMaterialKey = store ? useStore(store, (s) => s.selectedMaterialKey) : null;
  
  const material = useMemo(() => createTriplanarWoodMaterial(), []);

  const seededOffset = (key: string) => {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < key.length; i += 1) {
      h ^= key.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const rand = (salt: number) => {
      let x = (h ^ salt) >>> 0;
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      return (x >>> 0) / 4294967295;
    };
    const amp = 0.25;
    const ox = (rand(0x9e3779b9) - 0.5) * 2 * amp;
    const oy = (rand(0x85ebca6b) - 0.5) * 2 * amp;
    const oz = (rand(0xc2b2ae35) - 0.5) * 2 * amp;
    const angY = (rand(0x27d4eb2f) - 0.5) * 2 * 0.12;
    const scaleJitter = 1 + (rand(0x165667b1) - 0.5) * 0.06;
    return [ox, oy, oz, angY, scaleJitter] as const;
  };

  const woodParams = store ? useStore(store, (s) => s.woodParams) : (null as any);

  const initialScaleRef = useRef<number | null>(null);

  useEffect(() => {
    const isWood =
      (material as any)?.isWoodNodeMaterial === true ||
      (material as any)?.constructor?.name?.includes("WoodNodeMaterial");
    if (!isWood) {
      updateTriplanarWoodMaterial(material, {
        relativeUV: true,
        objectInvSize: [1 / width, 1 / height, 1 / depth],
      });
    }
    if (isWood && woodParams) {
      // Apply preset parameters first in case internal setters mutate transform
      updateTriplanarWoodMaterial(material, woodParams);
      let s = initialScaleRef.current;
      if (s == null) {
        const grain = Math.max(0.01, woodParams.grainScale ?? 10.0);
        const base = 15.0;
        s = base / grain;
        initialScaleRef.current = s;
      }
      (material as any).transformationMatrix = new THREE.Matrix4().makeScale(
        s,
        s,
        s
      );
      const key =
        id ?? `${width.toFixed(3)}-${height.toFixed(3)}-${depth.toFixed(3)}`;
      const [ox, oy, oz, angY, scaleJitter] = seededOffset(key);
      const sj = s * scaleJitter;
      (material as any).transformationMatrix = new THREE.Matrix4()
        .makeScale(sj, sj, sj)
        .multiply(new THREE.Matrix4().makeRotationY(angY))
        .multiply(new THREE.Matrix4().makeTranslation(ox, oy, oz));
    } else if (woodParams) {
      updateTriplanarWoodMaterial(material, woodParams);
    }
    material.needsUpdate = true;
    return () => {
      if ((material as any)?.dispose) (material as any).dispose();
    };
  }, [selectedMaterialKey, woodParams, material, width, height, depth]);

  const isHovered =   isInteractive && !!id && hovered.id === id && hovered.type === "door";
  const isSelected =  isInteractive && !!id && selected.id === id && selected.type === "door";

  const color = useMemo(() => {
    if (!isInteractive) return "#bfbfbf";
    if (isSelected) return "#9ec5fe";
    if (isHovered && !isInteracting) return "#bcd6ff";
    return "#bfbfbf";
  }, [isInteractive, isHovered, isSelected, isInteracting]);

  const onPointerOver = (e: ThreeEvent<PointerEvent>) => {
    if (!isInteractive || !id || !store) return;
    e.stopPropagation();
    store.getState().setHovered({ type: "door", id });
    document.body.style.cursor = "ew-resize";
  };
  const onPointerOut = () => {
    if (!isInteractive || !store) return;
    store.getState().setHovered({ type: null, id: null });
    if (!isInteracting) document.body.style.cursor = "auto";
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (!isInteractive || !id || !store) return;
    e.stopPropagation();
    store.getState().setSelected({ type: "door", id });
  };

  const outlineColor = isSelected  ? "#4f46e5": isHovered && !isInteracting ? "#06b6d4" : null;

  const outlineGeometry = useMemo(() => {
    if (!outlineColor) return null;
    const box = new THREE.BoxGeometry(width, height, depth);
    const edges = new THREE.EdgesGeometry(box, 15);
    box.dispose();
    return edges;
  }, [width, height, depth, outlineColor]);

  const angleInDegrees = 90;
  const angleInRadians = MathUtils.degToRad(angleInDegrees);

  console.log(" x " + x)
  return (    
    <group position={[x + width / 2, baseY + height / 2, depth]}>
      <mesh
        castShadow
        receiveShadow
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        onClick={onClick}       
        //rotation={[0, angleInRadians, 0]}        
        {...(gesture ?? {})}
      >
        <boxGeometry args={[width, height, depth]} />
        {/* Base tint overlay via vertex colors is skipped; instead, modulate env via emissive */}
        <primitive object={material} attach="material" />
        {outlineColor && outlineGeometry && (
          <lineSegments renderOrder={9999} raycast={() => null}>
            <primitive object={outlineGeometry} />
            <lineBasicMaterial
              color={outlineColor}
              depthTest={false}
              transparent={false}              
            />
          </lineSegments>
        )}
      </mesh>
    </group>
  );
}

export const Doors = memo(DoorsImpl);

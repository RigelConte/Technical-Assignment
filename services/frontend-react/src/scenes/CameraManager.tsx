import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import CameraControlsImpl from "camera-controls";
import * as THREE from "three";
import type { StoreApi } from "zustand";
import type { ModuleStore } from "@/scenes/createNewConfiguratorModule";
import { useAppStore } from "@/state/App.store";
import { DEFAULT_CAMERA_ANGLE } from "@/state/Config";
const CAMERA_MARGIN = 1.08;
const CAMERA_PADDING = 0.02; // small extra padding to avoid clipping
const TIGHTEN_FACTOR = 0.72; // nudge ~25% closer relative to previous fit
const SHIFT_X = 0.2; // shift composition 20% to the left (target right)
const SHIFT_Y = -0.02; // shift composition 5% up (target down)

export type ModuleLikeDimensions = {
  width: number;
  height: number;
  depth: number;
};

export function frameModuleForCamera(
  dims: ModuleLikeDimensions,
  aspect: number,
  fovDeg: number
) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const polar = toRad(DEFAULT_CAMERA_ANGLE.polarDeg);
  const azimuth = toRad(DEFAULT_CAMERA_ANGLE.azimuthDeg);
  const fov = toRad(fovDeg);

  const halfHeight = dims.height * 0.5;
  const halfWidth = dims.width * 0.5;
  const projectedHalfHeight = halfHeight + dims.depth * 0.25;
  const projectedHalfWidth = halfWidth + dims.depth * 0.25;

  const verticalDistance = projectedHalfHeight / Math.tan(fov / 2);
  const hFov = 2 * Math.atan(Math.tan(fov / 2) * aspect);
  const horizontalDistance = projectedHalfWidth / Math.tan(hFov / 2);

  const distance =
    Math.max(verticalDistance, horizontalDistance) * CAMERA_MARGIN;
  const target = [0, dims.height * 0.5, 0] as const;

  const sinPhi = Math.sin(polar);
  const cosPhi = Math.cos(polar);
  const sinTheta = Math.sin(azimuth);
  const cosTheta = Math.cos(azimuth);
  const px = target[0] + distance * sinPhi * sinTheta;
  const py = target[1] + distance * cosPhi;
  const pz = target[2] + distance * sinPhi * cosTheta;
  const position = [px, py, pz] as const;
  return { target, position, azimuth, polar, distance };
}

type Props = {
  moduleStore?: StoreApi<ModuleStore> | undefined;
};

export default function CameraManager({ moduleStore }: Props) {
  const isInteracting = useAppStore((s) => s.isInteracting);
  const controlsRef = useRef<CameraControls | null>(null);
  const { camera, size, scene, gl } = useThree();
  const aspect = size.width / size.height;
  const fov = (camera as any).fov ?? 50;

  // Frame from scene world-space bounds; fallback to module dimensions
  const frame = (smooth: boolean) => {
    if (!controlsRef.current) return;
    const box = new THREE.Box3();
    const tmp = new THREE.Box3();
    const center = new THREE.Vector3();
    const sizeV = new THREE.Vector3();
    scene.updateMatrixWorld(true);
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.visible) return;
      if (mesh.userData?.__isGround || mesh.userData?.__ignoreInBounds) return;
      const geom: THREE.BufferGeometry | undefined = (mesh as any).geometry;
      if (!geom) return;
      if (!geom.boundingBox) geom.computeBoundingBox();
      if (!geom.boundingBox) return;
      tmp.copy(geom.boundingBox).applyMatrix4(mesh.matrixWorld);
      box.union(tmp);
    });

    if (!box.isEmpty()) {
      box.getCenter(center);
      box.getSize(sizeV);
      // Fit using bounding sphere for robustness across rotations
      const radius = sizeV.length() * 0.5 * (1 + CAMERA_PADDING);
      const vFov = THREE.MathUtils.degToRad(fov);
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
      const distV = radius / Math.sin(vFov / 2);
      const distH = radius / Math.sin(hFov / 2);
      const distance = Math.max(distV, distH) * CAMERA_MARGIN * TIGHTEN_FACTOR;
      const polar = THREE.MathUtils.degToRad(DEFAULT_CAMERA_ANGLE.polarDeg);
      const azimuth = THREE.MathUtils.degToRad(DEFAULT_CAMERA_ANGLE.azimuthDeg);
      const sinPhi = Math.sin(polar);
      const cosPhi = Math.cos(polar);
      const sinTheta = Math.sin(azimuth);
      const cosTheta = Math.cos(azimuth);
      const px = center.x + distance * sinPhi * sinTheta;
      const py = center.y + distance * cosPhi;
      const pz = center.z + distance * sinPhi * cosTheta;
      controlsRef.current.setLookAt(
        px,
        py,
        pz,
        center.x + sizeV.x * SHIFT_X,
        center.y + sizeV.y * SHIFT_Y,
        center.z,
        smooth
      );
      controlsRef.current.saveState();
      // Ensure renderer updates before we potentially snapshot next frame
      gl?.render(scene, camera as any);
    } else {
      const dims = moduleStore?.getState().dimensions ?? {
        width: 1.8,
        height: 2.2,
        depth: 0.6,
      };
      const { position, target } = frameModuleForCamera(dims, aspect, fov);
      controlsRef.current.setLookAt(
        position[0],
        position[1],
        position[2],
        target[0],
        target[1],
        target[2],
        smooth
      );
      controlsRef.current.saveState();
      gl?.render(scene, camera as any);
    }
  };

  // Initial frame and refit on viewport resize aspect/fov changes
  useEffect(() => {
    frame(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspect, fov]);

  // Subscribe to module dimension changes to reframe
  useEffect(() => {
    if (!moduleStore) return;
    frame(true);
    let last = moduleStore.getState().dimensions;
    const unsub = moduleStore.subscribe(() => {
      const next = moduleStore.getState().dimensions;
      if (
        next.width !== last.width ||
        next.height !== last.height ||
        next.depth !== last.depth
      ) {
        last = next;
        frame(true);
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleStore, aspect, fov]);

  // Also reframe when columns/doors/shelves or thicknesses change (e.g., after loading a snapshot)
  useEffect(() => {
    if (!moduleStore) return;
    const selectSignature = () => {
      const s = moduleStore.getState();
      // capture geometry-affecting state
      const cols = s.columns
        .map((c) => `${c.id}:${c.x.toFixed(5)}:${c.width.toFixed(5)}`)
        .join("|");
      const shelves = s.shelves
        .map((sh) => `${sh.id}:${sh.y.toFixed(5)}`)
        .join("|");
      const doors = s.doors
        .map((d) => `${d.id}:${d.x.toFixed(5)}`)
        .join("|");

      return `${cols}#${shelves}#${doors}#${(s.frameThickness ?? 0).toFixed(5)}#${(
        s.columnThickness ?? 0
      ).toFixed(5)}#${(s.shelfThickness ?? 0).toFixed(5)}`;
    };
    let lastSig = selectSignature();
    const unsub = moduleStore.subscribe(() => {
      const nextSig = selectSignature();
      if (nextSig !== lastSig) {
        lastSig = nextSig;
        frame(true);
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleStore, aspect, fov]);

  // When app-level interactions stop, reframe again to settle view
  useEffect(() => {
    if (!isInteracting) frame(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInteracting]);

  // Allow external triggers (e.g., after loading a snapshot) to force a reframe
  useEffect(() => {
    const onReframe = () => frame(true);
    window.addEventListener("reframeCamera", onReframe);
    return () => window.removeEventListener("reframeCamera", onReframe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <CameraControls
      ref={controlsRef as any}
      makeDefault
      enabled={!isInteracting}
      mouseButtons={{
        left: (CameraControlsImpl as any).ACTION.ROTATE,
        middle: (CameraControlsImpl as any).ACTION.NONE,
        right: (CameraControlsImpl as any).ACTION.NONE,
        wheel: (CameraControlsImpl as any).ACTION.NONE,
      }}
      touches={{
        one: (CameraControlsImpl as any).ACTION.TOUCH_ROTATE,
        two: (CameraControlsImpl as any).ACTION.NONE,
        three: (CameraControlsImpl as any).ACTION.NONE,
      }}
      onEnd={() => {
        // Restore to saved default state after user stops orbiting
        controlsRef.current?.reset(true);
      }}
    />
  );
}

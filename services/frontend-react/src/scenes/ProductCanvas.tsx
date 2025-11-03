import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
// WebGPU capability + renderer (fallback to WebGL if unavailable)
// three r1xx+: addons path is stable; if WebGPU isn't available, Canvas will receive a WebGLRenderer
// Types may require casting since @react-three/fiber expects WebGLRenderer-like interface
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import WebGPU from "three/addons/capabilities/WebGPU.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { WebGPURenderer } from "three/webgpu";
import { WebGLRenderer } from "three";
import { SoftShadows, Environment, Stats } from "@react-three/drei";
import type { StoreApi } from "zustand";
import type { ModuleStore } from "@/scenes/createNewConfiguratorModule";
import CameraManager from "@/scenes/CameraManager";
import { canvasElementRef } from "@/scenes/canvasRef";

type Props = PropsWithChildren & {
  onPointerMissed?: (event: MouseEvent) => void;
  moduleStore?: StoreApi<ModuleStore> | undefined;
};

export default function ProductCanvas({
  children,
  onPointerMissed,
  moduleStore,
}: Props) {
  const handlePointerMissed = (e: MouseEvent) => {
    if (onPointerMissed) onPointerMissed(e);
  };
  const envEnabled = useMemo(() => {
    const fromEnv = (import.meta as any)?.env?.VITE_ENABLE_WEBGPU === "true";
    const fromQuery =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("webgpu") === "1";
    const fromStorage =
      typeof window !== "undefined" &&
      window.localStorage?.getItem("enableWebGPU") === "1";
    return Boolean(fromEnv || fromQuery || fromStorage);
  }, []);
  const avail = useMemo(() => WebGPU?.isAvailable?.() === true, []);
  const secure = useMemo(
    () =>
      typeof window !== "undefined" && (window as any).isSecureContext === true,
    []
  );
  const hasGPU = useMemo(
    () => typeof navigator !== "undefined" && "gpu" in navigator,
    []
  );
  // Always use WebGL for compatibility
  const isWebGPU = false;
  const [backendLabel, setBackendLabel] = useState<"WebGPU" | "WebGL">("WebGL");
  function StatsBottomLeft() {
    useEffect(() => {
      const el = document.querySelector(".r3f-stats-bl") as HTMLElement | null;
      if (el) {
        el.style.position = "fixed";
        el.style.top = "auto";
        el.style.left = "0.5rem";
        el.style.bottom = "0.5rem";
        el.style.right = "auto";
        el.style.zIndex = "10";
      }
    }, []);
    return <Stats className="r3f-stats-bl" showPanel={0} />;
  }
  // camera logic moved into CameraManager
  return (
    <div style={{ width: "100%", height: "100vh", position: "fixed", top: 0, left: 0, zIndex: 0 }}>
      <StatsBottomLeft />
      <Canvas
        style={{ width: "100%", height: "100%" }}
        camera={{ fov: 45, near: 0.1, far: 100 }}
        shadows
        dpr={[1, 2]}
        gl={(defaultProps) => {
          const canvas = (
            defaultProps as unknown as { canvas?: HTMLCanvasElement }
          ).canvas;
          canvasElementRef.current = canvas ?? null;

          // Always use WebGL for now to avoid WebGPU compatibility issues
          const renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            preserveDrawingBuffer: true,
          });
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
          renderer.shadowMap.enabled = true;
          (renderer as any).physicallyCorrectLights = true;
          (renderer as any).__backend = "WebGL";
          return renderer;
        }}
        onCreated={({ gl }) => {
          // Configure tone mapping after renderer is attached
          setBackendLabel("WebGL");
          (gl as THREE.WebGLRenderer).toneMapping = THREE.ACESFilmicToneMapping;
          (gl as THREE.WebGLRenderer).toneMappingExposure = 1.0;

          // Ensure canvasRef dimensions are up-to-date for snapshot
          const canvas = (gl as any).domElement as HTMLCanvasElement | undefined;
          if (canvas) {
            canvasElementRef.current = canvas;
          }
        }}
        onPointerMissed={handlePointerMissed}
      >
        <color attach="background" args={["#f6f7fb"]} />
        {/*<Environment
          preset="studio"
          background={false}
          blur={0.5}
          environmentIntensity={0.06}
        />*/}
        <ambientLight intensity={0.15} />
        <directionalLight
          castShadow
          position={[5, 8, 5]}
          intensity={1.2}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-bias={-0.00015}
          shadow-normalBias={0.005}
          shadow-camera-near={0.5}
          shadow-camera-far={50}
          shadow-camera-left={-6}
          shadow-camera-right={6}
          shadow-camera-top={6}
          shadow-camera-bottom={-6}
        />
        <hemisphereLight intensity={0.2} groundColor={0xffffff} />

        {!isWebGPU && <SoftShadows size={25} samples={20} focus={0.9} />}

        {/* Ground */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
          userData={{ __isGround: true }}
        >
          <planeGeometry args={[20, 20]} />
          <shadowMaterial transparent opacity={0.25} />
        </mesh>
        <CameraManager moduleStore={moduleStore} />
        {children}
      </Canvas>
      <div
        style={{
          position: "absolute",
          right: "0.5rem",
          bottom: "0.5rem",
          fontSize: "0.7rem",
          color: "#111",
          opacity: 0.4,
          userSelect: "none",
          pointerEvents: "none",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, sans-serif",
        }}
      >
        {backendLabel}
        {backendLabel === "WebGL" && (
          <span style={{ marginLeft: "0.25rem" }}>
            ({`env:${envEnabled ? "on" : "off"}`} ·{" "}
            {`avail:${avail ? "yes" : "no"}`} ·{" "}
            {`secure:${secure ? "yes" : "no"}`} ·{" "}
            {`gpu:${hasGPU ? "yes" : "no"}`})
          </span>
        )}
      </div>
    </div>
  );
}

import ProductCanvas from "@/scenes/ProductCanvas";
import WardrobeConfigurator from "@/scenes/Configurators/Wardrobe";
import { PanelConfigurator } from "@/layout/PanelConfigurator";
import { useRef, Suspense } from "react";
import type { StoreApi } from "zustand";
import type { WardrobeStore } from "@/scenes/Configurators/Wardrobe/Wardrobe.store";
import { createWardrobeStore } from "@/scenes/Configurators/Wardrobe/Wardrobe.store";

export default function App() {
  const storeRef = useRef<StoreApi<WardrobeStore> | null>(null);
  if (!storeRef.current) storeRef.current = createWardrobeStore();
  const store = storeRef.current;

  const clearSelection = () => {
    const { setHovered, setSelected } = store.getState();
    setHovered({ type: null, id: null });
    setSelected({ type: null, id: null });
  };

  return (
    <div style={{ width: "100vw", height: "100vh", margin: 0, padding: 0, overflow: "hidden" }}>
      <Suspense fallback={<div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "1.5rem", color: "#666" }}>Loading 3D Scene...</div>}>
        <ProductCanvas moduleStore={store} onPointerMissed={clearSelection}>
          <WardrobeConfigurator store={store} />
        </ProductCanvas>
      </Suspense>
      <PanelConfigurator store={store} />
    </div>
  );
}

import { memo, useEffect, useMemo, useState } from "react";
import type { StoreApi } from "zustand";
import { useStore } from "zustand";
import type { ModuleStore } from "@/scenes/createNewConfiguratorModule";
import { FrontViewSVG } from "@/scenes/Configurators/FrontViewSVG";
import { canvasElementRef } from "@/scenes/canvasRef";
import { DraggableInput } from "@/lib/DraggableInput";
import { serializeModuleStore, applySerializedState } from "@/scenes/serialize";
import {
  listStates,
  getState,
  createState,
  updateState,
  deleteState,
  type SnapshotCategory,
} from "@/api/states";
import { NLPCommandPanel } from "./NLPCommandPanel";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {
  WoodGenuses,
  Finishes,
} from "three/addons/materials/WoodNodeMaterial.js";

type Props = {
  store: StoreApi<ModuleStore>;
};

function PanelConfiguratorImpl({ store }: Props) {
  const dimensions = useStore(store, (s) => s.dimensions);
  const columns = useStore(store, (s) => s.columns);
  const shelves = useStore(store, (s) => s.shelves);
  const doors = useStore(store, (s) => s.doors);
  const columnThickness = useStore(store, (s) => s.columnThickness);
  const shelfThickness = useStore(store, (s) => s.shelfThickness);
  const doorThickness = useStore(store, (s) => s.doorThickness);
  const frameThickness = useStore(store, (s) => s.frameThickness);
  const woodParams = useStore(store, (s) => s.woodParams);
  const selectedGenus = useStore(store, (s) => s.selectedGenus);
  const selectedFinish = useStore(store, (s) => s.selectedFinish);
  const applyPreset = useStore(store, (s) => s.applyPreset);
  const previewAspect = Math.max(
    0.1,
    Math.min(10, dimensions.width / dimensions.height || 1)
  );

  // Ensure initial appearance matches a selectable preset
  useEffect(() => {
    if (selectedGenus && selectedFinish) {
      applyPreset(selectedGenus as any, selectedFinish as any);
    }
    // run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<
    {
      id: string;
      name: string;
      category: SnapshotCategory;
      thumbnail_data_url?: string | null;
      created_at: string;
      updated_at: string;
    }[]
  >([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<SnapshotCategory>("wardrobe");
  const [filterCategory, setFilterCategory] = useState<SnapshotCategory | "all">("all");
  const [activeSavedId, setActiveSavedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);

  const triggerReframeSoon = () => {
    try {
      if (typeof requestAnimationFrame === "function") {
        // Two RAFs to ensure R3F commits scene graph before fitting
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            try {
              window.dispatchEvent(new Event("reframeCamera"));
            } catch {}
          });
        });
      } else {
        window.dispatchEvent(new Event("reframeCamera"));
      }
    } catch {}
  };

  const loadStates = () => {
    setSavedLoading(true);
    const params: any = { limit: 48 };
    if (filterCategory !== "all") {
      params.category = filterCategory;
    }
    listStates(params)
      .then((res) => setSaved(res.items))
      .catch(() => setSaved([]))
      .finally(() => setSavedLoading(false));
  };

  useEffect(() => {
    loadStates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategory]);

  function toThumbDataUrl(): string {
    const canvas = canvasElementRef.current;
    if (canvas) {
      try {
        // Try direct read at native size first
        if (canvas.width > 0 && canvas.height > 0) {
          try {
            const direct = canvas.toDataURL("image/png");
            if (direct && direct.length > 32) return direct;
          } catch {
            // fall through to scaled copy
          }
        }
        // Scaled copy
        const targetW = 384;
        const ratio = (canvas.height || 1) / (canvas.width || 1);
        const targetH = Math.max(192, Math.round(targetW * ratio));
        const off = document.createElement("canvas");
        off.width = targetW;
        off.height = targetH;
        const ctx = off.getContext("2d");
        if (ctx) {
          ctx.drawImage(canvas, 0, 0, targetW, targetH);
          const scaled = off.toDataURL("image/png");
          if (scaled && scaled.length > 32) return scaled;
        }
      } catch {
        // ignore and fall back
      }
    }
    const s = store.getState();
    const width = s.dimensions.width;
    const height = s.dimensions.height;
    const frame = s.frameThickness;
    const shelfT = s.shelfThickness;
    const W = 160;
    const H = Math.max(80, Math.round((W * height) / width));
    const viewBox = `0 0 ${width} ${height}`;
    const rects: string[] = [];
    rects.push(
      `<rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="#9ca3af" stroke-width="${Math.max(
        0.002,
        frame * 0.25
      )}" />`
    );
    for (const c of s.columns) {
      rects.push(
        `<rect x="${c.x}" y="${frame}" width="${c.width}" height="${Math.max(
          0,
          height - 2 * frame
        )}" fill="#d1d5db" />`
      );
    }
    for (const d of s.doors) {
      rects.push(
        `<rect x="${d.x}" y="${frame}" width="${d.width}" height="${Math.max(
          0,
          height - 2 * frame
        )}" fill="#d1d5db" />`
      );
    }
    for (const sh of s.shelves) {
      const y = Math.max(
        frame,
        Math.min(height - frame - shelfT, height - sh.y - shelfT / 2)
      );
      rects.push(
        `<rect x="${frame}" y="${y}" width="${Math.max(
          0,
          width - 2 * frame
        )}" height="${shelfT}" fill="#e5e7eb" />`
      );
    }
    for (const d of s.doors) {
      rects.push(
        `<rect  y="${frame}" width="${d.width}" height="${Math.max(
          0,
          height - 2 * frame
        )}" fill="#d1d5db" />`
      );
    }

    const svg = `<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"${W}\" height=\"${H}\" viewBox=\"${viewBox}\" shape-rendering=\"crispEdges\">${rects.join(
      ""
    )}</svg>`;
    let encoded = "";
    try {
      encoded = btoa(unescape(encodeURIComponent(svg)));
    } catch {
      encoded = "";
    }
    return `data:image/svg+xml;base64,${encoded}`;
  }

  async function handleSaveNew() {
    const name = newName.trim() || `Snapshot ${new Date().toLocaleString()}`;
    setNewName("");
    const snapshot = serializeModuleStore(store);
    const thumbnail = toThumbDataUrl();
    const created = await createState({
      name,
      thumbnail_data_url: thumbnail,
      state: snapshot,
      category: selectedCategory,
    });
    setSaved((prev) => [created, ...prev]);
    setDirty(false);
  }

  async function handleLoad(id: string) {
    const full = await getState(id);
    applySerializedState(full.state, store);
    setActiveSavedId(id);
    setDirty(false);
    // Reframe after geometry has been rebuilt and committed
    triggerReframeSoon();
  }

  async function handleUpdate() {
    if (!activeSavedId) return;
    const snapshot = serializeModuleStore(store);
    const thumbnail = toThumbDataUrl();
    await updateState(activeSavedId, {
      state: snapshot,
      thumbnail_data_url: thumbnail,
    });
    // refresh list timestamps/thumbnail
    loadStates();
    setDirty(false);
  }

  async function handleDelete(id: string) {
    await deleteState(id);
    setSaved((prev) => prev.filter((s) => s.id !== id));
    if (activeSavedId === id) setActiveSavedId(null);
  }
  // Track if the configuration was edited since last save/load
  useEffect(() => {
    setDirty(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dimensions,
    columns,
    shelves,
    doors,
    columnThickness,
    shelfThickness,
    frameThickness,
    doorThickness,
    woodParams,
    selectedGenus,
    selectedFinish,
  ]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [{ generateWoodPreviewWithColors }, compat] = await Promise.all([
          import("@/lib/tslmaterials/wood-noise/preview"),
          import("@/lib/tslmaterials/wood-noise/compat"),
        ]);
        if (!mounted) return;
        const next: Record<string, string> = {};
        for (const f of Finishes as string[]) {
          for (const g of WoodGenuses as string[]) {
            const mapped = compat.getPresetParams(g as any, f as any);
            const url = generateWoodPreviewWithColors(
              (mapped.lightColor as string) ?? woodParams.lightColor,
              (mapped.darkColor as string) ?? woodParams.darkColor,
              64
            );
            next[`${f}:${g}`] = url;
          }
        }
        setThumbs(next);
      } catch {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, [woodParams.lightColor, woodParams.darkColor]);
  return (
    <div
      style={{
        position: "fixed",
        top: "1rem",
        right: "1rem",
        width: "22rem",
        maxWidth: "22rem",
        background: "#ffffffcc",
        borderRadius: "0.5rem",
        boxShadow: "0 0.25rem 1rem rgba(0,0,0,0.08)",
        padding: "1rem",
        backdropFilter: "saturate(120%) blur(0.375rem)",
        boxSizing: "border-box",
        overflow: "hidden",
        zIndex: 10,
        pointerEvents: "auto",
      }}
    >
      <NLPCommandPanel
        store={store}
        activeSavedId={activeSavedId}
        onStateChanged={() => setDirty(true)}
      />

      <div style={{ marginTop: "0.75rem" }}>
        <div
          style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            marginBottom: "0.5rem",
          }}
        >
          Saved states
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "0.75rem",
          }}
        >
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "#6b7280",
                marginBottom: "0.25rem",
              }}
            >
              Save as
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as SnapshotCategory)}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                border: "0.0625rem solid #e5e7eb",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              <option value="wardrobe">Wardrobe</option>
              <option value="kitchen_cabinets">Kitchen Cabinets</option>
            </select>
          </div>

          <div style={{ flex: 1 }}>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "#6b7280",
                marginBottom: "0.25rem",
              }}
            >
              Filter by
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as SnapshotCategory | "all")}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                border: "0.0625rem solid #e5e7eb",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              <option value="all">All</option>
              <option value="wardrobe">Wardrobe</option>
              <option value="kitchen_cabinets">Kitchen Cabinets</option>
            </select>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
            marginBottom: "0.75rem",
            width: "100%",
          }}
        >
          <input
            placeholder="Name this snapshot"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
            style={{
              flex: "1 1 auto",
              minWidth: 0,
              width: "auto",
              padding: "0.5rem 0.75rem",
              border: `0.0625rem solid ${nameFocused ? "#2563eb" : "#e5e7eb"}`,
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
              background: "#fff",
              outline: "none",
              boxShadow: nameFocused
                ? "0 0 0 0.125rem rgba(37,99,235,0.12)"
                : "none",
              transition: "border-color 120ms ease, box-shadow 120ms ease",
            }}
          />
          <button
            onClick={handleSaveNew}
            style={{
              flex: "0 0 auto",
              padding: "0.4375rem 0.75rem",
              borderRadius: "0.25rem",
              border: "0.0625rem solid #e5e7eb",
              background: "#fff",
              whiteSpace: "nowrap",
            }}
          >
            Save
          </button>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.5rem",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
            {savedLoading ? "Loading…" : `${saved.length} saved`}
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0,1fr))",
            gap: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          {saved.map((s) => {
            const isActive = s.id === activeSavedId;
            return (
              <div
                key={s.id}
                style={{
                  position: "relative",
                  border: isActive
                    ? "0.125rem solid #2563eb"
                    : "0.0625rem solid #e5e7eb",
                  borderRadius: "0.25rem",
                  background: "#fff",
                }}
              >
                <button
                  onClick={() => handleLoad(s.id)}
                  title={s.name}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    background: "transparent",
                    border: 0,
                    padding: "0.25rem",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: 1.6,
                      background: "#f3f4f6",
                      borderRadius: "0.125rem",
                      backgroundImage: s.thumbnail_data_url
                        ? `url(${s.thumbnail_data_url})`
                        : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      marginTop: "0.25rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.75rem",
                        flex: 1,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {s.name}
                    </span>
                    <span
                      style={{
                        fontSize: "0.625rem",
                        padding: "0.125rem 0.375rem",
                        borderRadius: "0.25rem",
                        background: s.category === "wardrobe" ? "#dbeafe" : "#fef3c7",
                        color: s.category === "wardrobe" ? "#1e40af" : "#92400e",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s.category === "wardrobe" ? "W" : "K"}
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  aria-label="Delete"
                  title="Delete"
                  style={{
                    position: "absolute",
                    top: "0.25rem",
                    right: "0.25rem",
                    background: "#fff",
                    border: "0.0625rem solid #e5e7eb",
                    borderRadius: "0.25rem",
                    padding: "0.125rem 0.25rem",
                    fontSize: "0.75rem",
                  }}
                >
                  ✕
                </button>
                {isActive && dirty && (
                  <button
                    onClick={handleUpdate}
                    aria-label="Refresh thumbnail"
                    title="Refresh thumbnail"
                    style={{
                      position: "absolute",
                      top: "1.75rem",
                      right: "0.25rem",
                      background: "#fff",
                      border: "0.0625rem solid #e5e7eb",
                      borderRadius: "0.25rem",
                      padding: "0.125rem 0.25rem",
                      fontSize: "0.75rem",
                    }}
                  >
                    ⟳
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div
          style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            marginBottom: "0.5rem",
          }}
        >
          Wood presets
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateRows: "repeat(4, auto)",
            rowGap: "0.25rem",
            marginBottom: "0.75rem",
          }}
        >
          {(Finishes as string[]).map((f) => (
            <div
              key={f}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(10, 1.75rem)",
                columnGap: "0.25rem",
                justifyContent: "start",
              }}
            >
              {(WoodGenuses as string[]).map((g) => {
                const key = `${f}:${g}`;
                const isActive = selectedFinish === f && selectedGenus === g;
                return (
                  <button
                    key={key}
                    aria-pressed={isActive}
                    title={`${f} ${g.replace("_", " ")}`}
                    onClick={() => {
                      applyPreset(g as any, f as any);
                      triggerReframeSoon();
                    }}
                    style={{
                      display: "block",
                      width: "1.75rem",
                      padding: "0.125rem",
                      borderRadius: "0.25rem",
                      boxSizing: "border-box",
                      border: isActive
                        ? "0.125rem solid #2563eb"
                        : "0.0625rem solid #e5e7eb",
                      background: "#fff",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: "1.125rem",
                        background: "#f3f4f6",
                        borderRadius: "0.125rem",
                        backgroundImage: thumbs[key]
                          ? `url(${thumbs[key]})`
                          : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    />
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
            columnGap: "0.75rem",
            rowGap: "0.75rem",
            width: "100%",
            boxSizing: "border-box",
            justifyItems: "center",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                marginBottom: "0.25rem",
                textAlign: "center",
              }}
            >
              Light color
            </div>
            <input
              type="color"
              value={woodParams.lightColor}
              onChange={(e) =>
                store.getState().setWoodParams({ lightColor: e.target.value })
              }
              style={{
                width: "3.25rem",
                height: "1.75rem",
                border: "0.0625rem solid #d1d5db",
                borderRadius: "0.25rem",
                background: "transparent",
                display: "block",
                margin: "0 auto",
              }}
            />
          </div>
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                marginBottom: "0.25rem",
                textAlign: "center",
              }}
            >
              Dark color
            </div>
            <input
              type="color"
              value={woodParams.darkColor}
              onChange={(e) =>
                store.getState().setWoodParams({ darkColor: e.target.value })
              }
              style={{
                width: "3.25rem",
                height: "1.75rem",
                border: "0.0625rem solid #d1d5db",
                borderRadius: "0.25rem",
                background: "transparent",
                display: "block",
                margin: "0 auto",
              }}
            />
          </div>
        </div>

        <details open={false as unknown as boolean}>
          <summary
            style={{
              cursor: "pointer",
              userSelect: "none",
              fontSize: "0.8125rem",
              margin: "0.75rem 0 0.5rem 0",
            }}
          >
            Advanced wood generator
          </summary>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
              gap: "0.5rem",
              marginBottom: "0.5rem",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <DraggableInput
              label="Ring freq"
              value={woodParams.ringFrequency}
              step={0.01}
              min={0.01}
              max={5}
              onChange={(v) =>
                store.getState().setWoodParams({ ringFrequency: v })
              }
            />
            <DraggableInput
              label="Ring sharp"
              value={woodParams.ringSharpness}
              step={0.01}
              min={0}
              max={2}
              onChange={(v) =>
                store
                  .getState()
                  .setWoodParams({ ringSharpness: Math.max(0, Math.min(2, v)) })
              }
            />
            <DraggableInput
              label="Ring thickness"
              value={woodParams.ringThickness ?? 0.35}
              step={0.01}
              min={0.01}
              max={1}
              onChange={(v) =>
                store.getState().setWoodParams({
                  ringThickness: Math.max(0.01, Math.min(1, v)),
                })
              }
            />
            <DraggableInput
              label="Ring bias"
              value={woodParams.ringBias ?? 0}
              step={0.001}
              min={-0.2}
              max={0.2}
              onChange={(v) =>
                store
                  .getState()
                  .setWoodParams({ ringBias: Math.max(-0.2, Math.min(0.2, v)) })
              }
            />
            <DraggableInput
              label="Ring variance"
              value={woodParams.ringSizeVariance ?? 0}
              step={0.001}
              min={0}
              max={0.2}
              onChange={(v) =>
                store.getState().setWoodParams({
                  ringSizeVariance: Math.max(0, Math.min(0.2, v)),
                })
              }
            />
            <DraggableInput
              label="Variance scale"
              value={woodParams.ringVarianceScale ?? 4.4}
              step={0.1}
              min={0}
              max={10}
              onChange={(v) =>
                store.getState().setWoodParams({
                  ringVarianceScale: Math.max(0, Math.min(10, v)),
                })
              }
            />
            <DraggableInput
              label="Center size"
              value={woodParams.centerSize ?? 1.11}
              step={0.01}
              min={0}
              max={2}
              onChange={(v) =>
                store
                  .getState()
                  .setWoodParams({ centerSize: Math.max(0, Math.min(2, v)) })
              }
            />
            <DraggableInput
              label="Large warp"
              value={woodParams.largeWarpScale ?? 0.32}
              step={0.001}
              min={0}
              max={1}
              onChange={(v) =>
                store.getState().setWoodParams({
                  largeWarpScale: Math.max(0, Math.min(1, v)),
                })
              }
            />
            <DraggableInput
              label="Grain stretch"
              value={woodParams.largeGrainStretch ?? 0.24}
              step={0.001}
              min={0}
              max={1}
              onChange={(v) =>
                store.getState().setWoodParams({
                  largeGrainStretch: Math.max(0, Math.min(1, v)),
                })
              }
            />
            <DraggableInput
              label="Small warp"
              value={woodParams.smallWarpStrength ?? 0.059}
              step={0.001}
              min={0}
              max={0.2}
              onChange={(v) =>
                store.getState().setWoodParams({
                  smallWarpStrength: Math.max(0, Math.min(0.2, v)),
                })
              }
            />
            <DraggableInput
              label="Small warp scale"
              value={woodParams.smallWarpScale ?? 2}
              step={0.01}
              min={0}
              max={5}
              onChange={(v) =>
                store.getState().setWoodParams({
                  smallWarpScale: Math.max(0, Math.min(5, v)),
                })
              }
            />
            <DraggableInput
              label="Fine warp"
              value={woodParams.fineWarpStrength ?? 0.006}
              step={0.001}
              min={0}
              max={0.05}
              onChange={(v) =>
                store.getState().setWoodParams({
                  fineWarpStrength: Math.max(0, Math.min(0.05, v)),
                })
              }
            />
            <DraggableInput
              label="Fine warp scale"
              value={woodParams.fineWarpScale ?? 32.8}
              step={0.1}
              min={0}
              max={50}
              onChange={(v) =>
                store.getState().setWoodParams({
                  fineWarpScale: Math.max(0, Math.min(50, v)),
                })
              }
            />
            <DraggableInput
              label="Pore scale"
              value={woodParams.poreScale ?? 18}
              step={0.5}
              min={1}
              max={64}
              onChange={(v) =>
                store.getState().setWoodParams({ poreScale: Math.max(1, v) })
              }
            />
            <DraggableInput
              label="Pore strength"
              value={woodParams.poreStrength ?? 0.12}
              step={0.01}
              min={0}
              max={1}
              onChange={(v) =>
                store
                  .getState()
                  .setWoodParams({ poreStrength: Math.max(0, Math.min(1, v)) })
              }
            />
            <DraggableInput
              label="Bark thickness"
              value={woodParams.barkThickness ?? 0.3}
              step={0.01}
              min={0}
              max={1}
              onChange={(v) =>
                store
                  .getState()
                  .setWoodParams({ barkThickness: Math.max(0, Math.min(1, v)) })
              }
            />
            <DraggableInput
              label="Splotch scale"
              value={woodParams.splotchScale ?? 0.2}
              step={0.01}
              min={0}
              max={1}
              onChange={(v) =>
                store
                  .getState()
                  .setWoodParams({ splotchScale: Math.max(0, Math.min(1, v)) })
              }
            />
            <DraggableInput
              label="Splotch intensity"
              value={woodParams.splotchIntensity ?? 0.541}
              step={0.01}
              min={0}
              max={1}
              onChange={(v) =>
                store.getState().setWoodParams({
                  splotchIntensity: Math.max(0, Math.min(1, v)),
                })
              }
            />
            <DraggableInput
              label="Cell scale"
              value={woodParams.cellScale ?? 910}
              step={1}
              dragPerPixel={0.2}
              min={100}
              max={2000}
              precision={0}
              onChange={(v) =>
                store
                  .getState()
                  .setWoodParams({ cellScale: Math.max(1, Math.floor(v)) })
              }
            />
            <DraggableInput
              label="Cell size"
              value={woodParams.cellSize ?? 0.1}
              step={0.001}
              min={0.01}
              max={0.5}
              onChange={(v) =>
                store
                  .getState()
                  .setWoodParams({ cellSize: Math.max(0.01, Math.min(0.5, v)) })
              }
            />
            <DraggableInput
              label="Rough min"
              value={woodParams.roughMin}
              step={0.01}
              min={0}
              max={1}
              onChange={(v) =>
                store
                  .getState()
                  .setWoodParams({ roughMin: Math.max(0, Math.min(1, v)) })
              }
            />
            <DraggableInput
              label="Rough max"
              value={woodParams.roughMax}
              step={0.01}
              min={0}
              max={1}
              onChange={(v) =>
                store
                  .getState()
                  .setWoodParams({ roughMax: Math.max(0, Math.min(1, v)) })
              }
            />
            <DraggableInput
              label="Clearcoat"
              value={woodParams.clearcoat ?? 1}
              step={0.01}
              min={0}
              max={1}
              onChange={(v) =>
                store
                  .getState()
                  .setWoodParams({ clearcoat: Math.max(0, Math.min(1, v)) })
              }
            />
            <DraggableInput
              label="Clearcoat rough"
              value={woodParams.clearcoatRoughness ?? 0.2}
              step={0.01}
              min={0}
              max={1}
              onChange={(v) =>
                store.getState().setWoodParams({
                  clearcoatRoughness: Math.max(0, Math.min(1, v)),
                })
              }
            />
          </div>
        </details>
      </div>
      <div
        style={{
          aspectRatio: previewAspect as unknown as number,
          width: "100%",
          maxHeight: "20svh",
          margin: "0.75rem 0",
          padding: "0.5rem",
          display: "block",
          border: "0.0625rem solid #e5e7eb",
          borderRadius: "0.375rem",
          background: "#f9fafb",
          boxSizing: "border-box",
        }}
      >
        <FrontViewSVG
          width={dimensions.width}
          height={dimensions.height}
          columns={columns}
          shelves={shelves}
          doors={doors}
          frameThickness={frameThickness}
          columnThickness={columnThickness}
          doorThickness={doorThickness}
          shelfThickness={shelfThickness}
        />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
          gap: "0.5rem",
        }}
      >
        <DraggableInput
          label="Column thickness"
          value={columnThickness}
          suffix="m"
          step={0.001}
          min={0.01}
          max={0.08}
          onChange={(v) => store.getState().setColumnThickness(v)}
        />
        <DraggableInput
          label="Shelf thickness"
          value={shelfThickness}
          suffix="m"
          step={0.001}
          min={0.01}
          max={0.06}
          onChange={(v) => store.getState().setShelfThickness(v)}
        />
        <DraggableInput
          label="Frame thickness"
          value={frameThickness}
          suffix="m"
          step={0.001}
          min={0.005}
          max={0.06}
          onChange={(v) => store.getState().setFrameThickness(v)}
        />
        <DraggableInput
          label="Width"
          value={dimensions.width}
          suffix="m"
          step={0.01}
          min={0.2}
          onChange={(v) => store.getState().setDimensions({ width: v })}
        />
        <DraggableInput
          label="Height"
          value={dimensions.height}
          suffix="m"
          step={0.01}
          min={0.2}
          onChange={(v) => store.getState().setDimensions({ height: v })}
        />
        <DraggableInput
          label="Depth"
          value={dimensions.depth}
          suffix="m"
          step={0.01}
          min={0.1}
          onChange={(v) => store.getState().setDimensions({ depth: v })}
        />
        <DraggableInput
          label="Shelves"
          value={shelves.length}
          step={1}
          dragPerPixel={0.05}
          min={0}
          precision={0}
          onChange={(n) => {
            store.getState().setShelvesEven(Math.max(0, Math.floor(n)));
          }}
        />
        <DraggableInput
          label="Columns"
          value={columns.length}
          step={1}
          dragPerPixel={0.05}
          min={0}
          precision={0}
          onChange={(n) => {
            store.getState().setColumnsEven(Math.max(0, Math.floor(n)));
          }}
        />
        <DraggableInput
          label="Door thickness"
          value={doorThickness}
          suffix="m"
          step={0.001}
          min={0.01}
          max={0.06}
          onChange={(v) => store.getState().setDoorThickness(v)}
        />        
        <DraggableInput
          label="Doors"
          value={doors.length}
          step={1}
          dragPerPixel={0.05}
          min={0}
          precision={0}
          onChange={(n) => {
            store.getState().setDoorsEven(Math.max(0, Math.floor(n)));
          }}
        />
      </div>
    </div>
  );
}

export const PanelConfigurator = memo(PanelConfiguratorImpl);

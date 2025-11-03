import { memo, useMemo } from "react";

type Props = {
  width: number;
  height: number;
  columns: Array<{ x: number; width: number }>;
  shelves: Array<{ y: number }>;
  doors: Array<{ x: number }>;
  frameThickness?: number;
  columnThickness?: number; // visual only; columns already have width
  shelfThickness?: number;
  doorThickness?: number;
};

function FrontViewSVGImpl({
  width,
  height,
  columns,
  shelves,
  doors, 
  frameThickness = 0.02,
  shelfThickness = 0.02,
  doorThickness = 0.02,
}: Props) {
  // Maintain true aspect by scaling to a fixed max width while computing height from real dimensions
  const W = 300;
  const H = Math.max(1, Math.round((height / width) * W));
  const sx = (x: number) => (x / width) * W;
  const sy = (y: number) => H - (y / height) * H;
  const pxT = (t: number) => (t / height) * H;
  const pxTx = (t: number) => (t / width) * W;

  const x0 = frameThickness;
  const x1 = Math.max(frameThickness, width - frameThickness);
  const y0 = frameThickness;
  const y1 = Math.max(frameThickness, height - frameThickness);

  const shelfSegments = useMemo(() => {
    const sortedCols = [...columns].sort((a, b) => a.x - b.x);
    return shelves.map((s) => {
      const segs: Array<{ x: number; w: number; y: number }> = [];
      let cursor = x0;
      for (const c of sortedCols) {
        const segW = c.x - cursor;
        if (segW > 0.0005) segs.push({ x: cursor + segW / 2, w: segW, y: s.y });
        cursor = Math.max(cursor, c.x + c.width);
        if (cursor >= x1) break;
      }
      if (x1 - cursor > 0.0005)
        segs.push({ x: cursor + (x1 - cursor) / 2, w: x1 - cursor, y: s.y });
      return segs;
    });
  }, [columns, shelves, doors, x0, x1]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <rect x={0} y={0} width={W} height={H} fill="#fff" />
      {/* Internals: columns */}
      {columns.map((c, i) => (
        <rect
          key={`c-${i}`}
          x={sx(c.x)}
          y={sy(y1)}
          width={sx(c.width)}
          height={sy(y0) - sy(y1)}
          fill="#000"
        />
      ))}
      {/* Internals: shelves segmented between columns */}
      {shelfSegments.map((segs, i) => (
        <g key={`s-${i}`}>
          {segs.map((seg, j) => (
            <rect
              key={`s-${i}-${j}`}
              x={sx(seg.x - seg.w / 2)}
              y={sy(seg.y + shelfThickness / 2)}
              width={sx(seg.w)}
              height={pxT(shelfThickness)}
              fill="#000"
            />
          ))}
        </g>
      ))}      

      {/* Borders: left/right first */}
      <rect x={0} y={0} width={pxTx(frameThickness)} height={H} fill="#000" />
      <rect
        x={W - pxTx(frameThickness)}
        y={0}
        width={pxTx(frameThickness)}
        height={H}
        fill="#000"
      />
      {/* Borders: top/bottom over left/right */}
      <rect x={0} y={0} width={W} height={pxT(frameThickness)} fill="#000" />
      <rect
        x={0}
        y={H - pxT(frameThickness)}
        width={W}
        height={pxT(frameThickness)}
        fill="#000"
      />
    </svg>
  );
}

export const FrontViewSVG = memo(FrontViewSVGImpl);

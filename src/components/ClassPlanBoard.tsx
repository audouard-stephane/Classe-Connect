import { useMemo, useRef, type PointerEvent as RPE, type ReactNode } from "react";
import {
  type SeatingPlan,
  type SeatTable,
  type TableOrientation,
  type TableRotation,
  TABLE_H_H,
  TABLE_H_W,
  TABLE_V_H,
  TABLE_V_W,
} from "@/lib/store";
import defaultPlanAsset from "@/assets/plan_de_classe.png.asset.json";
import { ZoomIn, ZoomOut, RotateCcw, Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

const DEFAULT_PLAN_URL = defaultPlanAsset.url;

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.01;

export function ClassPlanBoard({
  plan,
  renderSeat,
  zoom: zoomProp = 1,
  onZoomChange,
  showGrid = false,
  gridStep = 5,
  editable = false,
  onTablePointerDown,
  onTableClick,
  containerRef: externalContainerRef,
}: {
  plan: Pick<SeatingPlan, "backgroundImage" | "tables">;
  renderSeat: (
    eleveId: string | undefined,
    tableId: string,
    side: "L" | "R",
    orientation: TableOrientation,
    rotation: TableRotation,
  ) => ReactNode;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  showGrid?: boolean;
  gridStep?: number;
  editable?: boolean;
  onTablePointerDown?: (ev: RPE<HTMLDivElement>, table: SeatTable) => void;
  onTableClick?: (table: SeatTable) => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const internalRef = useRef<HTMLDivElement | null>(null);
  const containerRef = externalContainerRef || internalRef;
  const zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomProp));
  const canZoomOut = zoom > ZOOM_MIN;
  const canZoomIn = zoom < ZOOM_MAX;

  const gridLines = useMemo(() => {
    if (!showGrid) return null;
    const lines: ReactNode[] = [];
    for (let i = gridStep; i < 100; i += gridStep) {
      lines.push(
        <div
          key={`v-${i}`}
          className="absolute top-0 bottom-0 border-l border-dashed border-primary/20 pointer-events-none"
          style={{ left: `${i}%` }}
        />,
      );
      lines.push(
        <div
          key={`h-${i}`}
          className="absolute left-0 right-0 border-t border-dashed border-primary/20 pointer-events-none"
          style={{ top: `${i}%` }}
        />,
      );
    }
    return lines;
  }, [showGrid, gridStep]);

  return (
    <div className="mb-3">
      <div
        ref={containerRef}
        className="relative w-full rounded-2xl border-2 border-border overflow-auto bg-muted"
        style={{ aspectRatio: "3 / 4" }}
      >

        <div
          className="relative origin-top-left"
          style={{
            width: `${zoom * 100}%`,
            height: `${zoom * 100}%`,
          }}
        >
          {(plan.backgroundImage ?? DEFAULT_PLAN_URL) && (
            <img
              src={plan.backgroundImage ?? DEFAULT_PLAN_URL}
              alt="Plan"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none"
              draggable={false}
            />
          )}
          {gridLines}
          {plan.tables.map((t) => {
            const orient: TableOrientation = t.orientation ?? "h";
            const defW = orient === "h" ? TABLE_H_W : TABLE_V_W;
            const defH = orient === "h" ? TABLE_H_H : TABLE_V_H;
            const w = t.w ?? defW;
            const h = t.h ?? defH;
            const rot = t.rotation ?? 0;

            const tableContent = (
              <>
                {renderSeat(t.leftEleveId, t.id, "L", orient, rot)}
                {renderSeat(t.rightEleveId, t.id, "R", orient, rot)}
              </>

            );

            return (
              <div
                key={t.id}
                className={`absolute rounded-lg shadow-lg border-2 border-primary/60 flex overflow-hidden bg-background ${
                  orient === "h" ? "flex-row" : "flex-col"
                }`}
                style={{
                  left: `${t.x}%`,
                  top: `${t.y}%`,
                  width: `${w}%`,
                  height: `${h}%`,
                  transform: `translate(-50%, -50%) rotate(${rot}deg)`,
                }}
              >

                {editable ? (
                  <button
                    type="button"
                    className="flex-1 flex w-full h-full"
                    onClick={() => onTableClick?.(t)}
                    style={{
                      flexDirection: orient === "h" ? "row" : "column",
                    }}
                  >
                    {onTablePointerDown && (
                      <div
                        className={`bg-primary/70 cursor-move touch-none shrink-0 ${
                          orient === "h" ? "h-full w-3" : "w-full h-3"
                        }`}
                        onPointerDown={(ev) => onTablePointerDown(ev, t)}
                        aria-label="Déplacer"
                      />
                    )}
                    <div
                      className="flex-1 flex"
                      style={{
                        flexDirection: orient === "h" ? "row" : "column",
                      }}
                    >
                      {tableContent}
                    </div>
                  </button>
                ) : (

                  tableContent
                )}
              </div>
            );
          })}
        </div>
      </div>

      {onZoomChange && (
        <div className="mt-2 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-2 rounded-xl"
            disabled={!canZoomOut}
            onClick={() => onZoomChange(Math.max(ZOOM_MIN, zoom - ZOOM_STEP))}
            aria-label="Réduire"
          >
            <ZoomOut className="size-4" />
          </Button>
          <Slider
            className="flex-1 max-w-[220px]"
            min={ZOOM_MIN * 1000}
            max={ZOOM_MAX * 1000}
            step={1}
            value={[Math.round(zoom * 1000)]}
            onValueChange={(v) => onZoomChange((v[0] ?? 1000) / 1000)}
            aria-label="Zoom"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-2 rounded-xl"
            disabled={!canZoomIn}
            onClick={() => onZoomChange(Math.min(ZOOM_MAX, zoom + ZOOM_STEP))}
            aria-label="Agrandir"
          >
            <ZoomIn className="size-4" />
          </Button>
          <span className="text-xs font-semibold tabular-nums w-14 text-center">
            {(zoom * 100).toFixed(1)}%
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-2 rounded-xl"
            onClick={() => onZoomChange(1)}
            aria-label="Réinitialiser le zoom"
          >
            <RotateCcw className="size-4" />
          </Button>
          {showGrid && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-1">
              <Grid3x3 className="size-3" /> Grille {gridStep}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}

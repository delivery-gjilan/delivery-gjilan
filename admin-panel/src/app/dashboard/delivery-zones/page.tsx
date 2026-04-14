"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import Map, { Source, Layer } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import {
  MapPin,
  Plus,
  Trash2,
  Save,
  Edit3,
  X,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Layers,
} from "lucide-react";
import {
  GET_DELIVERY_ZONES,
  CREATE_DELIVERY_ZONE,
  UPDATE_DELIVERY_ZONE,
  DELETE_DELIVERY_ZONE,
} from "@/graphql/operations/deliveryZones";
import type { GetDeliveryZonesQuery } from "@/gql/graphql";

// ═══════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const MAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL || "mapbox://styles/mapbox/streets-v12";
const DEFAULT_CENTER = { latitude: 42.4635, longitude: 21.4694 };
const GJILAN_BOUNDS: [[number, number], [number, number]] = [
  [21.35, 42.38],
  [21.58, 42.55],
];

const ZONE_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

// ═══════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════
type PolygonPoint = { lat: number; lng: number };

type PolygonFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: {
    type: "Polygon";
    coordinates: Array<Array<[number, number]>>;
  };
};

type DrawChangeEvent = {
  features?: unknown[];
};

type ZoneGeoJsonFeature = {
  type: "Feature";
  properties: {
    id: string;
    name: string;
    deliveryFee: number;
    isActive: boolean;
    color: string;
  };
  geometry: PolygonFeature["geometry"];
};

type ZoneGeoJsonCollection = {
  type: "FeatureCollection";
  features: ZoneGeoJsonFeature[];
};

type DeliveryZoneRecord = GetDeliveryZonesQuery["deliveryZones"][number];
type MapboxMap = ReturnType<MapRef["getMap"]>;
type MapControl = Parameters<MapboxMap["addControl"]>[0];

type Zone = {
  id: string;
  name: string;
  polygon: PolygonPoint[];
  deliveryFee: number;
  sortOrder: number;
  isActive: boolean;
  isServiceZone: boolean;
};

type EditingZone = {
  id: string | null; // null = creating new
  name: string;
  deliveryFee: string;
  polygon: PolygonPoint[];
  isActive: boolean;
  isServiceZone: boolean;
};

// ═══════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════
function polygonToGeoJSON(polygon: PolygonPoint[]) {
  if (polygon.length < 3) return null;
  const coords = polygon.map((p) => [p.lng, p.lat]);
  // Close the ring
  if (
    coords[0][0] !== coords[coords.length - 1][0] ||
    coords[0][1] !== coords[coords.length - 1][1]
  ) {
    coords.push([...coords[0]]);
  }
  return {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "Polygon" as const,
      coordinates: [coords],
    },
  };
}

function isPolygonFeature(feature: unknown): feature is PolygonFeature {
  if (!feature || typeof feature !== "object") {
    return false;
  }

  const geometry = (feature as { geometry?: unknown }).geometry;

  if (!geometry || typeof geometry !== "object") {
    return false;
  }

  const candidate = geometry as { type?: unknown; coordinates?: unknown };
  return candidate.type === "Polygon" && Array.isArray(candidate.coordinates);
}

function isZoneGeoJsonFeature(
  feature: ZoneGeoJsonFeature | null
): feature is ZoneGeoJsonFeature {
  return feature !== null;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return fallback;
}

function mapZone(zone: DeliveryZoneRecord): Zone {
  return {
    id: zone.id,
    name: zone.name,
    polygon: zone.polygon,
    deliveryFee: zone.deliveryFee,
    sortOrder: zone.sortOrder,
    isActive: zone.isActive,
    isServiceZone: zone.isServiceZone ?? false,
  };
}

function geoJSONToPolygon(feature: PolygonFeature): PolygonPoint[] {
  const coords = feature.geometry.coordinates[0] as number[][];
  // Remove the closing duplicate point
  const points = coords.slice(0, -1);
  return points.map(([lng, lat]) => ({ lat, lng }));
}

function readPolygonFromDraw(draw: MapboxDraw | null): PolygonPoint[] {
  if (!draw) return [];
  const collection = draw.getAll();
  const polygonFeature = collection.features.find(isPolygonFeature);
  if (!polygonFeature) return [];
  return geoJSONToPolygon(polygonFeature);
}

// ═══════════════════════════════════════════════════════════
//  Page Component
// ═══════════════════════════════════════════════════════════
export default function DeliveryZonesPage() {
  const mapRef = useRef<MapRef>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const drawInitialized = useRef(false);

  // Data
  const { data, loading, refetch } = useQuery(GET_DELIVERY_ZONES);
  const [createZone] = useMutation(CREATE_DELIVERY_ZONE);
  const [updateZone] = useMutation(UPDATE_DELIVERY_ZONE);
  const [deleteZone] = useMutation(DELETE_DELIVERY_ZONE);

  // State
  const [zones, setZones] = useState<Zone[]>([]);
  const [editing, setEditing] = useState<EditingZone | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sync from query
  useEffect(() => {
    if (data?.deliveryZones) {
      setZones(data.deliveryZones.map(mapZone));
    }
  }, [data]);

  // Flash messages
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);
  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(null), 5000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  // ─────────────────────────────────────────────────────────
  //  Draw control lifecycle
  // ─────────────────────────────────────────────────────────
  const initDraw = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map || drawInitialized.current) return;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: false, trash: false },
      defaultMode: "simple_select",
      styles: [
        // Polygon fill
        {
          id: "gl-draw-polygon-fill",
          type: "fill",
          filter: ["all", ["==", "$type", "Polygon"]],
          paint: {
            "fill-color": "#3b82f6",
            "fill-opacity": 0.15,
          },
        },
        // Polygon outline
        {
          id: "gl-draw-polygon-stroke",
          type: "line",
          filter: ["all", ["==", "$type", "Polygon"]],
          paint: {
            "line-color": "#3b82f6",
            "line-width": 2,
            "line-dasharray": [2, 2],
          },
        },
        // Vertex points
        {
          id: "gl-draw-point",
          type: "circle",
          filter: ["all", ["==", "$type", "Point"], ["==", "meta", "vertex"]],
          paint: {
            "circle-radius": 5,
            "circle-color": "#3b82f6",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#fff",
          },
        },
        // Midpoints
        {
          id: "gl-draw-midpoint",
          type: "circle",
          filter: ["all", ["==", "$type", "Point"], ["==", "meta", "midpoint"]],
          paint: {
            "circle-radius": 3,
            "circle-color": "#3b82f6",
            "circle-stroke-width": 1,
            "circle-stroke-color": "#fff",
          },
        },
        // Line (for active drawing)
        {
          id: "gl-draw-line",
          type: "line",
          filter: ["all", ["==", "$type", "LineString"]],
          paint: {
            "line-color": "#3b82f6",
            "line-width": 2,
            "line-dasharray": [2, 2],
          },
        },
      ],
    });

    map.addControl(draw as unknown as MapControl);
    drawRef.current = draw;
    drawInitialized.current = true;

    // Listen for polygon creation/update
    map.on("draw.create", (event: DrawChangeEvent) => {
      const feature = event.features?.find(isPolygonFeature);
      if (feature) {
        const polygon = geoJSONToPolygon(feature);
        setEditing((prev) => (prev ? { ...prev, polygon } : null));
        setIsDrawing(false);
      }
    });

    map.on("draw.update", (event: DrawChangeEvent) => {
      const feature = event.features?.find(isPolygonFeature);
      if (feature) {
        const polygon = geoJSONToPolygon(feature);
        setEditing((prev) => (prev ? { ...prev, polygon } : null));
      }
    });
  }, []);

  // ─────────────────────────────────────────────────────────
  //  Drawing actions
  // ─────────────────────────────────────────────────────────
  const startDrawing = useCallback(() => {
    const draw = drawRef.current;
    if (!draw) return;
    draw.deleteAll();
    draw.changeMode("draw_polygon");
    setIsDrawing(true);
  }, []);

  const loadPolygonIntoDraw = useCallback((polygon: PolygonPoint[]) => {
    const draw = drawRef.current;
    if (!draw) return;
    draw.deleteAll();
    const feature = polygonToGeoJSON(polygon);
    if (feature) {
      draw.add(feature);
      draw.changeMode("simple_select");
    }
  }, []);

  const clearDraw = useCallback(() => {
    const draw = drawRef.current;
    if (!draw) return;
    draw.deleteAll();
    draw.changeMode("simple_select");
    setIsDrawing(false);
  }, []);

  // ─────────────────────────────────────────────────────────
  //  Zone CRUD
  // ─────────────────────────────────────────────────────────
  const handleCreateNew = () => {
    setEditing({
      id: null,
      name: "",
      deliveryFee: "",
      polygon: [],
      isActive: true,
      isServiceZone: false,
    });
    clearDraw();
  };

  const handleEditZone = (zone: Zone) => {
    setEditing({
      id: zone.id,
      name: zone.name,
      deliveryFee: String(zone.deliveryFee),
      polygon: zone.polygon,
      isActive: zone.isActive,
      isServiceZone: zone.isServiceZone,
    });
    loadPolygonIntoDraw(zone.polygon);

    // Fit map to zone
    if (zone.polygon.length > 0) {
      const lats = zone.polygon.map((p) => p.lat);
      const lngs = zone.polygon.map((p) => p.lng);
      mapRef.current?.fitBounds(
        [
          [Math.min(...lngs) - 0.005, Math.min(...lats) - 0.005],
          [Math.max(...lngs) + 0.005, Math.max(...lats) + 0.005],
        ],
        { padding: 80, duration: 800 }
      );
    }
  };

  const handleCancelEdit = () => {
    setEditing(null);
    clearDraw();
  };

  const handleSaveZone = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      setErrorMsg("Zone name is required");
      return;
    }
    const fee = parseFloat(editing.deliveryFee);
    if (isNaN(fee) || fee < 0) {
      setErrorMsg("Delivery fee must be a valid non-negative number");
      return;
    }

    // Keep form state in sync with draw state in case draw events were missed.
    const polygon =
      editing.polygon.length >= 3
        ? editing.polygon
        : readPolygonFromDraw(drawRef.current);

    if (polygon.length < 3) {
      setErrorMsg("Draw a polygon on the map first (at least 3 points)");
      return;
    }

    try {
      if (editing.id) {
        // Update
        await updateZone({
          variables: {
            id: editing.id,
            input: {
              name: editing.name.trim(),
              deliveryFee: fee,
              polygon: polygon.map((p) => ({ lat: p.lat, lng: p.lng })),
              isActive: editing.isActive,
              isServiceZone: editing.isServiceZone,
            },
          },
        });
        setSuccessMsg(`Zone "${editing.name}" updated`);
      } else {
        // Create
        await createZone({
          variables: {
            input: {
              name: editing.name.trim(),
              deliveryFee: fee,
              polygon: polygon.map((p) => ({ lat: p.lat, lng: p.lng })),
              isActive: editing.isActive,
              isServiceZone: editing.isServiceZone,
            },
          },
        });
        setSuccessMsg(`Zone "${editing.name}" created`);
      }
      setEditing(null);
      clearDraw();
      refetch();
    } catch (err) {
      setErrorMsg(getErrorMessage(err, "Failed to save zone"));
    }
  };

  const handleDeleteZone = async (id: string) => {
    try {
      setDeletingId(id);
      await deleteZone({ variables: { id } });
      setSuccessMsg("Zone deleted");
      if (editing?.id === id) {
        setEditing(null);
        clearDraw();
      }
      refetch();
    } catch (err) {
      setErrorMsg(getErrorMessage(err, "Failed to delete zone"));
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (zone: Zone) => {
    try {
      await updateZone({
        variables: {
          id: zone.id,
          input: { isActive: !zone.isActive },
        },
      });
      refetch();
    } catch (err) {
      setErrorMsg(getErrorMessage(err, "Failed to toggle zone"));
    }
  };

  // ─────────────────────────────────────────────────────────
  //  Build GeoJSON for all saved zones (excluding the one being edited)
  // ─────────────────────────────────────────────────────────
  const zonesGeoJSON: ZoneGeoJsonCollection = {
    type: "FeatureCollection" as const,
    features: zones
      .filter((z) => editing?.id !== z.id) // Don't show edited zone as static layer
      .map((zone, i) => {
        const feature = polygonToGeoJSON(zone.polygon);
        if (!feature) return null;
        return {
          type: "Feature" as const,
          geometry: feature.geometry,
          properties: {
            id: zone.id,
            name: zone.name,
            deliveryFee: zone.deliveryFee,
            isActive: zone.isActive,
            color: ZONE_COLORS[i % ZONE_COLORS.length],
          },
        };
      })
      .filter(isZoneGeoJsonFeature),
  };

  // ═══════════════════════════════════════════════════════════
  //  Render
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-400" />
            Delivery Zones
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Draw polygon zones on the map and set custom delivery fees. Zones
            take priority over distance-based pricing.
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          disabled={!!editing}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Zone
        </button>
      </div>

      {/* Flash messages */}
      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Main layout: Map + Sidebar */}
      <div className="flex gap-5" style={{ height: "calc(100vh - 220px)", minHeight: 500 }}>
        {/* Map */}
        <div className="flex-1 rounded-xl overflow-hidden border border-zinc-800">
          <Map
            ref={mapRef}
            initialViewState={{
              latitude: DEFAULT_CENTER.latitude,
              longitude: DEFAULT_CENTER.longitude,
              zoom: 12.5,
            }}
            mapStyle={MAP_STYLE}
            mapboxAccessToken={MAPBOX_TOKEN}
            style={{ width: "100%", height: "100%" }}
            maxBounds={GJILAN_BOUNDS}
            minZoom={10}
            maxZoom={17}
            onLoad={() => initDraw()}
          >
            {/* Static zone polygons */}
            <Source
              id="delivery-zones"
              type="geojson"
              data={zonesGeoJSON}
            >
              <Layer
                id="zone-fills"
                type="fill"
                paint={{
                  "fill-color": ["get", "color"],
                  "fill-opacity": [
                    "case",
                    ["==", ["get", "isActive"], true],
                    0.15,
                    0.05,
                  ],
                }}
              />
              <Layer
                id="zone-borders"
                type="line"
                paint={{
                  "line-color": ["get", "color"],
                  "line-width": 2,
                  "line-opacity": [
                    "case",
                    ["==", ["get", "isActive"], true],
                    0.8,
                    0.3,
                  ],
                }}
              />
              <Layer
                id="zone-labels"
                type="symbol"
                layout={{
                  "text-field": [
                    "concat",
                    ["get", "name"],
                    "\n€",
                    ["to-string", ["get", "deliveryFee"]],
                  ],
                  "text-size": 13,
                  "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
                  "text-anchor": "center",
                }}
                paint={{
                  "text-color": ["get", "color"],
                  "text-halo-color": "rgba(0,0,0,0.7)",
                  "text-halo-width": 1.5,
                }}
              />
            </Source>
          </Map>
        </div>

        {/* Sidebar */}
        <div className="w-[380px] shrink-0 flex flex-col rounded-xl border border-zinc-800 bg-[#111113] overflow-hidden">
          {editing ? (
            // ── Edit / Create form ──
            <div className="flex flex-col h-full">
              <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">
                  {editing.id ? "Edit Zone" : "New Zone"}
                </h2>
                <button
                  onClick={handleCancelEdit}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {/* Name */}
                <div>
                  <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">
                    Zone Name
                  </label>
                  <input
                    type="text"
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                    placeholder="e.g. Suburb North"
                    className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* Delivery fee */}
                <div>
                  <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">
                    Delivery Fee (€)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="number"
                      value={editing.deliveryFee}
                      onChange={(e) =>
                        setEditing({ ...editing, deliveryFee: e.target.value })
                      }
                      placeholder="0.00"
                      min="0"
                      step="0.10"
                      className="w-full pl-9 pr-3 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Active toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-300">Active</span>
                  <button
                    onClick={() =>
                      setEditing({ ...editing, isActive: !editing.isActive })
                    }
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      editing.isActive ? "bg-blue-600" : "bg-zinc-700"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        editing.isActive ? "translate-x-[22px]" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                {/* Service zone toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-zinc-300">Delivery Service Zone</span>
                    <p className="text-xs text-zinc-500 mt-0.5">Orders are treated as in-zone only when inside this zone.</p>
                  </div>
                  <button
                    onClick={() =>
                      setEditing({ ...editing, isServiceZone: !editing.isServiceZone })
                    }
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      editing.isServiceZone ? "bg-emerald-600" : "bg-zinc-700"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        editing.isServiceZone ? "translate-x-[22px]" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                {/* Polygon drawing */}
                <div className="border-t border-zinc-800 pt-4">
                  <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2 block">
                    Zone Polygon
                  </label>

                  {editing.polygon.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm text-emerald-400">
                          {editing.polygon.length} points drawn
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={startDrawing}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Redraw
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {isDrawing ? (
                        <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                          <span className="text-sm text-blue-400">
                            Click on the map to draw points. Double-click or
                            click the first point to finish.
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-500">
                          Click "Draw on Map" to start drawing the zone boundary.
                        </p>
                      )}
                      <button
                        onClick={startDrawing}
                        disabled={isDrawing}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                      >
                        <MapPin className="w-4 h-4" />
                        {isDrawing ? "Drawing..." : "Draw on Map"}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Save / Cancel buttons */}
              <div className="px-5 py-4 border-t border-zinc-800 flex gap-2">
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveZone}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {editing.id ? "Update" : "Create"}
                </button>
              </div>
            </div>
          ) : (
            // ── Zone list ──
            <div className="flex flex-col h-full">
              <div className="px-5 py-4 border-b border-zinc-800">
                <h2 className="text-base font-semibold text-white">
                  Zones ({zones.length})
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Zones are checked in order. First matching zone wins.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="px-5 py-12 text-center text-zinc-500 text-sm">
                    Loading zones…
                  </div>
                ) : zones.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <Layers className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                    <p className="text-sm text-zinc-400">No zones yet</p>
                    <p className="text-xs text-zinc-600 mt-1">
                      Create your first delivery zone to set custom fees for
                      specific areas.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800/50">
                    {zones.map((zone, i) => (
                      <div
                        key={zone.id}
                        className="px-5 py-3.5 hover:bg-zinc-900/50 transition-colors group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-3 h-3 rounded-sm shrink-0"
                              style={{
                                backgroundColor:
                                  ZONE_COLORS[i % ZONE_COLORS.length],
                                opacity: zone.isActive ? 1 : 0.3,
                              }}
                            />
                            <div className="min-w-0">
                              <p
                                className={`text-sm font-medium truncate ${
                                  zone.isActive
                                    ? "text-white"
                                    : "text-zinc-500 line-through"
                                }`}
                              >
                                {zone.name}
                              </p>
                              <p className="text-xs text-zinc-500 mt-0.5">
                                €{zone.deliveryFee.toFixed(2)} •{" "}
                                {zone.polygon.length} points
                              </p>
                              {zone.isServiceZone && (
                                <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                  Service Zone
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleToggleActive(zone)}
                              className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                              title={zone.isActive ? "Disable" : "Enable"}
                            >
                              {zone.isActive ? (
                                <Eye className="w-3.5 h-3.5" />
                              ) : (
                                <EyeOff className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleEditZone(zone)}
                              className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                              title="Edit"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteZone(zone.id)}
                              disabled={deletingId === zone.id}
                              className="p-1.5 hover:bg-red-500/10 rounded text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

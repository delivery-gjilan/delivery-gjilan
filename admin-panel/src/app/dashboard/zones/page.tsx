"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import Map, { Source, Layer } from "react-map-gl/mapbox";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { GET_DELIVERY_ZONES, CREATE_DELIVERY_ZONE, UPDATE_DELIVERY_ZONE, DELETE_DELIVERY_ZONE } from "@/graphql/operations/deliveryZones";
import { Trash2, Save, X, Plus } from "lucide-react";

const DEFAULT_CENTER = {
  latitude: 42.4635,
  longitude: 21.4694,
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const MAP_STYLE = process.env.NEXT_PUBLIC_MAP_STYLE_URL || "mapbox://styles/mapbox/streets-v12";

const ZONE_COLORS = [
  { value: "#3b82f6", label: "Blue" },
  { value: "#22c55e", label: "Green" },
  { value: "#eab308", label: "Yellow" },
  { value: "#f97316", label: "Orange" },
  { value: "#ef4444", label: "Red" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#ec4899", label: "Pink" },
];

export default function DeliveryZonesPage() {
  const { data: zonesData, loading, refetch } = useQuery<any>(GET_DELIVERY_ZONES);
  const [createZone] = useMutation(CREATE_DELIVERY_ZONE);
  const [updateZone] = useMutation(UPDATE_DELIVERY_ZONE);
  const [deleteZone] = useMutation(DELETE_DELIVERY_ZONE);

  const mapRef = useRef<any>(null);
  const drawRef = useRef<MapboxDraw | null>(null);

  const [editingZone, setEditingZone] = useState<any>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawReady, setDrawReady] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    feeDelta: 0,
    color: "#3b82f6",
    priority: 0,
    isActive: true,
  });

  const zones = zonesData?.deliveryZones ?? [];

  // Initialize Mapbox Draw once when map loads
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || drawRef.current) return;

    const map = mapRef.current.getMap();
    if (!map) return;

    console.log("Initializing Mapbox Draw...");
    
    // Initialize Mapbox Draw
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      defaultMode: "simple_select",
    });

    map.addControl(draw, "top-left");
    drawRef.current = draw;

    // Listen for draw events
    const onDrawCreate = (e: any) => {
      console.log("Draw create event:", e);
      if (e.features && e.features[0]) {
        const feature = e.features[0];
        setEditingZone({ geometry: JSON.stringify(feature.geometry), isNew: true });
        setFormData({
          name: "",
          description: "",
          feeDelta: 0,
          color: "#3b82f6",
          priority: 0,
          isActive: true,
        });
        setIsDrawing(false);
      }
    };

    const onDrawUpdate = (e: any) => {
      console.log("Draw update event:", e);
      if (e.features && e.features[0]) {
        const feature = e.features[0];
        const zoneId = feature.properties?.zoneId;
        if (zoneId) {
          const zone = zones.find((z: any) => z.id === zoneId);
          if (zone) {
            setEditingZone({ ...zone, geometry: JSON.stringify(feature.geometry), isNew: false });
            setFormData({
              name: zone.name,
              description: zone.description || "",
              feeDelta: zone.feeDelta,
              color: zone.color,
              priority: zone.priority,
              isActive: zone.isActive,
            });
          }
        }
      }
    };

    map.on("draw.create", onDrawCreate);
    map.on("draw.update", onDrawUpdate);
    
    console.log("Mapbox Draw initialized successfully");
    setDrawReady(true);

    return () => {
      if (drawRef.current && map) {
        try {
          map.removeControl(drawRef.current);
        } catch (err) {
          console.log("Error removing draw control:", err);
        }
        drawRef.current = null;
        setDrawReady(false);
      }
    };
  }, [mapLoaded]);

  // Load existing zones into draw when zones data changes
  useEffect(() => {
    if (!drawRef.current || zones.length === 0) return;

    const draw = drawRef.current;
    
    // Clear existing features first
    draw.deleteAll();

    // Load zones
    zones.forEach((zone: any) => {
      try {
        const geom = JSON.parse(zone.geometry);
        draw.add({
          type: "Feature",
          properties: { zoneId: zone.id },
          geometry: geom,
        });
      } catch (err) {
        console.error("Failed to load zone:", zone.id, err);
      }
    });
  }, [zones]);

  const startDrawing = () => {
    console.log("Start drawing clicked");
    console.log("drawRef.current:", drawRef.current);
    
    if (!drawRef.current) {
      console.error("Draw control not initialized!");
      alert("Draw control is not ready. Please wait a moment and try again.");
      return;
    }
    
    try {
      console.log("Changing mode to draw_polygon...");
      drawRef.current.changeMode("draw_polygon");
      setIsDrawing(true);
      console.log("Drawing mode activated");
    } catch (error) {
      console.error("Error starting draw mode:", error);
      alert("Failed to start drawing. Check the console for details.");
    }
  };

  const cancelDrawing = () => {
    if (drawRef.current) {
      if (editingZone?.isNew) {
        drawRef.current.deleteAll();
      }
      drawRef.current.changeMode("simple_select");
    }
    setIsDrawing(false);
    setEditingZone(null);
    setSelectedFeatureId(null);
  };

  const handleSave = async () => {
    if (!editingZone) return;

    try {
      if (editingZone.isNew) {
        await createZone({
          variables: {
            input: {
              name: formData.name,
              description: formData.description || undefined,
              feeDelta: parseFloat(formData.feeDelta.toString()),
              color: formData.color,
              priority: parseInt(formData.priority.toString()),
              isActive: formData.isActive,
              geometry: editingZone.geometry,
            },
          },
        });
      } else {
        await updateZone({
          variables: {
            id: editingZone.id,
            input: {
              name: formData.name,
              description: formData.description || undefined,
              feeDelta: parseFloat(formData.feeDelta.toString()),
              color: formData.color,
              priority: parseInt(formData.priority.toString()),
              isActive: formData.isActive,
              geometry: editingZone.geometry,
            },
          },
        });
      }

      await refetch();
      setEditingZone(null);
      cancelDrawing();
    } catch (error) {
      console.error("Failed to save zone:", error);
      alert("Failed to save zone. Check console for details.");
    }
  };

  const handleDelete = async (zoneId: string) => {
    if (!confirm("Are you sure you want to delete this zone?")) return;

    try {
      await deleteZone({ variables: { id: zoneId } });
      if (drawRef.current) {
        const allFeatures = drawRef.current.getAll();
        const featureToDelete = allFeatures.features.find((f: any) => f.properties?.zoneId === zoneId);
        if (featureToDelete) {
          drawRef.current.delete(featureToDelete.id as string);
        }
      }
      await refetch();
    } catch (error) {
      console.error("Failed to delete zone:", error);
      alert("Failed to delete zone. Check console for details.");
    }
  };

  const selectZone = (zone: any) => {
    if (!drawRef.current) return;

    setIsDrawing(false);
    setEditingZone({ ...zone, isNew: false });
    setFormData({
      name: zone.name,
      description: zone.description || "",
      feeDelta: zone.feeDelta,
      color: zone.color,
      priority: zone.priority,
      isActive: zone.isActive,
    });

    const allFeatures = drawRef.current.getAll();
    const feature = allFeatures.features.find((f: any) => f.properties?.zoneId === zone.id);
    if (feature && feature.id) {
      const featureId = feature.id.toString();
      setSelectedFeatureId(featureId);
      drawRef.current.changeMode("simple_select" as any, { featureIds: [featureId] });
    }
  };

  const focusMoveMode = () => {
    if (!drawRef.current || !selectedFeatureId) return;
    drawRef.current.changeMode("simple_select" as any, { featureIds: [selectedFeatureId] });
  };

  const focusEditMode = () => {
    if (!drawRef.current || !selectedFeatureId) return;
    drawRef.current.changeMode("direct_select" as any, { featureId: selectedFeatureId });
  };

  return (
    <div className="h-screen w-full flex">
      <div className="flex-1 relative">
        <Map
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={{
            latitude: DEFAULT_CENTER.latitude,
            longitude: DEFAULT_CENTER.longitude,
            zoom: 13,
          }}
          style={{ width: "100%", height: "100%" }}
          mapStyle={MAP_STYLE}
          onLoad={() => {
            console.log("Map loaded callback fired!");
            setMapLoaded(true);
          }}
        >
          {/* Render zones as polygons */}
          {zones.map((zone: any) => {
            try {
              const geom = JSON.parse(zone.geometry);
              return (
                <Source key={zone.id} id={`zone-${zone.id}`} type="geojson" data={{ type: "Feature", properties: {}, geometry: geom }}>
                  <Layer
                    id={`zone-fill-${zone.id}`}
                    type="fill"
                    paint={{
                      "fill-color": zone.color,
                      "fill-opacity": zone.isActive ? 0.2 : 0.05,
                    }}
                  />
                  <Layer
                    id={`zone-outline-${zone.id}`}
                    type="line"
                    paint={{
                      "line-color": zone.color,
                      "line-width": 2,
                      "line-opacity": zone.isActive ? 0.8 : 0.3,
                    }}
                  />
                </Source>
              );
            } catch (err) {
              return null;
            }
          })}
        </Map>

        {/* Debug Info */}
        <div className="absolute top-4 left-4 bg-black/80 text-white px-3 py-2 rounded-lg text-xs">
          Draw: {drawReady ? "✓ Ready" : "⏳ Loading..."}
        </div>

        {!editingZone && !isDrawing && (
          <button
            onClick={startDrawing}
            className="absolute top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!drawReady}
          >
            <Plus size={18} />
            Draw New Zone
          </button>
        )}
      </div>

      {/* Sidebar */}
      <div className="w-96 bg-[#0a0a0a] border-l border-[#262626] p-4 overflow-y-auto">
        <h2 className="text-white text-xl font-bold mb-4">Delivery Zones</h2>

        {editingZone && (
          <div className="mb-6 bg-[#161616] border border-[#262626] rounded-lg p-4">
            <h3 className="text-white font-semibold mb-3">{editingZone.isNew ? "New Zone" : "Edit Zone"}</h3>

            {!editingZone.isNew && (
              <div className="flex gap-2 mb-3">
                <button
                  onClick={focusMoveMode}
                  className="flex-1 bg-[#111111] border border-[#262626] text-white px-3 py-2 rounded hover:bg-[#1a1a1a]"
                >
                  Move Zone
                </button>
                <button
                  onClick={focusEditMode}
                  className="flex-1 bg-[#111111] border border-[#262626] text-white px-3 py-2 rounded hover:bg-[#1a1a1a]"
                >
                  Edit Shape
                </button>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-neutral-400 text-sm mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#262626] text-white px-3 py-2 rounded"
                  placeholder="Zone 1"
                />
              </div>

              <div>
                <label className="block text-neutral-400 text-sm mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#262626] text-white px-3 py-2 rounded resize-none"
                  rows={2}
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="block text-neutral-400 text-sm mb-1">Fee Delta ($)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.feeDelta}
                  onChange={(e) => setFormData({ ...formData, feeDelta: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#0a0a0a] border border-[#262626] text-white px-3 py-2 rounded"
                  placeholder="1.00"
                />
                <p className="text-xs text-neutral-500 mt-1">Added to base delivery fee</p>
              </div>

              <div>
                <label className="block text-neutral-400 text-sm mb-1">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {ZONE_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setFormData({ ...formData, color: c.value })}
                      className={`w-8 h-8 rounded border-2 ${formData.color === c.value ? "border-white" : "border-transparent"}`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 text-sm mb-1">Priority</label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#0a0a0a] border border-[#262626] text-white px-3 py-2 rounded"
                  placeholder="0"
                />
                <p className="text-xs text-neutral-500 mt-1">Higher = used when overlapping</p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="isActive" className="text-white text-sm">
                  Active
                </label>
              </div>

              <div className="flex gap-2 mt-4">
                <button onClick={handleSave} disabled={!formData.name} className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  <Save size={16} />
                  Save
                </button>
                <button onClick={cancelDrawing} className="flex-1 bg-neutral-700 text-white px-4 py-2 rounded hover:bg-neutral-600 flex items-center justify-center gap-2">
                  <X size={16} />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && <div className="text-neutral-400 text-sm">Loading zones...</div>}

        <div className="space-y-2 mt-4">
          {zones.map((zone: any) => (
            <div key={zone.id} className={`bg-[#161616] border border-[#262626] rounded-lg p-3 hover:bg-[#1c1c1c] transition cursor-pointer`} onClick={() => selectZone(zone)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: zone.color }} />
                  <div className="flex-1">
                    <div className="text-white font-medium">{zone.name}</div>
                    <div className="text-neutral-400 text-sm">
                      ${zone.feeDelta >= 0 ? "+" : ""}
                      {zone.feeDelta.toFixed(2)} · Priority {zone.priority}
                    </div>
                  </div>
                </div>
                <button onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(zone.id);
                }} className="text-red-500 hover:text-red-400 p-1">
                  <Trash2 size={16} />
                </button>
              </div>
              {!zone.isActive && <div className="text-amber-500 text-xs mt-1">Inactive</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

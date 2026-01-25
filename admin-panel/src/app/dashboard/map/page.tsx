"use client";

import { Map as MapIcon, MapPin, Truck } from "lucide-react";

export default function MapPage() {
  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <MapIcon size={28} />
          Live Map
        </h1>
        <p className="text-neutral-400 mt-1">
          Real-time tracking of drivers and orders
        </p>
      </div>

      {/* Map Container */}
      <div className="flex-1 bg-[#161616] border border-[#262626] rounded-lg overflow-hidden relative">
        {/* Placeholder */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <MapIcon size={64} className="mx-auto text-neutral-600 mb-4" />
            <p className="text-neutral-400 mb-2">Map Integration Coming Soon</p>
            <p className="text-neutral-500 text-sm">
              Real-time driver and order tracking will be displayed here
            </p>
          </div>
        </div>

        {/* Side Panel for Drivers List */}
        <div className="absolute right-4 top-4 bottom-4 w-80 bg-[#0a0a0a] border border-[#262626] rounded-lg p-4 overflow-y-auto">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Truck size={18} />
            Active Drivers
          </h3>

          {/* Driver List Placeholder */}
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-[#161616] border border-[#262626] rounded-lg p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <Truck size={18} className="text-cyan-500" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white">Driver {i}</div>
                    <div className="text-xs text-neutral-400">
                      2 active orders
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-[#262626]">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <MapPin size={18} />
              Businesses
            </h3>
            <p className="text-neutral-500 text-sm">
              Business locations will be shown on the map
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { BusiaZone } from '../types';
import { BUSIA_LOCAL_ZONES } from '../data/seedData';
import {
  MapPin,
  ChevronDown,
  X,
  Compass,
  Clock,
  Sparkles,
  Building2,
  Check,
  Info,
} from 'lucide-react';

interface BusiaLocationFilterProps {
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string | null) => void;
  productCountByZone?: Record<string, number>;
  totalProductsCount: number;
}

export const BusiaLocationFilter: React.FC<BusiaLocationFilterProps> = ({
  selectedZoneId,
  onSelectZone,
  productCountByZone = {},
  totalProductsCount,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showZoneInfoModal, setShowZoneInfoModal] = useState<BusiaZone | null>(null);

  const activeZone = BUSIA_LOCAL_ZONES.find((z) => z.id === selectedZoneId);

  return (
    <div className="w-full">
      {/* Main Busia Location Bar Header & Quick Pills */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Main Busia Area Selector Button */}
          <div className="relative inline-block">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs border ${
                selectedZoneId
                  ? 'bg-orange-600 text-white border-orange-700 shadow-orange-500/20'
                  : 'bg-slate-900 text-white border-slate-800 hover:bg-slate-800'
              }`}
              title="Filter by Busia Area local zones"
            >
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <MapPin className="w-3 h-3 text-white fill-white/30" />
              </div>
              <div className="text-left leading-tight">
                <span className="text-[10px] uppercase font-bold text-orange-200 block tracking-wider">
                  Busia Area
                </span>
                <span className="truncate max-w-[130px] sm:max-w-[180px] block">
                  {activeZone ? activeZone.name : 'All Local Zones'}
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu with Zone details & delivery estimates */}
            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between mb-1">
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-orange-600" />
                        Busia Area Localities
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Choose your locality for rapid same-day fulfillment
                      </p>
                    </div>
                    {selectedZoneId && (
                      <button
                        onClick={() => {
                          onSelectZone(null);
                          setIsDropdownOpen(false);
                        }}
                        className="text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto space-y-1.5 py-1">
                    {/* All Zones Option */}
                    <button
                      onClick={() => {
                        onSelectZone(null);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between ${
                        selectedZoneId === null
                          ? 'bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 text-orange-950 dark:text-orange-200 font-bold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            All Busia & Eastern Region
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            Entire marketplace catalog ({totalProductsCount} products)
                          </div>
                        </div>
                      </div>
                      {selectedZoneId === null && (
                        <Check className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
                      )}
                    </button>

                    {/* Individual Local Zones */}
                    {BUSIA_LOCAL_ZONES.map((zone) => {
                      const isSelected = selectedZoneId === zone.id;
                      const count = productCountByZone[zone.id] ?? 0;
                      return (
                        <button
                          key={zone.id}
                          onClick={() => {
                            onSelectZone(zone.id);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between group ${
                            isSelected
                              ? 'bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 text-orange-950 dark:text-orange-200 font-bold shadow-xs'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-transparent'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0 pr-2">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                isSelected
                                  ? 'bg-orange-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/50 group-hover:text-orange-700 dark:group-hover:text-orange-300'
                              }`}
                            >
                              <Building2 className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span className="truncate">{zone.name}</span>
                                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  {count} items
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                {zone.landmarks.slice(0, 2).join(' • ')}
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                <span>{zone.deliveryTime}</span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowZoneInfoModal(zone);
                              }}
                              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700"
                              title="View zone details and landmarks"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>
                            {isSelected && (
                              <Check className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Quick Informational Snippet */}
          <div className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            <span>
              Restricted to local inventory with doorstep dispatch across Busia zones
            </span>
          </div>
        </div>

        {/* Quick Clickable Zone Pills (Horizontal Scrolling) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-0.5">
          <button
            onClick={() => onSelectZone(null)}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
              selectedZoneId === null
                ? 'bg-slate-900 dark:bg-orange-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span>All Busia</span>
          </button>

          {BUSIA_LOCAL_ZONES.map((zone) => {
            const isSelected = selectedZoneId === zone.id;
            const count = productCountByZone[zone.id] ?? 0;
            return (
              <button
                key={zone.id}
                onClick={() => onSelectZone(isSelected ? null : zone.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-orange-600 text-white border-orange-700 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                <span>{zone.name}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? 'bg-orange-800 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                )}
                {isSelected && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectZone(null);
                    }}
                    className="ml-0.5 hover:text-orange-200 cursor-pointer"
                    title="Clear filter"
                  >
                    ×
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Zone Detail Modal / Card Dialog */}
      {showZoneInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowZoneInfoModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
                <MapPin className="w-4 h-4" />
              </span>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  {showZoneInfoModal.district} • {showZoneInfoModal.subCountyOrTown}
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {showZoneInfoModal.name}
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              {showZoneInfoModal.description}
            </p>

            <div className="mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Estimated Delivery:
                </span>
                <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
                  {showZoneInfoModal.deliveryTime}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Key Coverage Landmarks:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {showZoneInfoModal.landmarks.map((lm) => (
                    <span
                      key={lm}
                      className="text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md font-medium"
                    >
                      {lm}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  onSelectZone(showZoneInfoModal.id);
                  setShowZoneInfoModal(null);
                  setIsDropdownOpen(false);
                }}
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md transition-all text-center"
              >
                Browse Items in {showZoneInfoModal.name}
              </button>
              <button
                onClick={() => setShowZoneInfoModal(null)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

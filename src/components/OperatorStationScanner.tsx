import React, { useState, useEffect } from 'react';
import {
  Camera,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  User,
  MapPin,
  Clock,
  Layers,
  ChevronRight,
  Zap,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  loadStations,
  loadOrders,
  advanceOrderThroughStation,
  subscribeToSync,
} from '../utils/productionStore';
import { ProductionStation, ProductionOrder } from '../utils/types';
import { playSuccessBeep } from '../utils/audio';
import confetti from 'canvas-confetti';

interface OperatorStationScannerProps {
  onOpenLiveCamera: () => void;
  lastScannedExternalCode?: string | null;
  onClearExternalCode?: () => void;
  presetStationId?: string;
}

export const OperatorStationScanner: React.FC<OperatorStationScannerProps> = ({
  onOpenLiveCamera,
  lastScannedExternalCode,
  onClearExternalCode,
  presetStationId,
}) => {
  const [stations, setStations] = useState<ProductionStation[]>(loadStations());
  const [selectedStationId, setSelectedStationId] = useState<string>(
    presetStationId || stations[0]?.id || ''
  );
  const [operatorName, setOperatorName] = useState<string>('Operatör 1');
  const [manualCodeInput, setManualCodeInput] = useState<string>('');
  const [recentTransitions, setRecentTransitions] = useState<
    Array<{
      orderNumber: string;
      articleName: string;
      stationName: string;
      prevStation?: string;
      isCompleted: boolean;
      isNew: boolean;
      time: string;
    }>
  >([]);
  const [lastActionResult, setLastActionResult] = useState<{
    orderNumber: string;
    stationName: string;
    prevStation?: string;
    isCompleted: boolean;
    isNew: boolean;
    time: string;
  } | null>(null);

  useEffect(() => {
    setStations(loadStations());
    const unsub = subscribeToSync(() => {
      setStations(loadStations());
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (presetStationId) {
      setSelectedStationId(presetStationId);
    }
  }, [presetStationId]);

  // Handle external scan (from main camera or dropzone)
  useEffect(() => {
    if (lastScannedExternalCode) {
      handleAdvance(lastScannedExternalCode);
      if (onClearExternalCode) onClearExternalCode();
    }
  }, [lastScannedExternalCode]);

  const activeStation = stations.find((s) => s.id === selectedStationId) || stations[0];

  const handleAdvance = (code: string) => {
    if (!code.trim()) return;
    const clean = code.trim();

    const result = advanceOrderThroughStation(clean, selectedStationId, operatorName);

    playSuccessBeep(result.isCompleted ? 1046 : 880, 160);

    if (result.isCompleted) {
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#10b981', '#34d399', '#38bdf8', '#fbbf24'],
        });
      } catch {
        // ignore
      }
    }

    const timeStr = new Date().toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const info = {
      orderNumber: result.order.orderNumber,
      articleName: result.order.articleName,
      stationName: activeStation?.name || 'Station',
      prevStation: result.previousStationName,
      isCompleted: result.isCompleted,
      isNew: result.isNew,
      time: timeStr,
    };

    setLastActionResult(info);
    setRecentTransitions((prev) => [info, ...prev.slice(0, 15)]);
  };

  const onSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCodeInput.trim()) return;
    handleAdvance(manualCodeInput.trim());
    setManualCodeInput('');
  };

  const handleTestScan = () => {
    const existingOrders = loadOrders();
    // 60% chance to advance an existing order if available
    if (existingOrders.length > 0 && Math.random() < 0.65) {
      const randomOrder = existingOrders[Math.floor(Math.random() * existingOrders.length)];
      handleAdvance(randomOrder.orderNumber);
    } else {
      const num = Math.floor(8000 + Math.random() * 1000);
      handleAdvance(`ORD-${num}`);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Station Selector Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                Välj Arbetsstation
              </h2>
              <p className="text-xs text-slate-400">
                Skannade QR-koder flyttar automatiskt ordern hit i produktionen
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              placeholder="Operatörens namn..."
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 w-36"
            />
          </div>
        </div>

        {/* Station Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3.5">
          {stations.map((st) => {
            const isSelected = st.id === selectedStationId;
            return (
              <button
                key={st.id}
                onClick={() => setSelectedStationId(st.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-500/15 border-sky-500/70 text-white shadow-md shadow-sky-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      isSelected
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {st.code}
                  </span>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-sky-400" />}
                </div>
                <div className="font-semibold text-xs mt-1.5 truncate text-white">
                  {st.name}
                </div>
                <span className="text-[11px] text-slate-500 block truncate">
                  Mål: {st.targetCycleMinutes}m
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Big Scanner Action Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
              Aktiv station:
            </span>
            <span className="text-xs font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 rounded-full">
              {activeStation?.code} – {activeStation?.name}
            </span>
          </div>

          <button
            onClick={handleTestScan}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-semibold transition-colors"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Test-skanna</span>
          </button>
        </div>

        {/* Primary Camera Button */}
        <button
          onClick={onOpenLiveCamera}
          className="w-full py-4 px-6 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-slate-950 font-bold text-base sm:text-lg rounded-2xl shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2.5 transition-all transform active:scale-[0.98] cursor-pointer"
        >
          <Camera className="w-6 h-6 stroke-[2.5]" />
          <span>Starta Kamera för {activeStation?.name}</span>
        </button>

        {/* Manual Barcode / USB Scanner Input */}
        <form onSubmit={onSubmitManual} className="flex gap-2">
          <input
            type="text"
            value={manualCodeInput}
            onChange={(e) => setManualCodeInput(e.target.value)}
            placeholder="Scanna med USB-skanner eller skriv ordernr här..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
          <button
            type="submit"
            disabled={!manualCodeInput.trim()}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-sky-400 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Stämpla in
          </button>
        </form>

        {/* Live Feedback Card */}
        {lastActionResult && (
          <div
            className={`mt-1 p-4 rounded-xl border flex items-center gap-3 transition-all ${
              lastActionResult.isCompleted
                ? 'bg-emerald-950/50 border-emerald-500/60 shadow-lg shadow-emerald-950/30'
                : 'bg-sky-950/50 border-sky-500/60 shadow-lg shadow-sky-950/30'
            }`}
          >
            <div
              className={`p-2 rounded-xl shrink-0 ${
                lastActionResult.isCompleted
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-sky-500 text-slate-950'
              }`}
            >
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-white">
                  {lastActionResult.orderNumber}
                </span>
                {lastActionResult.isCompleted ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    FÄRDIGLEVERANS / VMD UTKALL
                  </span>
                ) : lastActionResult.isNew ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    NY ORDER STARTAD
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                    FLYTAT TILL NÄSTA
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5 truncate">
                {lastActionResult.prevStation
                  ? `Från ${lastActionResult.prevStation} ➔ Nu vid ${lastActionResult.stationName}`
                  : `Inregistrerad vid ${lastActionResult.stationName}`}
              </p>
            </div>

            <span className="text-[11px] font-mono text-slate-400 shrink-0">
              kl. {lastActionResult.time}
            </span>
          </div>
        )}
      </div>

      {/* Workstation Activity Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-2.5 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>Senaste stämplingar på denna enhet ({recentTransitions.length})</span>
          </div>
          {recentTransitions.length > 0 && (
            <button
              onClick={() => setRecentTransitions([])}
              className="text-[11px] text-slate-500 hover:text-slate-300"
            >
              Rensa lista
            </button>
          )}
        </div>

        <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/60 pr-1">
          {recentTransitions.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              Inga skanningar gjorda på den här stationen ännu.
            </div>
          ) : (
            recentTransitions.map((item, idx) => (
              <div key={idx} className="py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-white">{item.orderNumber}</span>
                  <span className="text-slate-400 truncate max-w-[150px] sm:max-w-xs">
                    {item.articleName}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-sky-400 font-medium">{item.stationName}</span>
                  <span className="text-[11px] text-slate-500 font-mono">{item.time}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

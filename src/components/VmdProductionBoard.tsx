import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Download,
  RotateCcw,
  Sparkles,
  QrCode,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Users,
  Search,
} from 'lucide-react';
import {
  loadOrders,
  loadStations,
  loadGoals,
  saveOrders,
  saveGoals,
  subscribeToSync,
  advanceOrderThroughStation,
  seedDemoProductionData,
} from '../utils/productionStore';
import { ProductionOrder, ProductionStation, VMDShiftGoal } from '../utils/types';

interface VmdProductionBoardProps {
  onOpenScannerForStation?: (stationId: string) => void;
  onGenerateQr?: (code: string) => void;
}

export const VmdProductionBoard: React.FC<VmdProductionBoardProps> = ({
  onOpenScannerForStation,
  onGenerateQr,
}) => {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [stations, setStations] = useState<ProductionStation[]>([]);
  const [goal, setGoal] = useState<VMDShiftGoal>(loadGoals());
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quickScanInput, setQuickScanInput] = useState('');
  const [quickStationId, setQuickStationId] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // Reload data
  const refreshData = () => {
    setOrders(loadOrders());
    setStations(loadStations());
    setGoal(loadGoals());
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = subscribeToSync(() => {
      refreshData();
    });
    return () => unsubscribe();
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // KPIs
  const completedOrders = orders.filter((o) => o.status === 'completed');
  const activeOrders = orders.filter((o) => o.status === 'active');
  const totalCompleted = completedOrders.length;
  const targetPercent = Math.min(100, Math.round((totalCompleted / (goal.dailyTarget || 1)) * 100));

  // Identify bottleneck station (station with most active orders)
  const stationCounts: { [key: string]: number } = {};
  stations.forEach((s) => {
    stationCounts[s.id] = orders.filter((o) => o.currentStationId === s.id && o.status === 'active').length;
  });

  const activeIntermediateStations = stations.filter((s) => s.orderIndex < stations.length - 1);
  const bottleneckStation = activeIntermediateStations.length > 0
    ? activeIntermediateStations.reduce((prev, curr) =>
        (stationCounts[curr.id] || 0) > (stationCounts[prev.id] || 0) ? curr : prev
      )
    : null;
  const maxCount = bottleneckStation ? stationCounts[bottleneckStation.id] || 0 : 0;

  // Calculate average lead time for completed orders (in minutes)
  const completedDurations = completedOrders.map((o) => {
    const start = o.createdAt;
    const end = o.updatedAt;
    return Math.max(1, Math.round((end - start) / (1000 * 60)));
  });
  const avgLeadTimeMins =
    completedDurations.length > 0
      ? Math.round(completedDurations.reduce((a, b) => a + b, 0) / completedDurations.length)
      : 0;

  // Handle manual / quick move from board
  const handleQuickAdvance = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickScanInput.trim()) return;
    const targetSt = quickStationId || stations[0]?.id;
    advanceOrderThroughStation(quickScanInput.trim(), targetSt, 'VMD Tavla');
    setQuickScanInput('');
    refreshData();
  };

  // Export Production Log
  const exportProductionReport = () => {
    let csv = 'Ordernr,Artikel,Batch,Status,Starttid,Senaste Uppdatering,Stationer,Ledtid (min)\n';
    orders.forEach((o) => {
      const created = new Date(o.createdAt).toLocaleString('sv-SE');
      const updated = new Date(o.updatedAt).toLocaleString('sv-SE');
      const leadTime = Math.round((o.updatedAt - o.createdAt) / (1000 * 60));
      const steps = o.history.map((h) => `${h.stationName} (${h.operatorName})`).join(' -> ');
      csv += `"${o.orderNumber}","${o.articleName}","${o.batch || ''}","${o.status}","${created}","${updated}","${steps}",${leadTime}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VMD_Produktionsrapport_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const colorStyles: { [key: string]: { border: string; bg: string; text: string; badge: string } } = {
    sky: {
      border: 'border-sky-500/40',
      bg: 'bg-sky-500/10',
      text: 'text-sky-400',
      badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    },
    amber: {
      border: 'border-amber-500/40',
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    purple: {
      border: 'border-purple-500/40',
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    },
    emerald: {
      border: 'border-emerald-500/40',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* VMD Header Bar with KPI Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                MAS-Light Produktionstavla
                <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30">
                  VMD Live
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Realtidsvisning av flöde, cykeltider och utfall för {goal.shiftName}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const newTarget = prompt('Ange nytt mål för skiftet (st):', goal.dailyTarget.toString());
                if (newTarget && !isNaN(parseInt(newTarget))) {
                  const updated = { ...goal, dailyTarget: parseInt(newTarget) };
                  setGoal(updated);
                  saveGoals(updated);
                }
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 rounded-xl transition-colors"
            >
              Mål: {goal.dailyTarget} st
            </button>

            <button
              onClick={exportProductionReport}
              title="Exportera skiftrapport till CSV"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs flex items-center gap-1 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportera</span>
            </button>

            <button
              onClick={() => {
                if (confirm('Vill du återställa till demonstrationsdata?')) {
                  seedDemoProductionData();
                  refreshData();
                }
              }}
              title="Ladda demo-data"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
            </button>

            <button
              onClick={toggleFullscreen}
              title="Växla fullskärm för TV-skärm"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 4 Big KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {/* 1. Mål vs Utfall */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Mål vs Utfall</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="my-1.5 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white">{totalCompleted}</span>
              <span className="text-slate-400 font-semibold text-sm">/ {goal.dailyTarget} st</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${targetPercent}%` }}
              />
            </div>
            <span className="text-[11px] text-emerald-400 mt-1 font-semibold">{targetPercent}% uppnått</span>
          </div>

          {/* 2. Pågående i produktion (WIP) */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Pågående (WIP)</span>
              <Clock className="w-4 h-4 text-sky-400" />
            </div>
            <div className="my-1.5">
              <span className="text-2xl sm:text-3xl font-black text-sky-400">{activeOrders.length}</span>
              <span className="text-slate-400 text-xs ml-1">ordrar i linan</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Fördela jämnt för optimal takt
            </span>
          </div>

          {/* 3. Flaskhalsanalys */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Flaskhals (Buffer)</span>
              <AlertTriangle className={`w-4 h-4 ${maxCount > 2 ? 'text-rose-400' : 'text-slate-500'}`} />
            </div>
            <div className="my-1.5 truncate">
              {bottleneckStation && maxCount > 0 ? (
                <>
                  <div className="text-base sm:text-lg font-bold text-amber-300 truncate">
                    {bottleneckStation.name}
                  </div>
                  <span className="text-xs text-slate-400">{maxCount} ordrar väntar här</span>
                </>
              ) : (
                <>
                  <div className="text-base sm:text-lg font-bold text-emerald-400">Balanserat</div>
                  <span className="text-xs text-slate-400">Inget köbygge</span>
                </>
              )}
            </div>
            <span className="text-[11px] text-slate-500">MAS flödesövervakning</span>
          </div>

          {/* 4. Snitt Ledtid */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Snitt Ledtid</span>
              <CheckCircle2 className="w-4 h-4 text-purple-400" />
            </div>
            <div className="my-1.5">
              <span className="text-2xl sm:text-3xl font-black text-purple-400">{avgLeadTimeMins}</span>
              <span className="text-slate-400 text-xs ml-1">min / enhet</span>
            </div>
            <span className="text-[11px] text-slate-400">Från start till färdig pack</span>
          </div>
        </div>

        {/* Quick Scan / Move toolbar */}
        <form onSubmit={handleQuickAdvance} className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-slate-400">Snabbflytt:</span>
          <input
            type="text"
            value={quickScanInput}
            onChange={(e) => setQuickScanInput(e.target.value)}
            placeholder="Skanna eller skriv ordernr (t.ex. ORD-8038)..."
            className="flex-1 min-w-[200px] bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
          <select
            value={quickStationId || stations[0]?.id}
            onChange={(e) => setQuickStationId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
          >
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code}: {s.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!quickScanInput.trim()}
            className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Skicka till station
          </button>
        </form>
      </div>

      {/* Production Pipeline Stations (Kanban Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {stations.map((station, sIdx) => {
          const stationOrders = orders.filter(
            (o) => o.currentStationId === station.id && (station.orderIndex === stations.length - 1 || o.status === 'active')
          );
          const style = colorStyles[station.color] || colorStyles.sky;
          const isFinal = sIdx === stations.length - 1;

          return (
            <div
              key={station.id}
              className={`bg-slate-900 border rounded-2xl p-3.5 flex flex-col min-h-[460px] shadow-sm ${style.border}`}
            >
              {/* Station Column Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${style.badge}`}>
                      {station.code}
                    </span>
                    <h3 className="font-bold text-white text-sm leading-tight">{station.name}</h3>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{station.description}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
                  {stationOrders.length}
                </span>
              </div>

              {/* Station Target Info */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2 px-1">
                <span>Måltid: {station.targetCycleMinutes} min</span>
                {onOpenScannerForStation && (
                  <button
                    onClick={() => onOpenScannerForStation(station.id)}
                    className="text-sky-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>Skanna här</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Orders in this station */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                {stationOrders.length === 0 ? (
                  <div className="h-44 border border-dashed border-slate-800/80 rounded-xl flex flex-col items-center justify-center text-slate-500 text-xs p-4 text-center">
                    <span>Inga ordrar vid stationen just nu</span>
                    <span className="text-[10px] text-slate-600 mt-1">Skanna för att flytta hit</span>
                  </div>
                ) : (
                  stationOrders.map((order) => {
                    const minutesAtStation = Math.max(
                      1,
                      Math.round((Date.now() - order.updatedAt) / (1000 * 60))
                    );
                    const isOvertime =
                      !isFinal && minutesAtStation > station.targetCycleMinutes * 1.5;

                    return (
                      <div
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className={`p-3 bg-slate-950/80 border rounded-xl cursor-pointer hover:border-slate-700 transition-all group ${
                          isOvertime ? 'border-rose-500/50 shadow-sm shadow-rose-500/10' : 'border-slate-800/90'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <span className="font-mono font-bold text-xs text-white group-hover:text-sky-400 transition-colors">
                            {order.orderNumber}
                          </span>
                          {order.priority === 'urgent' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300">
                              BRÅDSKANDE
                            </span>
                          )}
                          {order.priority === 'high' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                              HÖG
                            </span>
                          )}
                          {isFinal && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" /> Klar
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-300 font-medium truncate mb-2">
                          {order.articleName}
                        </div>

                        {/* Order timing and operator footer */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-900">
                          <span className={`flex items-center gap-1 ${isOvertime ? 'text-rose-400 font-bold' : ''}`}>
                            <Clock className="w-3 h-3" />
                            {minutesAtStation} min
                          </span>
                          <span className="truncate max-w-[100px] text-slate-500">
                            {order.history[order.history.length - 1]?.operatorName || 'Operatör'}
                          </span>
                        </div>

                        {/* Advance to next button */}
                        {!isFinal && sIdx < stations.length - 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextStation = stations[sIdx + 1];
                              advanceOrderThroughStation(order.orderNumber, nextStation.id, 'VMD Tavla');
                              refreshData();
                            }}
                            title={`Flytta till nästa station (${stations[sIdx + 1].name})`}
                            className="w-full mt-2 py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center justify-center gap-1 transition-colors"
                          >
                            <span>Vidare till {stations[sIdx + 1].code}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Order Details & Audit Trail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-5 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="font-mono text-xs text-sky-400 font-semibold">{selectedOrder.orderNumber}</span>
                <h3 className="font-bold text-white text-base leading-tight">{selectedOrder.articleName}</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-1 py-4 overflow-y-auto space-y-4">
              {/* Info chips */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase">Batch</span>
                  <span className="font-mono text-white font-semibold">{selectedOrder.batch || '-'}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase">Total ledtid</span>
                  <span className="text-white font-semibold">
                    {Math.round((selectedOrder.updatedAt - selectedOrder.createdAt) / (1000 * 60))} minuter
                  </span>
                </div>
              </div>

              {/* Station Flow History */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                  Stationshistorik & Cykeltider (MAS-Light)
                </h4>
                <div className="space-y-2 border-l-2 border-slate-800 ml-2 pl-3">
                  {selectedOrder.history.map((step, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-sky-400" />
                      <div className="bg-slate-950 border border-slate-800/80 p-2.5 rounded-xl text-xs">
                        <div className="flex items-center justify-between font-semibold text-white">
                          <span>{step.stationName}</span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {new Date(step.timestamp).toLocaleTimeString('sv-SE')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                          <span>Operatör: {step.operatorName}</span>
                          {step.durationMinutes && (
                            <span className="text-emerald-400 font-medium">Tid: {step.durationMinutes} min</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
              {onGenerateQr && (
                <button
                  onClick={() => {
                    onGenerateQr(selectedOrder.orderNumber);
                    setSelectedOrder(null);
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <QrCode className="w-4 h-4 text-sky-400" />
                  Visa QR-kod
                </button>
              )}
              <button
                onClick={() => setSelectedOrder(null)}
                className="ml-auto px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Stäng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

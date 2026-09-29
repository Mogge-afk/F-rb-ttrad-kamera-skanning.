import React, { useState } from 'react';
import { ScanRecord } from '../utils/types';
import { Search, Trash2, Download, Copy, Check, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ScanHistoryProps {
  scans: ScanRecord[];
  onClear: () => void;
  onDeleteRecord: (id: string) => void;
}

export const ScanHistory: React.FC<ScanHistoryProps> = ({
  scans,
  onClear,
  onDeleteRecord,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredScans = scans.filter((s) =>
    s.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const copyCode = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // fallback
    }
  };

  const exportCsv = () => {
    if (!scans.length) return;
    let csv = 'Nr,Tidpunkt,Kod,Status,Antal Förekomster\n';
    scans.forEach((s, idx) => {
      const time = new Date(s.timestamp).toLocaleString('sv-SE');
      const escapedVal = `"${s.value.replace(/"/g, '""')}"`;
      const status = s.isDuplicate ? 'Duplikat' : 'Godkänd';
      const times = s.duplicateTimes || 1;
      csv += `${scans.length - idx},"${time}",${escapedVal},${status},${times}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skanningar_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    if (!scans.length) return;
    const dataStr = JSON.stringify(scans, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skanningar_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <h3 className="font-semibold text-white text-sm">
            Skanningshistorik ({scans.length})
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {scans.length > 0 && (
            <>
              <button
                onClick={exportCsv}
                title="Exportera till CSV-kalkylblad"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                CSV
              </button>
              <button
                onClick={exportJson}
                title="Exportera som JSON"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                JSON
              </button>
              <button
                onClick={onClear}
                title="Rensa historik"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-xs text-rose-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Rensa
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search Input */}
      {scans.length > 3 && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Sök bland skannade koder..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      )}

      {/* List */}
      <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60 pr-1 space-y-1">
        {filteredScans.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            {scans.length === 0
              ? 'Inga koder har skannats än. Tryck på Starta kamera eller gör en testskanning!'
              : 'Inga koder matchade din sökning.'}
          </div>
        ) : (
          filteredScans.map((item) => {
            const timeStr = new Date(item.timestamp).toLocaleTimeString('sv-SE', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            const isCopied = copiedId === item.id;

            return (
              <div
                key={item.id}
                className="pt-2 pb-2 flex items-center justify-between gap-3 group hover:bg-slate-800/30 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {item.isDuplicate ? (
                    <span className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 shrink-0" title="Duplikat!">
                      <AlertTriangle className="w-4 h-4" />
                    </span>
                  ) : (
                    <span className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 shrink-0" title="Ny och godkänd kod">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-100 truncate select-all">
                        {item.value}
                      </span>
                      {item.isDuplicate && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 shrink-0">
                          DUP {item.duplicateTimes && item.duplicateTimes > 1 ? `x${item.duplicateTimes}` : ''}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500">{timeStr}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => copyCode(item.id, item.value)}
                    title="Kopiera kod"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => onDeleteRecord(item.id)}
                    title="Ta bort från lista"
                    className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

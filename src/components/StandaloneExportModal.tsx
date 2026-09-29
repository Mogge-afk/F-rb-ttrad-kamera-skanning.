import React, { useState } from 'react';
import { X, Download, Copy, Check, FileCode, CheckCircle, HelpCircle } from 'lucide-react';
import { generateStandaloneHtml } from '../utils/standaloneHtml';

interface StandaloneExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StandaloneExportModal: React.FC<StandaloneExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const htmlCode = generateStandaloneHtml();

  const handleDownload = () => {
    const blob = new Blob([htmlCode], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'qr_scanner_standalone.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(htmlCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Fristående Ren HTML-fil</h3>
              <p className="text-xs text-slate-400">
                100% självgående fil — öppna direkt i mobil eller dator utan installation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Explaining Why The User's Original HTML Failed */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-xl p-4 text-xs space-y-2.5 text-slate-300">
            <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
              <HelpCircle className="w-4 h-4" />
              Varför din ursprungliga HTML-kod inte fungerade som förväntat:
            </div>
            <ul className="list-disc list-inside space-y-1.5 pl-1 text-slate-300">
              <li>
                <strong className="text-white">Krasch på dator:</strong> Att begära{' '}
                <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300">
                  facingMode: &quot;environment&quot;
                </code>{' '}
                kraschar webbkameror på bärbara datorer med{' '}
                <em>OverconstrainedError</em>, eftersom datorer saknar bakkamera.
              </li>
              <li>
                <strong className="text-white">Html5Qrcode och dolda modaler:</strong> När popupen var{' '}
                <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300">hidden</code> kunde inte
                biblioteket mäta storleken på behållaren (#reader = 0x0 pixlar), vilket gav svarta bildrutor.
              </li>
              <li>
                <strong className="text-white">Safari / iOS begränsningar:</strong> Mobilkamera kräver{' '}
                <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300">playsinline</code> och{' '}
                <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300">muted</code> för att inte
                låsa sig eller försöka ta över i helskärmsläge.
              </li>
              <li>
                <strong className="text-white">Ljudpolicy:</strong> Webbläsare pausar AudioContext tills
                användaren klickat på sidan.
              </li>
              <li>
                <strong className="text-white">Dublettskanningar i samma sekund:</strong> Saknade cooldown,
                vilket gjorde att samma QR-kod triggade 20 dubletter direkt när kameran siktades.
              </li>
            </ul>
            <div className="pt-1 text-emerald-400 flex items-center gap-1.5 font-medium">
              <CheckCircle className="w-4 h-4" />
              Allt detta är nu helt åtgärdat i denna färdiga HTML-lösning nedan!
            </div>
          </div>

          {/* Code preview */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span>Förhandsvisning av källkoden:</span>
              <span>ca 420 rader (All CSS + JS inkluderat)</span>
            </div>
            <pre className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-slate-300 max-h-56 overflow-y-auto leading-relaxed select-all">
              {htmlCode.slice(0, 1600)}
              {'\n... [hela koden laddas ner vid klick på knappen] ...'}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-end gap-2.5">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Kopierat till urklipp!' : 'Kopiera hela HTML-koden'}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all"
          >
            <Download className="w-4 h-4" />
            Ladda ner som .html fil
          </button>
        </div>
      </div>
    </div>
  );
};

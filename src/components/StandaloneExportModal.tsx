import React, { useState } from 'react';
import { X, Download, Copy, Check, FileCode, CheckCircle, Github, HelpCircle, ExternalLink } from 'lucide-react';
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
    a.download = 'index.html';
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
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Fristående HTML för GitHub & Mobil</h3>
              <p className="text-xs text-slate-400">
                100% självgående fil — bord-till-kök kedja med kamera som fungerar direkt
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

        {/* GitHub Instructions Guide */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs space-y-3">
            <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
              <Github className="w-4 h-4" />
              Så får du den att fungera direkt på GitHub Pages (steg för steg):
            </div>
            <ol className="list-decimal list-inside space-y-2 text-slate-300 leading-relaxed">
              <li>
                <strong className="text-white">Ladda ner filen som `index.html`:</strong> Klicka på den gröna knappen{' '}
                <em>&quot;Ladda ner index.html&quot;</em> nedan.
              </li>
              <li>
                <strong className="text-white">Ladda upp till ditt GitHub-repository:</strong> Lägg filen i roten av
                ditt repository på GitHub (så att den heter <code className="bg-slate-900 text-sky-300 px-1 py-0.5 rounded">index.html</code>).
              </li>
              <li>
                <strong className="text-white">Aktivera GitHub Pages (Viktigaste steget för kameran!):</strong>
                <p className="pl-4 pt-1 text-slate-400">
                  Gå till ditt repo på GitHub ➔ Klicka på <strong>Settings</strong> ➔ Klicka på <strong>Pages</strong> i
                  vänstermenyn ➔ Välj <strong>Branch: main</strong> och mapp <strong>/ (root)</strong> ➔ Klicka på{' '}
                  <strong>Save</strong>.
                </p>
              </li>
              <li>
                <strong className="text-white">Kameratillstånd & HTTPS:</strong> Webbläsare på mobiler (Safari och Chrome)
                kräver strikt <strong>HTTPS</strong> för att ge kameratillstånd. GitHub Pages ger dig automatiskt en säker{' '}
                <code className="bg-slate-900 text-emerald-300 px-1 py-0.5 rounded">https://dittnamn.github.io/repo/</code> adress där servitriser kan öppna sidan och använda kameran direkt!
              </li>
            </ol>
            <div className="pt-2 text-emerald-400 flex items-center gap-1.5 font-medium border-t border-slate-800">
              <CheckCircle className="w-4 h-4" />
              Denna fil innehåller all CSS, JavaScript och kamerastöd i ett enda block utan externa beroenden!
            </div>
          </div>

          {/* Code preview snippet */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span>Förhandsvisning av koden:</span>
              <span>index.html (ca 390 rader)</span>
            </div>
            <pre className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-slate-300 max-h-48 overflow-y-auto leading-relaxed select-all">
              {htmlCode.slice(0, 1200)}
              {'\n... [klicka nedan för att ladda ner hela filen] ...'}
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
            {copied ? 'Kopierat!' : 'Kopiera kod'}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-sky-600/20 transition-all"
          >
            <Download className="w-4 h-4" />
            Ladda ner index.html för GitHub
          </button>
        </div>
      </div>
    </div>
  );
};

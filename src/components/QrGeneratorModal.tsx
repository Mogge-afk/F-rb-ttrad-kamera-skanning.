import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { X, Sparkles, Download, Copy, Check, QrCode } from 'lucide-react';

interface QrGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInjectCode?: (code: string) => void;
}

export const QrGeneratorModal: React.FC<QrGeneratorModalProps> = ({
  isOpen,
  onClose,
  onInjectCode,
}) => {
  const [text, setText] = useState<string>('BILJETT-9824');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!text.trim()) {
      setQrDataUrl('');
      return;
    }

    QRCode.toDataURL(text, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error(err));
  }, [text]);

  const generateRandom = () => {
    const prefixes = ['BILJETT', 'VIP-PASS', 'ENTRE', 'KUND', 'PRODUKT', 'ORD'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    setText(`${prefix}-${num}`);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // fallback
    }
  };

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qr_${text.replace(/[^a-z0-9_-]/gi, '_')}.png`;
    a.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-base">Generera QR-kod för test</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Text, kod eller URL att koda in
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Skriv in testvärde..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            <button
              onClick={generateRandom}
              title="Slumpa testbiljett"
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-xl border border-slate-700 text-xs font-medium flex items-center gap-1 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Slumpa
            </button>
          </div>
        </div>

        {/* QR Code Canvas Card */}
        <div className="bg-white rounded-xl p-4 flex flex-col items-center justify-center mb-4 shadow-inner">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Genererad QR-kod" className="w-52 h-52 object-contain" />
          ) : (
            <div className="w-52 h-52 flex items-center justify-center text-slate-400 text-sm">
              Skriv en text ovan
            </div>
          )}
          <span className="font-mono text-slate-800 font-bold text-xs mt-2 truncate max-w-full">
            {text}
          </span>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={downloadQr}
            disabled={!qrDataUrl}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
          >
            <Download className="w-4 h-4" />
            Ladda ner PNG
          </button>

          <button
            onClick={copyToClipboard}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Kopierat!' : 'Kopiera text'}
          </button>

          {onInjectCode && (
            <button
              onClick={() => {
                onInjectCode(text);
                onClose();
              }}
              className="col-span-2 mt-1 flex items-center justify-center gap-1.5 py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Skanna denna kod direkt i appen
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

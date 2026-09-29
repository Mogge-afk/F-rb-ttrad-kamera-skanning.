/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Volume2,
  VolumeX,
  Vibrate,
  Smartphone,
  Sparkles,
  FileCode,
  QrCode,
  Layers,
  UploadCloud,
  Check,
  Zap,
} from 'lucide-react';
import { CameraScannerModal } from './components/CameraScannerModal';
import { QrGeneratorModal } from './components/QrGeneratorModal';
import { StandaloneExportModal } from './components/StandaloneExportModal';
import { ScanHistory } from './components/ScanHistory';
import { playSuccessBeep, playDuplicateBuzz, triggerVibration } from './utils/audio';
import { ScanRecord, ScannerSettings } from './utils/types';
import jsQR from 'jsqr';

export default function App() {
  const [manualInput, setManualInput] = useState('');
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [dupCount, setDupCount] = useState(0);
  const [lastStatus, setLastStatus] = useState<{
    type: 'idle' | 'ok' | 'dup';
    code: string;
    time: string;
  }>({
    type: 'idle',
    code: 'Väntar på skanning...',
    time: '',
  });

  // Settings
  const [settings, setSettings] = useState<ScannerSettings>({
    soundEnabled: true,
    vibrateEnabled: true,
    continuousMode: false,
    cooldownMs: 1500,
    beepPitch: 880,
  });

  // Modals
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // File drop
  const [isDragging, setIsDragging] = useState(false);
  const dropzoneFileInputRef = useRef<HTMLInputElement>(null);

  // Load saved scans from localStorage if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem('qr_scans_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setScans(parsed);
          const dups = parsed.reduce(
            (acc, curr) => acc + (curr.duplicateTimes ? curr.duplicateTimes - 1 : 0),
            0
          );
          setDupCount(dups);
          setTotalAttempts(parsed.length + dups);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Save scans to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('qr_scans_data', JSON.stringify(scans.slice(0, 500)));
    } catch {
      // ignore
    }
  }, [scans]);

  // Core scan processing logic
  const handleProcessScan = (code: string) => {
    if (!code || typeof code !== 'string') return;
    const cleanCode = code.trim();
    if (!cleanCode) return;

    setTotalAttempts((prev) => prev + 1);

    // Check if code exists in history
    const existingIndex = scans.findIndex((s) => s.value.toLowerCase() === cleanCode.toLowerCase());
    const isDuplicate = existingIndex !== -1;
    const timeNow = new Date().toLocaleTimeString('sv-SE');

    if (isDuplicate) {
      setDupCount((prev) => prev + 1);
      setLastStatus({
        type: 'dup',
        code: cleanCode,
        time: timeNow,
      });

      // Sound and haptics
      if (settings.soundEnabled) playDuplicateBuzz(220, 180);
      if (settings.vibrateEnabled) triggerVibration('duplicate');

      // Update existing record with incremented count
      setScans((prev) => {
        const updated = [...prev];
        const item = updated[existingIndex];
        const newTimes = (item.duplicateTimes || 1) + 1;
        updated[existingIndex] = {
          ...item,
          duplicateTimes: newTimes,
          isDuplicate: true,
        };
        // Move to top of history
        const [moved] = updated.splice(existingIndex, 1);
        return [moved, ...updated];
      });
    } else {
      setLastStatus({
        type: 'ok',
        code: cleanCode,
        time: timeNow,
      });

      // Sound and haptics
      if (settings.soundEnabled) playSuccessBeep(settings.beepPitch, 120);
      if (settings.vibrateEnabled) triggerVibration('success');

      // Confetti for successful scan
      try {
        confetti({
          particleCount: 28,
          spread: 45,
          origin: { y: 0.7 },
          colors: ['#10b981', '#34d399', '#38bdf8'],
        });
      } catch {
        // ignore
      }

      // Add new record
      const newRecord: ScanRecord = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        value: cleanCode,
        timestamp: Date.now(),
        isDuplicate: false,
        duplicateTimes: 1,
      };

      setScans((prev) => [newRecord, ...prev]);
    }
  };

  // Manual input submission
  const handleManualScan = () => {
    if (!manualInput.trim()) return;
    handleProcessScan(manualInput.trim());
    setManualInput('');
  };

  // Test scan with random / duplicate values
  const handleTestScan = () => {
    const samples = [
      'BILJETT-A101',
      'VIP-LOGE-04',
      'ENTRE-NORR-99',
      'MEDLEM-7732',
      'PASS-GOLD-12',
    ];
    // 35% chance to pick an already scanned code if available to demonstrate duplicate warning
    if (scans.length > 0 && Math.random() < 0.45) {
      const existingRandom = scans[Math.floor(Math.random() * scans.length)].value;
      handleProcessScan(existingRandom);
    } else {
      const randomSample = samples[Math.floor(Math.random() * samples.length)];
      handleProcessScan(randomSample);
    }
  };

  // Clear all scans
  const handleClearHistory = () => {
    if (scans.length === 0) return;
    if (window.confirm('Är du säker på att du vill rensa all historik och nollställa räknare?')) {
      setScans([]);
      setTotalAttempts(0);
      setDupCount(0);
      setLastStatus({
        type: 'idle',
        code: 'Väntar på skanning...',
        time: '',
      });
      try {
        localStorage.removeItem('qr_scans_data');
      } catch {
        // ignore
      }
    }
  };

  // Delete single record
  const handleDeleteRecord = (id: string) => {
    setScans((prev) => prev.filter((item) => item.id !== id));
  };

  // Drag and drop image scan
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processImageFile(files[0]);
    }
  };

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Vänligen välj en giltig bildfil (PNG, JPG, WebP etc).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const qr = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: 'attemptBoth',
        });

        if (qr && qr.data) {
          handleProcessScan(qr.data);
        } else {
          alert('Kunde inte identifiera någon QR-kod i bilden. Kontrollera skärpa och ljus.');
        }
      };
      img.src = evt.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Top Banner / Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 text-slate-950 shadow-md shadow-emerald-500/20">
              <QrCode className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="font-bold text-white text-base sm:text-lg leading-tight flex items-center gap-1.5">
                QR Scan Pro
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live
                </span>
              </h1>
              <p className="text-xs text-slate-400">Desktop & Mobil med duplikatkontroll</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsGeneratorOpen(true)}
              title="Generera test-QR kod"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <Sparkles className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsExportModalOpen(true)}
              title="Hämta som ren HTML-fil"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 text-xs font-semibold transition-colors"
            >
              <FileCode className="w-4 h-4" />
              <span className="hidden sm:inline">Ren HTML</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-5 flex flex-col gap-4">
        {/* Primary Action Button - Start Camera */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={() => setIsCameraOpen(true)}
            className="flex-1 py-4 px-6 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-slate-950 font-black text-base sm:text-lg rounded-2xl shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2.5 transition-all transform active:scale-[0.98] cursor-pointer"
          >
            <Camera className="w-6 h-6 stroke-[2.5]" />
            <span>Starta Bakkamera (Lampa & Zoom)</span>
          </button>

          <a
            href="/scanner.html"
            target="_blank"
            rel="noopener noreferrer"
            className="py-3.5 px-5 bg-slate-900 hover:bg-slate-800 border border-sky-500/30 text-sky-400 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            title="Öppna den rena HTML-sidan i ny flik"
          >
            <FileCode className="w-5 h-5 text-sky-400" />
            <span>Öppna /scanner.html</span>
          </a>
        </div>

        {/* Feature badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-400">
          <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-medium">
            📷 Endast bakkameror (front exkluderad)
          </span>
          <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-medium">
            🔦 Fungerande ficklampa (torch)
          </span>
          <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-medium">
            🔍 Zoom 1x–5x (hårdvara + digital)
          </span>
        </div>

        {/* Manual Input Field */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col gap-2.5 shadow-sm">
          <label className="text-xs font-medium text-slate-400 flex items-center justify-between">
            <span>Manuell scanning eller streckkodsläsare (USB/Bluetooth)</span>
            <span className="text-[11px] text-slate-500">Tryck Enter</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleManualScan();
              }}
              placeholder="Scanna eller skriv kod här..."
              className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white rounded-xl px-4 py-3 text-sm placeholder-slate-500 focus:outline-none transition-colors"
            />
            <button
              onClick={handleManualScan}
              disabled={!manualInput.trim()}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-emerald-400 font-semibold text-sm rounded-xl transition-all cursor-pointer"
            >
              Registrera
            </button>
          </div>
        </div>

        {/* Quick Test & Desktop Dropzone */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleTestScan}
            className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Kör Test-skanning</span>
          </button>
          <button
            onClick={() => setIsGeneratorOpen(true)}
            className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-sky-400" />
            <span>Skapa Test-QR</span>
          </button>
        </div>

        {/* Drag & Drop File Zone (Great for desktop webcams or screenshots) */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => dropzoneFileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-3 text-center transition-all cursor-pointer flex items-center justify-center gap-2 text-xs ${
            isDragging
              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
              : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 text-slate-400 hover:text-slate-200'
          }`}
        >
          <UploadCloud className="w-4 h-4 text-slate-400" />
          <span>Dra och släpp bild med QR-kod hit, eller klicka för att ladda upp</span>
          <input
            ref={dropzoneFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processImageFile(file);
              e.target.value = '';
            }}
          />
        </div>

        {/* Live Status Hero Card */}
        <div
          className={`rounded-2xl border p-5 text-center transition-all duration-300 shadow-xl ${
            lastStatus.type === 'ok'
              ? 'bg-emerald-950/40 border-emerald-500/60 shadow-emerald-950/40'
              : lastStatus.type === 'dup'
              ? 'bg-rose-950/40 border-rose-500/60 shadow-rose-950/40 animate-[shake_0.4s_ease-in-out]'
              : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-center mb-2">
            {lastStatus.type === 'ok' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-sm">
                <CheckCircle2 className="w-4 h-4" />
                GODKÄND (NY KOD)
              </span>
            )}
            {lastStatus.type === 'dup' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 text-white font-bold text-xs uppercase tracking-wider shadow-sm">
                <AlertTriangle className="w-4 h-4" />
                DUPLIKAT! REDAN SKANNAD
              </span>
            )}
            {lastStatus.type === 'idle' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-400 font-medium text-xs">
                Kamera redo
              </span>
            )}
          </div>

          <div
            className={`font-mono text-xl sm:text-2xl font-bold truncate max-w-full px-2 ${
              lastStatus.type === 'ok'
                ? 'text-emerald-300'
                : lastStatus.type === 'dup'
                ? 'text-rose-300'
                : 'text-slate-400'
            }`}
          >
            {lastStatus.code}
          </div>

          {lastStatus.time && (
            <div className="text-xs text-slate-400 mt-1 font-mono">
              Registrerad kl. {lastStatus.time}
            </div>
          )}
        </div>

        {/* Counter Statistics Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 text-center">
            <div className="text-2xl sm:text-3xl font-black text-white">{totalAttempts}</div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
              Totalt
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 text-center">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">{scans.length}</div>
            <div className="text-[11px] font-semibold text-emerald-400/80 uppercase tracking-wider mt-0.5">
              Unika Godkända
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 text-center">
            <div className="text-2xl sm:text-3xl font-black text-rose-400">{dupCount}</div>
            <div className="text-[11px] font-semibold text-rose-400/80 uppercase tracking-wider mt-0.5">
              Dubletter
            </div>
          </div>
        </div>

        {/* Quick Controls Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            {/* Sound Toggle */}
            <button
              onClick={() => setSettings((s) => ({ ...s, soundEnabled: !s.soundEnabled }))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-colors ${
                settings.soundEnabled
                  ? 'bg-slate-800 text-slate-200 border-slate-700'
                  : 'bg-slate-950 text-slate-500 border-slate-800'
              }`}
            >
              {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
              <span>{settings.soundEnabled ? 'Ljud på' : 'Tyst'}</span>
            </button>

            {/* Vibrate Toggle */}
            <button
              onClick={() => setSettings((s) => ({ ...s, vibrateEnabled: !s.vibrateEnabled }))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-colors ${
                settings.vibrateEnabled
                  ? 'bg-slate-800 text-slate-200 border-slate-700'
                  : 'bg-slate-950 text-slate-500 border-slate-800'
              }`}
            >
              <Vibrate className="w-4 h-4 text-sky-400" />
              <span>{settings.vibrateEnabled ? 'Vibration på' : 'Vibration av'}</span>
            </button>
          </div>

          {/* Continuous Mode Toggle */}
          <button
            onClick={() => setSettings((s) => ({ ...s, continuousMode: !s.continuousMode }))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-colors ${
              settings.continuousMode
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-semibold'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
            title="I kontinuerligt läge förblir kameran igång mellan skanningar"
          >
            <Layers className="w-4 h-4" />
            <span>{settings.continuousMode ? 'Kontinuerlig skanning' : 'Enkelt läge'}</span>
          </button>
        </div>

        {/* Scan History Component */}
        <ScanHistory
          scans={scans}
          onClear={handleClearHistory}
          onDeleteRecord={handleDeleteRecord}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-3 text-center text-xs text-slate-500">
        <div className="max-w-2xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-1">
          <span>Stödjer Chrome, Safari, Edge, Firefox på Desktop, iOS & Android</span>
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="text-sky-400 hover:underline cursor-pointer"
          >
            Ladda ner fristående .html fil
          </button>
        </div>
      </footer>

      {/* Camera Scanner Modal */}
      <CameraScannerModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onScan={handleProcessScan}
        continuousMode={settings.continuousMode}
      />

      {/* QR Code Generator Modal */}
      <QrGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        onInjectCode={handleProcessScan}
      />

      {/* Standalone Pure HTML Exporter Modal */}
      <StandaloneExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
}

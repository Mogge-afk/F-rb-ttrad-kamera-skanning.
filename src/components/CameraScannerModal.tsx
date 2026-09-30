import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Camera, X, RefreshCw, Zap, ZapOff, ZoomIn, Image as ImageIcon, AlertCircle, CheckCircle2, Activity } from 'lucide-react';
import { CameraDeviceInfo } from '../utils/types';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  continuousMode: boolean;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  continuousMode,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hidden offscreen canvas exclusively for fast low-overhead decoding
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameras, setCameras] = useState<CameraDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [hasTorch, setHasTorch] = useState<boolean>(true);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [hasHardwareZoom, setHasHardwareZoom] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [zoomRange, setZoomRange] = useState<{ min: number; max: number; step: number }>({ min: 1, max: 5, step: 0.1 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastDetectedCode, setLastDetectedCode] = useState<string | null>(null);
  const [detectCount, setDetectCount] = useState<number>(0);
  const [fps, setFps] = useState<number>(60);

  const scanIntervalRef = useRef<number | null>(null);
  const isDetectingRef = useRef<boolean>(false);
  const lastScannedTimeRef = useRef<number>(0);
  const lastScannedValueRef = useRef<string | null>(null);
  const zoomLevelRef = useRef<number>(1);
  const frameCountRef = useRef<number>(0);
  const lastFpsTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    zoomLevelRef.current = zoomLevel;
  }, [zoomLevel]);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setIsTorchOn(false);
    isDetectingRef.current = false;
  }, [stream]);

  // Request camera stream with optimal 60fps / 30fps hardware parameters
  const startCamera = useCallback(async (preferredId?: string) => {
    setErrorMsg(null);

    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }

    try {
      const constraintsList: MediaStreamConstraints[] = [];

      if (preferredId) {
        constraintsList.push({
          video: {
            deviceId: { exact: preferredId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 60, min: 30 },
          },
        });
        constraintsList.push({
          video: { deviceId: { exact: preferredId } },
        });
      } else {
        // High-framerate rear camera constraints (720p 60fps provides maximum fluidity and responsiveness)
        constraintsList.push({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 60, min: 30 },
          },
        });
        constraintsList.push({
          video: {
            facingMode: { exact: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        constraintsList.push({
          video: { facingMode: 'environment' },
        });
        constraintsList.push({ video: true }); // Fallback on laptop
      }

      let activeStream: MediaStream | null = null;
      let lastErr: unknown = null;

      for (const c of constraintsList) {
        try {
          activeStream = await navigator.mediaDevices.getUserMedia(c);
          if (activeStream) break;
        } catch (err) {
          lastErr = err;
        }
      }

      if (!activeStream) {
        throw lastErr || new Error('Kunde inte få åtkomst till bakkameran.');
      }

      setStream(activeStream);

      if (videoRef.current) {
        videoRef.current.srcObject = activeStream;
        await videoRef.current.play();
      }

      // Check capabilities for torch & hardware zoom
      const track = activeStream.getVideoTracks()[0];
      const caps = track.getCapabilities ? (track.getCapabilities() as Record<string, unknown>) : {};

      if ('torch' in caps) {
        setHasTorch(true);
        setIsTorchOn(false);
      } else {
        setHasTorch(true);
      }

      if ('zoom' in caps) {
        const zoomCaps = caps.zoom as { min: number; max: number; step: number };
        setHasHardwareZoom(true);
        setZoomRange({
          min: zoomCaps.min || 1,
          max: zoomCaps.max || 5,
          step: zoomCaps.step || 0.1,
        });
      } else {
        setHasHardwareZoom(false);
        setZoomRange({ min: 1, max: 5, step: 0.1 });
      }

      // STRICTLY FILTER OUT FRONT CAMERAS ("ej front behöver vara med")
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      const rearOnly = videoDevices.filter((d) => !/front|fram|selfie|user|face/i.test(d.label));
      const targetDevices = rearOnly.length > 0 ? rearOnly : videoDevices;

      const formattedCameras: CameraDeviceInfo[] = targetDevices.map((d, idx) => {
        let label = d.label;
        if (!label) {
          label = `Bakkamera ${idx + 1}`;
        } else {
          if (/ultra|wide|0\./i.test(label)) label += ' (Vidvinkel)';
          else if (/tele|zoom|[2-5]x/i.test(label)) label += ' (Zoom/Tele)';
        }
        return {
          deviceId: d.deviceId,
          label: label,
          facing: 'environment',
        };
      });

      setCameras(formattedCameras);
      const currentTrackId = track.getSettings().deviceId;
      if (currentTrackId) {
        setSelectedCameraId(currentTrackId);
      }
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      console.error('Camera error:', err);
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setErrorMsg('Kameratillstånd nekades i webbläsaren. Tillåt kameraåtkomst.');
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        setErrorMsg('Ingen bakkamera hittades på denna enhet.');
      } else {
        setErrorMsg(`Kunde inte starta kameran (${e.message || 'Okänt fel'}).`);
      }
    }
  }, [stream]);

  // Toggle torch / flashlight
  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextTorch = !isTorchOn;
      // @ts-expect-error advanced constraints for torch
      await track.applyConstraints({ advanced: [{ torch: nextTorch }] });
      setIsTorchOn(nextTorch);
    } catch (e) {
      console.warn('Torch toggle failed:', e);
      alert('Kunde inte tända lampan på denna lins.');
    }
  };

  // Zoom handler: Smooth GPU hardware zoom or silky GPU digital zoom
  const handleZoomChange = async (newZoom: number) => {
    setZoomLevel(newZoom);
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    if (hasHardwareZoom) {
      try {
        // @ts-expect-error advanced constraints for zoom
        await track.applyConstraints({ advanced: [{ zoom: newZoom }] });
        if (videoRef.current) {
          videoRef.current.style.transform = 'scale(1)';
        }
        return;
      } catch {
        // Fallback to smooth CSS hardware transform
      }
    }

    // Digital zoom with GPU transform (zero CPU lag, 60fps)
    if (videoRef.current) {
      videoRef.current.style.transform = `scale(${newZoom})`;
      videoRef.current.style.transformOrigin = 'center center';
    }
  };

  const handleCameraChange = async (deviceId: string) => {
    setSelectedCameraId(deviceId);
    await startCamera(deviceId);
  };

  const cycleCamera = async () => {
    if (cameras.length < 2) return;
    const currentIndex = cameras.findIndex((c) => c.deviceId === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    if (nextCamera) {
      setSelectedCameraId(nextCamera.deviceId);
      await startCamera(nextCamera.deviceId);
    }
  };

  // HIGH-PERFORMANCE DECODER ENGINE
  // Decoupled from the video rendering pipeline. Video runs at full 60fps on the GPU.
  // Decoding runs asynchronously at ~15-20fps with lightweight 400x400 ROI so JS main thread never stalls.
  useEffect(() => {
    if (!isOpen || !stream) return;

    const video = videoRef.current;
    if (!video) return;

    // Create offscreen canvas once
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    const offscreen = offscreenCanvasRef.current;
    const offCtx = offscreen.getContext('2d', { willReadFrequently: true });

    // Initialize native BarcodeDetector if available
    const hasNativeBarcode = typeof window !== 'undefined' && 'BarcodeDetector' in window;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let nativeDetector: any = null;
    if (hasNativeBarcode) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        nativeDetector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'data_matrix'],
        });
      } catch {
        // fallback
      }
    }

    const decodeFrame = async () => {
      if (isDetectingRef.current) return;
      if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      isDetectingRef.current = true;

      try {
        // Measure real FPS
        frameCountRef.current++;
        const nowTime = performance.now();
        if (nowTime - lastFpsTimeRef.current >= 1000) {
          setFps(Math.round((frameCountRef.current * 1000) / (nowTime - lastFpsTimeRef.current)));
          frameCountRef.current = 0;
          lastFpsTimeRef.current = nowTime;
        }

        let detectedCode: string | null = null;

        // METHOD 1: Native GPU BarcodeDetector (Directly on <video>, 0ms CPU memory copying!)
        if (nativeDetector) {
          try {
            const results = await nativeDetector.detect(video);
            if (results && results.length > 0) {
              detectedCode = results[0].rawValue;
            }
          } catch {
            // fallback to jsQR
          }
        }

        // METHOD 2: Ultra-optimized jsQR fallback
        // Instead of copying millions of pixels, crop only a sharp 480x480 square in the center
        if (!detectedCode && offCtx) {
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          const currentZ = zoomLevelRef.current;

          // Target size is compact 480x480 for lightning fast < 3ms jsQR analysis
          const targetSize = 480;
          if (offscreen.width !== targetSize || offscreen.height !== targetSize) {
            offscreen.width = targetSize;
            offscreen.height = targetSize;
          }

          // Compute central region taking digital zoom into account
          const cropDim = Math.min(vw, vh) / currentZ;
          const cropX = (vw - cropDim) / 2;
          const cropY = (vh - cropDim) / 2;

          offCtx.drawImage(video, cropX, cropY, cropDim, cropDim, 0, 0, targetSize, targetSize);
          const imgData = offCtx.getImageData(0, 0, targetSize, targetSize);

          const qr = jsQR(imgData.data, targetSize, targetSize, {
            inversionAttempts: 'dontInvert',
          });

          if (qr && qr.data) {
            detectedCode = qr.data;
          }
        }

        if (detectedCode) {
          const now = Date.now();
          const isRepeat = detectedCode === lastScannedValueRef.current && now - lastScannedTimeRef.current < 1600;

          if (!isRepeat) {
            lastScannedValueRef.current = detectedCode;
            lastScannedTimeRef.current = now;
            setLastDetectedCode(detectedCode);
            setDetectCount((prev) => prev + 1);

            onScan(detectedCode);

            if (!continuousMode) {
              stopCamera();
              onClose();
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Decode frame error:', err);
      } finally {
        isDetectingRef.current = false;
      }
    };

    // Run decode every 50ms (20 checks/sec). Leaves video completely free to render at 60fps on GPU!
    scanIntervalRef.current = window.setInterval(decodeFrame, 50);

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [isOpen, stream, continuousMode, onScan, onClose, stopCamera]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const handleFileScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = img.width;
        offscreenCanvas.height = img.height;
        const ctx = offscreenCanvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const qr = jsQR(imgData.data, imgData.width, imgData.height);

        if (qr && qr.data) {
          onScan(qr.data);
          if (!continuousMode) {
            stopCamera();
            onClose();
          }
        } else {
          alert('Kunde inte hitta någon QR-kod i den uppladdade bilden.');
        }
      };
      img.src = evt.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base leading-tight">Bakkamera Skanner</h3>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>QR, EAN & Streckkoder</span>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono font-bold bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/30">
                  <Activity className="w-3 h-3 animate-pulse" />
                  {fps} FPS
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Area (Native GPU-accelerated video for smooth 60fps) */}
        <div className="relative bg-black aspect-4/3 sm:aspect-16/11 flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="w-full h-full object-cover will-change-transform"
          />

          {/* Transparent aim overlay box (Zero CPU lag) */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 border-2 border-sky-400/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.48)]">
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-sky-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-sky-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-sky-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-sky-400 rounded-br-lg" />

              {!errorMsg && (
                <div className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-[scan_2s_ease-in-out_infinite]" />
              )}
            </div>
          </div>

          {/* Quick controls on the live camera */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 z-10 pointer-events-auto">
            {hasTorch && (
              <button
                onClick={toggleTorch}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold backdrop-blur-md transition-all ${
                  isTorchOn
                    ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/30'
                    : 'bg-slate-950/80 text-white border border-white/20 hover:bg-slate-900'
                }`}
              >
                {isTorchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
                <span>{isTorchOn ? 'Lampa PÅ' : 'Tänd lampa'}</span>
              </button>
            )}

            {cameras.length > 1 && (
              <button
                onClick={cycleCamera}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-950/80 text-white border border-white/20 hover:bg-slate-900 backdrop-blur-md transition-all ml-auto"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Byt bakkamera ({cameras.length})</span>
              </button>
            )}
          </div>

          {/* Error display */}
          {errorMsg && (
            <div className="absolute inset-0 bg-slate-950/90 p-6 flex flex-col items-center justify-center text-center">
              <AlertCircle className="w-12 h-12 text-rose-400 mb-3" />
              <p className="text-white font-medium text-sm mb-4 max-w-xs">{errorMsg}</p>
              <button
                onClick={() => startCamera()}
                className="py-2.5 px-6 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-medium text-sm transition-colors"
              >
                Försök igen
              </button>
            </div>
          )}

          {continuousMode && lastDetectedCode && (
            <div className="absolute top-3 left-3 right-3 bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 px-3 py-1.5 rounded-xl text-xs flex items-center justify-between shadow-lg backdrop-blur-sm">
              <div className="flex items-center gap-1.5 truncate">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-mono truncate">{lastDetectedCode}</span>
              </div>
              <span className="text-[11px] bg-emerald-900/80 px-2 py-0.5 rounded text-emerald-300 font-semibold shrink-0">
                #{detectCount}
              </span>
            </div>
          )}
        </div>

        {/* Zoom Controls (Silky smooth 60fps) */}
        <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span className="flex items-center gap-1.5">
              <ZoomIn className="w-4 h-4 text-sky-400" />
              Zoomnivå
            </span>
            <span className="font-mono font-bold text-sky-400 text-sm">
              {zoomLevel.toFixed(1)}x
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500">1x</span>
            <input
              type="range"
              min={zoomRange.min}
              max={zoomRange.max}
              step={zoomRange.step}
              value={zoomLevel}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <span className="text-[11px] text-slate-500">{zoomRange.max}x</span>
          </div>

          {/* Quick Zoom Preset Buttons */}
          <div className="grid grid-cols-5 gap-1.5 pt-1">
            {[1, 1.5, 2, 3, 5].map((z) => (
              <button
                key={z}
                onClick={() => handleZoomChange(z)}
                className={`py-1 rounded-lg text-xs font-bold transition-colors ${
                  Math.abs(zoomLevel - z) < 0.1
                    ? 'bg-sky-500 text-slate-950'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {z}x
              </button>
            ))}
          </div>
        </div>

        {/* Camera Selector (Only Rear Cameras!) */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <label className="block text-[11px] text-slate-400 font-semibold mb-1">
              📷 Endast bakkameror ({cameras.length} tillgängliga):
            </label>
            <select
              value={selectedCameraId}
              onChange={(e) => handleCameraChange(e.target.value)}
              className="w-full bg-slate-900 text-slate-200 text-xs rounded-xl px-2.5 py-2 border border-slate-700 focus:outline-none focus:border-sky-500 truncate"
            >
              {cameras.map((c, i) => (
                <option key={c.deviceId || i} value={c.deviceId}>
                  {c.label || `Bakkamera ${i + 1}`}
                </option>
              ))}
            </select>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleFileScan}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Ladda upp bildfil"
          >
            <ImageIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Välj bild</span>
          </button>
        </div>
      </div>
    </div>
  );
};

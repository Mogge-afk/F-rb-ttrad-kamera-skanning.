import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Camera, X, RefreshCw, Zap, ZapOff, ZoomIn, Image as ImageIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [isScanning, setIsScanning] = useState<boolean>(false);

  const animFrameRef = useRef<number | null>(null);
  const lastScannedTimeRef = useRef<number>(0);
  const lastScannedValueRef = useRef<string | null>(null);
  const zoomLevelRef = useRef<number>(1);

  // Keep ref in sync for requestAnimationFrame
  useEffect(() => {
    zoomLevelRef.current = zoomLevel;
  }, [zoomLevel]);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setIsTorchOn(false);
    setIsScanning(false);
  }, [stream]);

  // Request camera stream with strict preference for rear/back camera
  const startCamera = useCallback(async (preferredId?: string) => {
    setErrorMsg(null);
    setIsScanning(true);

    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }

    try {
      const constraintsList: MediaStreamConstraints[] = [];

      if (preferredId) {
        constraintsList.push({
          video: {
            deviceId: { exact: preferredId },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
          },
        });
        constraintsList.push({
          video: { deviceId: { exact: preferredId } },
        });
      } else {
        // Enforce rear / back camera ('environment')
        constraintsList.push({
          video: {
            facingMode: { exact: 'environment' },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
          },
        });
        constraintsList.push({
          video: {
            facingMode: { ideal: 'environment' },
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
        // Some mobile browsers don't expose torch in getCapabilities until stream warmed up
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
        // Digital zoom fallback always available!
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
      setIsScanning(false);
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

  // Zoom handler: Supports both hardware zoom & digital fallback
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
      } catch (e) {
        console.warn('Hardware zoom failed, falling back to digital zoom:', e);
      }
    }

    // Digital zoom fallback
    if (videoRef.current) {
      videoRef.current.style.transform = `scale(${newZoom})`;
      videoRef.current.style.transformOrigin = 'center center';
    }
  };

  // Switch camera between rear lenses
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

  // Scan frame processing loop with BarcodeDetector + jsQR
  useEffect(() => {
    if (!isOpen || !stream) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Check BarcodeDetector native API (Scans QR + Barcodes!)
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

    let lastScanTime = 0;

    const tick = async (timestamp: number) => {
      if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      const currentZ = zoomLevelRef.current;
      // Handle digital zoom cropping on canvas so scanned area matches what user sees
      if (!hasHardwareZoom && currentZ > 1) {
        const sw = video.videoWidth / currentZ;
        const sh = video.videoHeight / currentZ;
        const sx = (video.videoWidth - sw) / 2;
        const sy = (video.videoHeight - sh) / 2;
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      // Check codes ~15-20 times per second
      if (timestamp - lastScanTime > 60) {
        lastScanTime = timestamp;
        let detectedCode: string | null = null;
        let qrLocation: { topLeftCorner: { x: number; y: number }; topRightCorner: { x: number; y: number }; bottomRightCorner: { x: number; y: number }; bottomLeftCorner: { x: number; y: number } } | null = null;

        // 1. Try BarcodeDetector (handles QR, EAN-13, Code 128, UPC etc)
        if (nativeDetector) {
          try {
            const results = await nativeDetector.detect(canvas);
            if (results && results.length > 0) {
              detectedCode = results[0].rawValue;
            }
          } catch {
            // fallback
          }
        }

        // 2. jsQR Fallback for QR codes
        if (!detectedCode) {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qr = jsQR(imgData.data, imgData.width, imgData.height, {
            inversionAttempts: 'dontInvert',
          });
          if (qr) {
            detectedCode = qr.data;
            qrLocation = qr.location;
          }
        }

        // Draw bounding box if found
        if (qrLocation) {
          ctx.beginPath();
          ctx.moveTo(qrLocation.topLeftCorner.x, qrLocation.topLeftCorner.y);
          ctx.lineTo(qrLocation.topRightCorner.x, qrLocation.topRightCorner.y);
          ctx.lineTo(qrLocation.bottomRightCorner.x, qrLocation.bottomRightCorner.y);
          ctx.lineTo(qrLocation.bottomLeftCorner.x, qrLocation.bottomLeftCorner.y);
          ctx.closePath();
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#10b981';
          ctx.stroke();
        }

        if (detectedCode) {
          const now = Date.now();
          const isRepeat = detectedCode === lastScannedValueRef.current && (now - lastScannedTimeRef.current < 1600);

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
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isOpen, stream, continuousMode, onScan, onClose, stopCamera, hasHardwareZoom]);

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
              <p className="text-xs text-slate-400">QR, EAN & Streckkoder</p>
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

        {/* Viewfinder Area */}
        <div className="relative bg-black aspect-4/3 sm:aspect-16/11 flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="w-full h-full object-cover transition-transform duration-150"
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none object-cover"
          />

          {/* Aim Box */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 border-2 border-sky-400/70 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-sky-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-sky-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-sky-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-sky-400 rounded-br-lg" />

              {isScanning && !errorMsg && (
                <div className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-[scan_2s_ease-in-out_infinite]" />
              )}
            </div>
          </div>

          {/* Overlay Quick Buttons for Lamp & Camera Switch */}
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

        {/* Zoom Controls (Hardware + Digital) */}
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

          {/* Image file upload */}
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

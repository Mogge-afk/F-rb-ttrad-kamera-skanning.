// Generates a bulletproof, 100% standalone, single-file HTML document
// that fixes all issues from the user's original HTML code.
// Works seamlessly on Desktop (webcam, image drop, manual) and Mobile (rear camera, torch, haptics).

export function generateStandaloneHtml(): string {
  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>QR Scan Pro - Desktop & Mobil</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }
    .container {
      width: 100%;
      max-width: 480px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    h1 {
      font-size: 24px;
      text-align: center;
      font-weight: 700;
      color: #38bdf8;
      margin-bottom: 4px;
    }
    .subtitle {
      text-align: center;
      font-size: 13px;
      color: #94a3b8;
      margin-bottom: 8px;
    }
    .input-group {
      display: flex;
      gap: 8px;
    }
    input[type="text"] {
      flex: 1;
      padding: 14px 16px;
      font-size: 16px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      color: #fff;
      outline: none;
      transition: border-color 0.2s;
    }
    input[type="text"]:focus {
      border-color: #38bdf8;
      box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
    }
    .btn {
      padding: 14px 18px;
      font-size: 15px;
      font-weight: 600;
      border-radius: 12px;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.15s ease;
      touch-action: manipulation;
    }
    .btn:active { transform: scale(0.98); }
    .btn-primary { background: #0284c7; color: white; }
    .btn-primary:hover { background: #0369a1; }
    .btn-camera { background: #10b981; color: #022c22; font-weight: 700; font-size: 17px; }
    .btn-camera:hover { background: #059669; }
    .btn-secondary { background: #334155; color: #e2e8f0; }
    .btn-secondary:hover { background: #475569; }
    .btn-danger { background: #ef4444; color: white; }
    
    .status-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 14px;
      padding: 16px;
      text-align: center;
      transition: all 0.3s ease;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .status-idle { background: #334155; color: #cbd5e1; }
    .status-ok { background: #059669; color: #ecfdf5; box-shadow: 0 0 15px rgba(16, 185, 129, 0.4); }
    .status-dup { background: #dc2626; color: #fef2f2; box-shadow: 0 0 15px rgba(239, 68, 68, 0.4); }

    .status-text {
      font-size: 20px;
      font-weight: 700;
      word-break: break-all;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
    }
    .stat-box {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 10px;
      text-align: center;
    }
    .stat-num { font-size: 20px; font-weight: 800; color: #f8fafc; }
    .stat-lbl { font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 600; }

    .history-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 14px;
      padding: 14px;
      max-height: 280px;
      overflow-y: auto;
    }
    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      font-size: 14px;
      font-weight: 600;
      color: #94a3b8;
    }
    .history-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 8px;
      border-bottom: 1px solid #334155;
      font-size: 14px;
      gap: 8px;
    }
    .history-item:last-child { border-bottom: none; }
    .history-val {
      font-family: monospace;
      font-weight: 600;
      color: #f1f5f9;
      word-break: break-all;
    }
    .tag-dup {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      white-space: nowrap;
    }
    .tag-ok {
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      white-space: nowrap;
    }

    /* Modal */
    .modal {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px;
      z-index: 1000;
    }
    .modal[hidden] { display: none !important; }
    .modal-box {
      width: 100%;
      max-width: 440px;
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 18px;
      padding: 16px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .modal-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .modal-title { font-size: 18px; font-weight: 700; }
    .btn-close {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #334155;
      color: #fff;
      border: none;
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .video-container {
      position: relative;
      width: 100%;
      aspect-ratio: 4/3;
      border-radius: 12px;
      overflow: hidden;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    .scan-guide {
      position: absolute;
      width: 65%;
      height: 65%;
      border: 2px solid rgba(56, 189, 248, 0.6);
      border-radius: 14px;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.45);
      pointer-events: none;
    }
    .scan-laser {
      position: absolute;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, transparent, #38bdf8, #10b981, transparent);
      box-shadow: 0 0 8px #38bdf8;
      animation: scanLaser 2s infinite ease-in-out;
    }
    @keyframes scanLaser {
      0% { top: 5%; opacity: 0.2; }
      50% { top: 90%; opacity: 1; }
      100% { top: 5%; opacity: 0.2; }
    }

    .modal-tools {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 12px;
    }
    .torch-active {
      background: #f59e0b !important;
      color: #000 !important;
      font-weight: 700;
    }
    .cam-info {
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
      margin-top: 8px;
      min-height: 16px;
    }
    .file-dropzone {
      border: 2px dashed #475569;
      border-radius: 12px;
      padding: 12px;
      text-align: center;
      font-size: 13px;
      color: #94a3b8;
      cursor: pointer;
      margin-top: 4px;
    }
    .file-dropzone:hover {
      border-color: #38bdf8;
      color: #e2e8f0;
    }
  </style>
  <!-- Inkluderar jsqr via cdnjs (pålitligt, rent, inga moduler krävs) -->
  <script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js"></script>
</head>
<body>

<div class="container">
  <h1>QR Scan Demo</h1>
  <p class="subtitle">Fungerar på alla webbläsare (Desktop + Mobil)</p>

  <div class="input-group">
    <input id="qrInput" type="text" placeholder="Scanna eller skriv kod här...">
    <button onclick="scanManual()" class="btn btn-primary">Registrera</button>
  </div>

  <button onclick="startScanner()" class="btn btn-camera">📷 Starta Kamera</button>

  <div style="display: flex; gap: 8px;">
    <button onclick="fakeScan()" class="btn btn-secondary" style="flex:1">🎲 Test-skanning</button>
    <button onclick="exportHistory()" class="btn btn-secondary" style="flex:1">💾 Exportera CSV</button>
  </div>

  <div id="dropZone" class="file-dropzone" onclick="document.getElementById('fileInput').click()">
    📁 Klicka eller dra en QR-bild hit för att skanna från dator/galleri
    <input type="file" id="fileInput" accept="image/*" style="display:none" onchange="handleFileSelect(event)">
  </div>

  <!-- Statuskort -->
  <div class="status-card" id="statusCard">
    <div id="statusBadge" class="status-badge status-idle">Väntar...</div>
    <div id="statusText" class="status-text">-</div>
  </div>

  <!-- Räknare -->
  <div class="stats-grid">
    <div class="stat-box">
      <div id="statTotal" class="stat-num">0</div>
      <div class="stat-lbl">Totalt</div>
    </div>
    <div class="stat-box">
      <div id="statUnique" class="stat-num" style="color: #34d399;">0</div>
      <div class="stat-lbl">Unika</div>
    </div>
    <div class="stat-box">
      <div id="statDups" class="stat-num" style="color: #f87171;">0</div>
      <div class="stat-lbl">Dubletter</div>
    </div>
  </div>

  <!-- Historiklista -->
  <div class="history-card">
    <div class="history-header">
      <span>Senaste skanningar</span>
      <button onclick="clearHistory()" style="background:none; border:none; color:#f87171; font-size:12px; cursor:pointer;">Rensa allt</button>
    </div>
    <div id="historyList">
      <div style="text-align: center; color: #64748b; font-size: 13px; padding: 20px;">Inga skanningar ännu</div>
    </div>
  </div>
</div>

<!-- Kamera Modal -->
<div id="camModal" class="modal" hidden>
  <div class="modal-box">
    <div class="modal-head">
      <div class="modal-title">Skanna QR-kod</div>
      <button class="btn-close" onclick="stopScanner()">✕</button>
    </div>
    
    <div class="video-container">
      <video id="video" playsinline muted autoplay></video>
      <canvas id="qrCanvas"></canvas>
      <div class="scan-guide">
        <div class="scan-laser"></div>
      </div>
    </div>

    <div class="modal-tools">
      <button id="switchBtn" class="btn btn-secondary" onclick="switchCamera()">🔄 Byt kamera</button>
      <button id="torchBtn" class="btn btn-secondary" onclick="toggleTorch()" style="display:none">🔦 Ficklampa</button>
    </div>

    <div id="camInfo" class="cam-info">Initierar kamera...</div>
  </div>
</div>

<script>
// SCANNING STATE
let scans = [];
let scanCount = 0;
let dupCount = 0;
let currentStream = null;
let currentTrack = null;
let currentDeviceId = null;
let availableCameras = [];
let animFrameId = null;
let isTorchOn = false;
let lastScannedCode = null;
let lastScannedTime = 0;

// AUDIO CONTEXT
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function beep(freq, duration, type = 'sine') {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration / 1000);
  } catch(e) {}
}

function playOk() {
  beep(880, 120, 'sine');
  if (navigator.vibrate) navigator.vibrate(80);
}

function playDup() {
  beep(220, 200, 'sawtooth');
  setTimeout(() => beep(180, 160, 'sawtooth'), 120);
  if (navigator.vibrate) navigator.vibrate([100, 60, 140]);
}

// LOGIK FÖR SKANNING
function processScan(code) {
  if (!code || typeof code !== 'string') return;
  code = code.trim();
  if (!code) return;

  const exists = scans.includes(code);
  scanCount++;

  const statusCard = document.getElementById("statusCard");
  const statusBadge = document.getElementById("statusBadge");
  const statusText = document.getElementById("statusText");

  if (exists) {
    dupCount++;
    statusBadge.className = "status-badge status-dup";
    statusBadge.innerText = "DUPLIKAT!";
    statusText.innerText = code;
    playDup();
  } else {
    scans.push(code);
    statusBadge.className = "status-badge status-ok";
    statusBadge.innerText = "GODKÄND (NY)";
    statusText.innerText = code;
    playOk();
  }

  updateUI(code, exists);
}

function scanManual() {
  const input = document.getElementById("qrInput");
  if (!input.value.trim()) return;
  processScan(input.value.trim());
  input.value = "";
}

document.getElementById("qrInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") scanManual();
});

function fakeScan() {
  const sampleCodes = ["BILJETT-104", "BILJETT-502", "VIP-PASS-9", "ENTRE-88", "KUND-412"];
  const randomCode = sampleCodes[Math.floor(Math.random() * sampleCodes.length)];
  processScan(randomCode);
}

function updateUI(code, isDup) {
  document.getElementById("statTotal").innerText = scanCount;
  document.getElementById("statUnique").innerText = scans.length;
  document.getElementById("statDups").innerText = dupCount;

  const list = document.getElementById("historyList");
  if (scanCount === 1) list.innerHTML = "";

  const item = document.createElement("div");
  item.className = "history-item";
  const time = new Date().toLocaleTimeString();

  item.innerHTML = \`
    <div>
      <span style="font-size:12px; color:#94a3b8; margin-right:6px;">\${time}</span>
      <span class="history-val">\${escapeHtml(code)}</span>
    </div>
    \${isDup ? '<span class="tag-dup">DUBLIKAT</span>' : '<span class="tag-ok">NY KOD</span>'}
  \`;

  list.prepend(item);
  if (list.children.length > 25) list.removeChild(list.lastChild);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}

function clearHistory() {
  if (!confirm("Vill du rensa alla skanningar?")) return;
  scans = [];
  scanCount = 0;
  dupCount = 0;
  document.getElementById("statTotal").innerText = "0";
  document.getElementById("statUnique").innerText = "0";
  document.getElementById("statDups").innerText = "0";
  document.getElementById("statusBadge").className = "status-badge status-idle";
  document.getElementById("statusBadge").innerText = "Väntar...";
  document.getElementById("statusText").innerText = "-";
  document.getElementById("historyList").innerHTML = '<div style="text-align: center; color: #64748b; font-size: 13px; padding: 20px;">Inga skanningar ännu</div>';
}

function exportHistory() {
  if (!scans.length) {
    alert("Inga skanningar att exportera.");
    return;
  }
  let csv = "Nr,Kod,Status\\n";
  scans.forEach((val, idx) => {
    csv += \`\${idx + 1},"\${val.replace(/"/g, '""')}",Godkänd\\n\`;
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = \`qr_skanningar_\${new Date().toISOString().slice(0,10)}.csv\`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------- KAMERA HANTERING FÖR DESKTOP & MOBIL ----------------
async function startScanner() {
  document.getElementById("camModal").hidden = false;
  document.getElementById("camInfo").innerText = "Startar kameran...";
  getAudioCtx(); // Förbered ljud

  try {
    await setupCamerasAndStream();
  } catch (err) {
    document.getElementById("camInfo").innerText = "Kamerafel: " + err.message;
    console.error(err);
  }
}

async function getCameraStream(preferredDeviceId = null) {
  // Stoppa föregående ström
  if (currentStream) {
    currentStream.getTracks().forEach(t => t.stop());
  }

  // Försök 1: Ideal environment (mobil bakkamera) eller specifik vald kamera
  const constraintsList = [];
  if (preferredDeviceId) {
    constraintsList.push({ video: { deviceId: { exact: preferredDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } });
    constraintsList.push({ video: { deviceId: { exact: preferredDeviceId } } });
  } else {
    // Mobil: bakkamera, Desktop: fungerar ändå tack vare 'ideal'
    constraintsList.push({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } });
    constraintsList.push({ video: { facingMode: { ideal: "environment" } } });
    constraintsList.push({ video: true }); // Absolut reserv för gamla webbkameror
  }

  let stream = null;
  for (let c of constraintsList) {
    try {
      stream = await navigator.mediaDevices.getUserMedia(c);
      if (stream) break;
    } catch(e) {}
  }

  if (!stream) {
    throw new Error("Kunde inte starta någon kamera. Kontrollera behörigheter.");
  }

  return stream;
}

async function setupCamerasAndStream(deviceId = null) {
  const stream = await getCameraStream(deviceId);
  currentStream = stream;
  currentTrack = stream.getVideoTracks()[0];

  const video = document.getElementById("video");
  video.srcObject = stream;
  await video.play();

  // Identifiera enheter
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    availableCameras = devices.filter(d => d.kind === 'videoinput');
  } catch(e) {}

  currentDeviceId = currentTrack.getSettings ? currentTrack.getSettings().deviceId : null;
  const label = currentTrack.label || (availableCameras.length > 1 ? "Kamera" : "Webbkamera");
  document.getElementById("camInfo").innerText = \`Aktiv: \${label}\`;

  // Torch / Ficklampa
  const torchBtn = document.getElementById("torchBtn");
  const caps = currentTrack.getCapabilities ? currentTrack.getCapabilities() : {};
  if (caps.torch) {
    torchBtn.style.display = "inline-flex";
    isTorchOn = false;
    torchBtn.className = "btn btn-secondary";
    torchBtn.innerText = "🔦 Ficklampa PÅ";
  } else {
    torchBtn.style.display = "none";
  }

  startScanningLoop();
}

async function switchCamera() {
  if (availableCameras.length < 2) {
    // Försök hämta enheter igen
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      availableCameras = devices.filter(d => d.kind === 'videoinput');
    } catch(e) {}
  }

  if (availableCameras.length < 2) {
    alert("Hittade endast 1 kamera på den här enheten.");
    return;
  }

  let currentIndex = availableCameras.findIndex(c => c.deviceId === currentDeviceId);
  let nextIndex = (currentIndex + 1) % availableCameras.length;
  let nextCamera = availableCameras[nextIndex];

  document.getElementById("camInfo").innerText = "Byter kamera...";
  await setupCamerasAndStream(nextCamera.deviceId);
}

async function toggleTorch() {
  if (!currentTrack) return;
  const torchBtn = document.getElementById("torchBtn");
  try {
    isTorchOn = !isTorchOn;
    await currentTrack.applyConstraints({ advanced: [{ torch: isTorchOn }] });
    torchBtn.className = isTorchOn ? "btn btn-secondary torch-active" : "btn btn-secondary";
    torchBtn.innerText = isTorchOn ? "🔦 Ficklampa AV" : "🔦 Ficklampa PÅ";
  } catch(err) {
    alert("Kunde inte tända lampan: " + err.message);
  }
}

function stopScanner() {
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
  if (currentStream) {
    currentStream.getTracks().forEach(t => t.stop());
    currentStream = null;
    currentTrack = null;
  }
  document.getElementById("camModal").hidden = true;
}

// SKANNINGSLOOP MED BÅDE JSQR & NATIVE BARCODEDETECTOR
function startScanningLoop() {
  const video = document.getElementById("video");
  const canvas = document.getElementById("qrCanvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  const hasBarcodeDetector = ('BarcodeDetector' in window);
  let barcodeDetector = null;
  if (hasBarcodeDetector) {
    try {
      barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code', 'ean_13', 'code_128'] });
    } catch(e) {}
  }

  let lastDetectTime = 0;

  async function tick(timestamp) {
    if (!video.videoWidth || !video.videoHeight) {
      animFrameId = requestAnimationFrame(tick);
      return;
    }

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    // Rita ramen till canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Kör avkodning ~15 gånger per sekund för optimal prestanda
    if (timestamp - lastDetectTime > 70) {
      lastDetectTime = timestamp;
      let foundCode = null;

      // 1. Prova native BarcodeDetector om tillgänglig
      if (barcodeDetector) {
        try {
          const barcodes = await barcodeDetector.detect(canvas);
          if (barcodes.length > 0) {
            foundCode = barcodes[0].rawValue;
          }
        } catch(e) {}
      }

      // 2. Fallback till jsQR
      if (!foundCode && typeof jsQR === 'function') {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert"
        });
        if (code) {
          foundCode = code.data;
        }
      }

      if (foundCode) {
        const now = Date.now();
        // Cooldown på 1.5 sekunder för samma kod så den inte piper 30 ggr i sekunden
        if (foundCode !== lastScannedCode || (now - lastScannedTime > 1500)) {
          lastScannedCode = foundCode;
          lastScannedTime = now;
          processScan(foundCode);
          // Stäng popupen efter lyckad skanning
          stopScanner();
          return;
        }
      }
    }

    animFrameId = requestAnimationFrame(tick);
  }

  animFrameId = requestAnimationFrame(tick);
}

// BILDUPPLADDNING (DESKTOP & MOBIL UTAN KAMERA)
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  scanImageFile(file);
}

function scanImageFile(file) {
  const reader = new FileReader();
  reader.onload = function(evt) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      if (typeof jsQR === 'function') {
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          processScan(code.data);
          return;
        }
      }
      alert("Hittade ingen QR-kod i bilden. Prova en tydligare bild.");
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

// Drag & drop stöd på desktop
const dropZone = document.getElementById("dropZone");
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
});
dropZone.addEventListener('drop', (e) => {
  const dt = e.dataTransfer;
  const files = dt.files;
  if (files.length) scanImageFile(files[0]);
});

// Escape-tangent stänger kameran
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") stopScanner();
});
</script>

</body>
</html>`;
}

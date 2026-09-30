// Generates the rock-solid, single-file HTML scanner
// Specifically optimized for maximum 60 FPS performance, low CPU usage, working Lamp/Torch,
// silky-smooth Zoom, and camera switching with ONLY rear/back cameras.

export function generateStandaloneHtml(): string {
  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>QR & Streckkodsläsare - Hög FPS Bakkamera med Lampa & Zoom</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #090d16;
      color: #f1f5f9;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px 10px 40px;
    }
    .wrapper { width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: 12px; }
    header { text-align: center; padding: 4px 0 6px; }
    h1 { font-size: 22px; font-weight: 800; color: #38bdf8; letter-spacing: -0.5px; }
    .subhead {
      font-size: 13px;
      color: #94a3b8;
      margin-top: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .fps-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.35);
      color: #34d399;
      font-weight: 700;
      font-family: monospace;
      font-size: 11px;
      padding: 2px 7px;
      border-radius: 9999px;
    }
    .fps-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 6px #10b981;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }

    /* KAMERA VIEWPORT: 100% Hårdvaruaccelererad GPU-video */
    .viewport-card {
      position: relative;
      width: 100%;
      aspect-ratio: 3 / 4;
      max-height: 480px;
      background: #000;
      border-radius: 20px;
      overflow: hidden;
      border: 2px solid #1e293b;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      will-change: transform;
      transform-origin: center center;
    }

    .scanner-aim {
      position: absolute;
      width: 72%;
      height: 55%;
      border: 2px solid rgba(56, 189, 248, 0.8);
      border-radius: 18px;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.45);
      pointer-events: none;
    }
    .laser-line {
      position: absolute;
      left: 6px;
      right: 6px;
      height: 2px;
      background: #38bdf8;
      box-shadow: 0 0 10px #38bdf8, 0 0 18px #0284c7;
      animation: laserScan 2s infinite ease-in-out;
    }
    @keyframes laserScan {
      0% { top: 5%; opacity: 0.2; }
      50% { top: 92%; opacity: 1; }
      100% { top: 5%; opacity: 0.2; }
    }

    .overlay-controls {
      position: absolute;
      bottom: 12px;
      left: 12px;
      right: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      z-index: 5;
    }
    .btn-cam-control {
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      padding: 10px 14px;
      border-radius: 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .btn-cam-control:active { transform: scale(0.96); }
    .torch-active {
      background: #f59e0b !important;
      color: #000 !important;
      border-color: #fbbf24 !important;
      box-shadow: 0 0 15px rgba(245, 158, 11, 0.5);
    }

    /* ZOOM KONTROLLER */
    .zoom-panel {
      background: #131d2e;
      border: 1px solid #1e293b;
      border-radius: 16px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .zoom-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      font-weight: 600;
      color: #94a3b8;
    }
    .zoom-val { color: #38bdf8; font-weight: 700; font-size: 14px; }
    .zoom-row { display: flex; align-items: center; gap: 10px; }
    .zoom-slider {
      flex: 1;
      height: 6px;
      accent-color: #38bdf8;
      background: #1e293b;
      border-radius: 4px;
      outline: none;
    }
    .zoom-presets { display: flex; gap: 6px; }
    .btn-preset {
      flex: 1;
      padding: 7px 0;
      background: #1e293b;
      border: 1px solid #334155;
      color: #e2e8f0;
      font-size: 12px;
      font-weight: 700;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-preset.active { background: #0284c7; border-color: #38bdf8; color: #fff; }

    /* BAKKAMERA PANEL */
    .cam-panel {
      background: #131d2e;
      border: 1px solid #1e293b;
      border-radius: 16px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .cam-label {
      font-size: 12px;
      font-weight: 600;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
    .cam-select {
      width: 100%;
      padding: 11px 12px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 10px;
      color: #f8fafc;
      font-size: 14px;
      outline: none;
    }

    /* STATUS & RÄKNARE */
    .status-card {
      background: #131d2e;
      border: 1px solid #1e293b;
      border-radius: 16px;
      padding: 16px;
      text-align: center;
      transition: all 0.3s;
    }
    .status-badge {
      display: inline-block;
      padding: 5px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    .badge-idle { background: #334155; color: #94a3b8; }
    .badge-ok { background: #10b981; color: #022c22; box-shadow: 0 0 15px rgba(16, 185, 129, 0.4); }
    .badge-dup { background: #ef4444; color: #450a0a; box-shadow: 0 0 15px rgba(239, 68, 68, 0.4); }
    .status-val { font-size: 18px; font-weight: 700; word-break: break-all; min-height: 26px; }

    .counters { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
    .cnt-box { background: #131d2e; border: 1px solid #1e293b; border-radius: 12px; padding: 10px; text-align: center; }
    .cnt-num { font-size: 20px; font-weight: 800; color: #fff; }
    .cnt-txt { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }

    .manual-row { display: flex; gap: 8px; }
    .manual-input {
      flex: 1;
      padding: 12px 14px;
      background: #131d2e;
      border: 1px solid #1e293b;
      border-radius: 12px;
      color: #fff;
      font-size: 14px;
      outline: none;
    }
    .btn-action {
      padding: 12px 16px;
      background: #0284c7;
      color: #fff;
      border: none;
      border-radius: 12px;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
    }

    .history-card { background: #131d2e; border: 1px solid #1e293b; border-radius: 16px; padding: 14px; }
    .history-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 13px; color: #94a3b8; font-weight: 600; }
    .btn-clear { background: none; border: none; color: #ef4444; font-size: 12px; cursor: pointer; }
    .history-list { max-height: 220px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
    .history-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 10px;
      background: #0f172a;
      border-radius: 8px;
      font-size: 13px;
      gap: 8px;
    }
    .item-val { font-family: monospace; font-weight: 600; word-break: break-all; }
    .item-dup { color: #f87171; font-size: 11px; font-weight: 700; }
    .item-ok { color: #34d399; font-size: 11px; font-weight: 700; }
    #camMsg { font-size: 12px; color: #f59e0b; text-align: center; min-height: 16px; }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js"></script>
</head>
<body>

<div class="wrapper">
  <header>
    <h1>QR & Streckkodsläsare</h1>
    <div class="subhead">
      <span>Endast bakkamera • Lampa & Zoom</span>
      <span class="fps-badge">
        <span class="fps-dot"></span>
        <span id="fpsNum">60</span> FPS
      </span>
    </div>
  </header>

  <div class="viewport-card">
    <video id="video" playsinline muted autoplay></video>

    <div class="scanner-aim">
      <div class="laser-line"></div>
    </div>

    <div class="overlay-controls">
      <button id="torchBtn" class="btn-cam-control" onclick="toggleTorch()">
        🔦 <span>Lampa PÅ</span>
      </button>

      <button id="switchBtn" class="btn-cam-control" onclick="cycleBackCamera()">
        🔄 <span>Byt bakkamera</span>
      </button>
    </div>
  </div>

  <div id="camMsg">Startar kameran...</div>

  <!-- ZOOM -->
  <div class="zoom-panel">
    <div class="zoom-header">
      <span>🔍 Zoomnivå</span>
      <span id="zoomVal" class="zoom-val">1.0x</span>
    </div>
    <div class="zoom-row">
      <span style="font-size: 12px; color: #64748b;">1x</span>
      <input type="range" id="zoomSlider" class="zoom-slider" min="1" max="5" step="0.1" value="1" oninput="setZoom(this.value)">
      <span id="maxZoomLabel" style="font-size: 12px; color: #64748b;">5x</span>
    </div>
    <div class="zoom-presets">
      <button class="btn-preset active" onclick="setZoom(1)">1x</button>
      <button class="btn-preset" onclick="setZoom(1.5)">1.5x</button>
      <button class="btn-preset" onclick="setZoom(2)">2x</button>
      <button class="btn-preset" onclick="setZoom(3)">3x</button>
      <button class="btn-preset" onclick="setZoom(5)">5x</button>
    </div>
  </div>

  <!-- BAKKAMERA VAL -->
  <div class="cam-panel">
    <div class="cam-label">
      <span>📷 Vald bakkamera (inga frontkameror):</span>
      <span id="camCountLabel" style="color: #38bdf8;">0 hittade</span>
    </div>
    <select id="camSelect" class="cam-select" onchange="onCameraSelected(this.value)">
      <option value="">Söker efter bakkameror...</option>
    </select>
  </div>

  <!-- STATUS -->
  <div class="status-card" id="statusCard">
    <div id="statusBadge" class="status-badge badge-idle">Väntar på kod...</div>
    <div id="statusVal" class="status-val">-</div>
  </div>

  <!-- RÄKNARE -->
  <div class="counters">
    <div class="cnt-box">
      <div id="cntTotal" class="cnt-num">0</div>
      <div class="cnt-txt">Totalt</div>
    </div>
    <div class="cnt-box">
      <div id="cntUnique" class="cnt-num" style="color: #34d399;">0</div>
      <div class="cnt-txt">Godkända</div>
    </div>
    <div class="cnt-box">
      <div id="cntDups" class="cnt-num" style="color: #f87171;">0</div>
      <div class="cnt-txt">Dubletter</div>
    </div>
  </div>

  <!-- MANUELL -->
  <div class="manual-row">
    <input id="manualInput" class="manual-input" type="text" placeholder="Skriv in eller skanna med pistol...">
    <button class="btn-action" onclick="submitManual()">OK</button>
  </div>

  <!-- HISTORIK -->
  <div class="history-card">
    <div class="history-head">
      <span>Senaste skannade koder</span>
      <button class="btn-clear" onclick="clearHistory()">Rensa allt</button>
    </div>
    <div id="historyList" class="history-list">
      <div style="text-align: center; color: #475569; font-size: 12px; padding: 12px;">Inga koder skannade än</div>
    </div>
  </div>
</div>

<script>
let currentStream = null;
let currentTrack = null;
let backCameras = [];
let selectedDeviceId = null;
let isTorchOn = false;
let currentZoom = 1;
let hardwareZoomSupported = false;
let zoomMin = 1;
let zoomMax = 5;
let zoomStep = 0.1;

let scans = [];
let scanCount = 0;
let dupCount = 0;
let lastCode = null;
let lastCodeTime = 0;

let scanIntervalId = null;
let isScanningActive = false;

// FPS
let frameCounter = 0;
let lastFpsTimestamp = performance.now();

// Offscreen canvas för jsQR
let offscreenCanvas = document.createElement("canvas");
let offscreenCtx = offscreenCanvas.getContext("2d", { willReadFrequently: true });

let audioCtx = null;
function getAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playBeep(freq, dur, type = 'sine') {
  try {
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur / 1000);
  } catch(e) {}
}

function onCodeSuccess(code) {
  playBeep(880, 110, 'sine');
  if (navigator.vibrate) navigator.vibrate(80);
}

function onCodeDup(code) {
  playBeep(220, 180, 'sawtooth');
  setTimeout(() => playBeep(180, 160, 'sawtooth'), 100);
  if (navigator.vibrate) navigator.vibrate([90, 60, 120]);
}

function processScan(code) {
  if (!code) return;
  code = code.trim();
  if (!code) return;

  const now = Date.now();
  if (code === lastCode && (now - lastCodeTime < 1800)) {
    return;
  }
  lastCode = code;
  lastCodeTime = now;

  scanCount++;
  const exists = scans.includes(code);

  const card = document.getElementById("statusCard");
  const badge = document.getElementById("statusBadge");
  const val = document.getElementById("statusVal");
  val.innerText = code;

  if (exists) {
    dupCount++;
    badge.className = "status-badge badge-dup";
    badge.innerText = "DUPLIKAT (REDAN SKANNAD!)";
    onCodeDup(code);
  } else {
    scans.push(code);
    badge.className = "status-badge badge-ok";
    badge.innerText = "GODKÄND (NY KOD)";
    onCodeSuccess(code);
  }

  updateUI(code, exists);
}

function updateUI(code, isDup) {
  document.getElementById("cntTotal").innerText = scanCount;
  document.getElementById("cntUnique").innerText = scans.length;
  document.getElementById("cntDups").innerText = dupCount;

  const list = document.getElementById("historyList");
  if (scanCount === 1) list.innerHTML = "";

  const time = new Date().toLocaleTimeString();
  const div = document.createElement("div");
  div.className = "history-item";
  div.innerHTML = \`
    <div>
      <span style="color:#64748b; font-size:11px; margin-right:4px;">\${time}</span>
      <span class="item-val">\${escapeHtml(code)}</span>
    </div>
    <span class="\${isDup ? 'item-dup' : 'item-ok'}">\${isDup ? 'DUPLIKAT' : 'GODKÄND'}</span>
  \`;
  list.prepend(div);
  if (list.children.length > 30) list.removeChild(list.lastChild);
}

function escapeHtml(t) {
  const d = document.createElement("div");
  d.innerText = t;
  return d.innerHTML;
}

function submitManual() {
  const inp = document.getElementById("manualInput");
  if (!inp.value.trim()) return;
  processScan(inp.value.trim());
  inp.value = "";
}
document.getElementById("manualInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") submitManual();
});

function clearHistory() {
  if (!confirm("Vill du nollställa historiken?")) return;
  scans = [];
  scanCount = 0;
  dupCount = 0;
  lastCode = null;
  document.getElementById("cntTotal").innerText = "0";
  document.getElementById("cntUnique").innerText = "0";
  document.getElementById("cntDups").innerText = "0";
  document.getElementById("statusBadge").className = "status-badge badge-idle";
  document.getElementById("statusBadge").innerText = "Väntar på kod...";
  document.getElementById("statusVal").innerText = "-";
  document.getElementById("historyList").innerHTML = '<div style="text-align: center; color: #475569; font-size: 12px; padding: 12px;">Inga koder skannade än</div>';
}

function isFrontCamera(label) {
  if (!label) return false;
  return /front|fram|selfie|user|face/i.test(label);
}

async function discoverBackCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === 'videoinput');
    const filtered = videoDevices.filter(d => !isFrontCamera(d.label));
    backCameras = filtered.length > 0 ? filtered : videoDevices;

    const select = document.getElementById("camSelect");
    select.innerHTML = "";

    backCameras.forEach((cam, index) => {
      const opt = document.createElement("option");
      opt.value = cam.deviceId;
      let label = cam.label;
      if (!label) {
        label = \`Bakkamera \${index + 1}\`;
      } else {
        if (/ultra|wide|0\\./i.test(label)) label += " (Vidvinkel)";
        else if (/tele|zoom|[2-5]x/i.test(label)) label += " (Zoom/Tele)";
      }
      opt.text = label;
      select.appendChild(opt);
    });

    document.getElementById("camCountLabel").innerText = \`\${backCameras.length} bakkamera(or)\`;
    if (selectedDeviceId) {
      select.value = selectedDeviceId;
    }
  } catch(e) {
    console.error("Fel vid kameraupptäckt:", e);
  }
}

async function startCamera(deviceId = null) {
  if (currentStream) {
    currentStream.getTracks().forEach(t => t.stop());
    currentStream = null;
    currentTrack = null;
  }
  if (scanIntervalId) {
    clearInterval(scanIntervalId);
    scanIntervalId = null;
  }

  const msg = document.getElementById("camMsg");
  msg.innerText = "Startar bakkamera med 60 FPS...";

  const constraintsList = [];
  if (deviceId) {
    constraintsList.push({
      video: {
        deviceId: { exact: deviceId },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 60, min: 30 }
      }
    });
    constraintsList.push({ video: { deviceId: { exact: deviceId } } });
  } else {
    constraintsList.push({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 60, min: 30 }
      }
    });
    constraintsList.push({
      video: {
        facingMode: { exact: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    });
    constraintsList.push({ video: { facingMode: "environment" } });
    constraintsList.push({ video: true });
  }

  let stream = null;
  for (let c of constraintsList) {
    try {
      stream = await navigator.mediaDevices.getUserMedia(c);
      if (stream) break;
    } catch(err) {}
  }

  if (!stream) {
    msg.innerText = "Kunde inte öppna kameran. Kontrollera tillstånd!";
    return;
  }

  currentStream = stream;
  currentTrack = stream.getVideoTracks()[0];
  selectedDeviceId = currentTrack.getSettings ? currentTrack.getSettings().deviceId : null;

  const video = document.getElementById("video");
  video.srcObject = stream;
  await video.play();

  await discoverBackCameras();
  initTorchAndZoom();
  msg.innerText = \`Aktiv: \${currentTrack.label || "Bakkamera"}\`;
  startHighFpsDecoder();
}

function onCameraSelected(id) {
  if (!id) return;
  selectedDeviceId = id;
  startCamera(id);
}

function cycleBackCamera() {
  if (backCameras.length < 2) {
    document.getElementById("camMsg").innerText = "Endast en bakkamera upptäckt på denna enhet.";
    return;
  }
  const currentIndex = backCameras.findIndex(c => c.deviceId === selectedDeviceId);
  const nextIndex = (currentIndex + 1) % backCameras.length;
  const nextCam = backCameras[nextIndex];
  if (nextCam) {
    selectedDeviceId = nextCam.deviceId;
    document.getElementById("camSelect").value = nextCam.deviceId;
    startCamera(nextCam.deviceId);
  }
}

function initTorchAndZoom() {
  if (!currentTrack) return;
  const caps = currentTrack.getCapabilities ? currentTrack.getCapabilities() : {};

  const torchBtn = document.getElementById("torchBtn");
  isTorchOn = false;
  torchBtn.className = "btn-cam-control";
  torchBtn.querySelector("span").innerText = "Lampa PÅ";

  torchBtn.style.display = "inline-flex";

  const slider = document.getElementById("zoomSlider");
  if ('zoom' in caps) {
    hardwareZoomSupported = true;
    zoomMin = caps.zoom.min || 1;
    zoomMax = caps.zoom.max || 5;
    zoomStep = caps.zoom.step || 0.1;
    slider.min = zoomMin;
    slider.max = zoomMax;
    slider.step = zoomStep;
    document.getElementById("maxZoomLabel").innerText = \`\${Math.round(zoomMax)}x\`;
  } else {
    hardwareZoomSupported = false;
    zoomMin = 1;
    zoomMax = 5;
    zoomStep = 0.1;
    slider.min = 1;
    slider.max = 5;
  }

  setZoom(1);
}

async function toggleTorch() {
  if (!currentTrack) return;
  const torchBtn = document.getElementById("torchBtn");
  const nextState = !isTorchOn;

  try {
    await currentTrack.applyConstraints({
      advanced: [{ torch: nextState }]
    });
    isTorchOn = nextState;
    if (isTorchOn) {
      torchBtn.className = "btn-cam-control torch-active";
      torchBtn.querySelector("span").innerText = "Lampa AV";
    } else {
      torchBtn.className = "btn-cam-control";
      torchBtn.querySelector("span").innerText = "Lampa PÅ";
    }
  } catch (err) {
    console.warn("Kunde inte ändra lampa:", err);
    document.getElementById("camMsg").innerText = "Ficklampa stöds ej på denna lins.";
  }
}

async function setZoom(val) {
  val = parseFloat(val);
  if (isNaN(val)) return;
  currentZoom = val;

  document.getElementById("zoomSlider").value = val;
  document.getElementById("zoomVal").innerText = \`\${val.toFixed(1)}x\`;

  document.querySelectorAll(".btn-preset").forEach(btn => {
    const pVal = parseFloat(btn.innerText);
    if (Math.abs(pVal - val) < 0.1) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  if (hardwareZoomSupported && currentTrack) {
    try {
      await currentTrack.applyConstraints({
        advanced: [{ zoom: val }]
      });
      document.getElementById("video").style.transform = "scale(1)";
      return;
    } catch(e) {}
  }

  const video = document.getElementById("video");
  video.style.transform = \`scale(\${val})\`;
  video.style.transformOrigin = "center center";
}

function startHighFpsDecoder() {
  if (scanIntervalId) clearInterval(scanIntervalId);

  const video = document.getElementById("video");

  let barcodeDetector = null;
  if ('BarcodeDetector' in window) {
    try {
      barcodeDetector = new window.BarcodeDetector({
        formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'data_matrix']
      });
    } catch(e) {}
  }

  const decodeStep = async () => {
    if (isScanningActive) return;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    isScanningActive = true;

    try {
      frameCounter++;
      const now = performance.now();
      if (now - lastFpsTimestamp >= 1000) {
        const realFps = Math.round((frameCounter * 1000) / (now - lastFpsTimestamp));
        const fpsElem = document.getElementById("fpsNum");
        if (fpsElem) fpsElem.innerText = realFps;
        frameCounter = 0;
        lastFpsTimestamp = now;
      }

      let detectedText = null;

      if (barcodeDetector) {
        try {
          const results = await barcodeDetector.detect(video);
          if (results && results.length > 0) {
            detectedText = results[0].rawValue;
          }
        } catch(e) {}
      }

      if (!detectedText && typeof jsQR === 'function') {
        const targetSize = 480;
        if (offscreenCanvas.width !== targetSize) {
          offscreenCanvas.width = targetSize;
          offscreenCanvas.height = targetSize;
        }

        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const cropDim = Math.min(vw, vh) / currentZoom;
        const cropX = (vw - cropDim) / 2;
        const cropY = (vh - cropDim) / 2;

        offscreenCtx.drawImage(video, cropX, cropY, cropDim, cropDim, 0, 0, targetSize, targetSize);
        const imgData = offscreenCtx.getImageData(0, 0, targetSize, targetSize);
        const code = jsQR(imgData.data, targetSize, targetSize, {
          inversionAttempts: "dontInvert"
        });
        if (code && code.data) {
          detectedText = code.data;
        }
      }

      if (detectedText) {
        processScan(detectedText);
      }
    } catch(err) {
      console.warn("Avkodningsfel:", err);
    } finally {
      isScanningActive = false;
    }
  };

  scanIntervalId = setInterval(decodeStep, 50);
}

window.addEventListener("DOMContentLoaded", () => {
  document.body.addEventListener("click", () => getAudio(), { once: true });
  startCamera();
});
</script>

</body>
</html>`;
}

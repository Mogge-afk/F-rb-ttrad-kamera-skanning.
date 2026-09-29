export interface ScanRecord {
  id: string;
  value: string;
  timestamp: number;
  isDuplicate: boolean;
  duplicateTimes?: number;
}

export interface ScannerSettings {
  soundEnabled: boolean;
  vibrateEnabled: boolean;
  continuousMode: boolean;
  cooldownMs: number;
  beepPitch: number; // default 800
}

export interface CameraDeviceInfo {
  deviceId: string;
  label: string;
  facing: 'environment' | 'user' | 'unknown';
}

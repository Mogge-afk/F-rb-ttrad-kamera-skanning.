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

export interface TableStep {
  stepId: number; // 1, 2, 3, 4
  title: string;
  badge: string;
  iconName: string;
  color: string;
}

export interface TableOrder {
  id: string;
  tableCode: string; // e.g. "Bord 4", "BORD-12"
  currentStep: number; // 1: Beställt, 2: I köket, 3: Klart för servering, 4: Serverat vid bordet
  stepTitle: string;
  createdAt: number;
  updatedAt: number;
  history: Array<{
    step: number;
    stepTitle: string;
    timestamp: number;
    notes?: string;
  }>;
}

export interface ProductionStation {
  id: string;
  name: string;
  code: string;
  description: string;
  color: string; // Tailwind color theme identifier
  orderIndex: number;
  targetCycleMinutes: number;
}

export interface StationStepLog {
  stationId: string;
  stationName: string;
  timestamp: number;
  operatorName: string;
  durationMinutes?: number;
}

export interface ProductionOrder {
  id: string;
  orderNumber: string; // e.g. ORD-1049 or QR code payload
  articleName: string; // e.g. "Stomme A-400"
  batch?: string;
  currentStationId: string;
  createdAt: number;
  updatedAt: number;
  status: 'active' | 'completed' | 'hold';
  history: StationStepLog[];
  priority?: 'normal' | 'high' | 'urgent';
}

export interface VMDShiftGoal {
  dailyTarget: number;
  shiftName: string;
  shiftStartHour: number; // e.g. 7
  shiftEndHour: number; // e.g. 16
}

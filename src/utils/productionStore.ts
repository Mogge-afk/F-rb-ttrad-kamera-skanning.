import { ProductionStation, ProductionOrder, VMDShiftGoal } from './types';

export const DEFAULT_STATIONS: ProductionStation[] = [
  {
    id: 'st_1_prep',
    name: 'Beredning & Klipp',
    code: 'ST-01',
    description: 'Materialplock, kapning och förberedelse',
    color: 'sky',
    orderIndex: 0,
    targetCycleMinutes: 12,
  },
  {
    id: 'st_2_assembly',
    name: 'Montering / Fogning',
    code: 'ST-02',
    description: 'Huvudmontering och komponentfäste',
    color: 'amber',
    orderIndex: 1,
    targetCycleMinutes: 20,
  },
  {
    id: 'st_3_qc',
    name: 'Kvalitetskontroll (QC)',
    code: 'ST-03',
    description: 'Mätning, provtryckning och funktionsverifiering',
    color: 'purple',
    orderIndex: 2,
    targetCycleMinutes: 10,
  },
  {
    id: 'st_4_pack',
    name: 'Pack & Färdigleverans',
    code: 'ST-04',
    description: 'Slutbesiktning, etikettering och paketering',
    color: 'emerald',
    orderIndex: 3,
    targetCycleMinutes: 8,
  },
];

export const DEFAULT_GOAL: VMDShiftGoal = {
  dailyTarget: 40,
  shiftName: 'Dagskift 07:00 - 16:00',
  shiftStartHour: 7,
  shiftEndHour: 16,
};

const STORAGE_KEY_ORDERS = 'mas_vmd_orders_v2';
const STORAGE_KEY_STATIONS = 'mas_vmd_stations_v2';
const STORAGE_KEY_GOALS = 'mas_vmd_goals_v2';

// Create BroadcastChannel for real-time multi-tab / multi-screen sync
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('mas_vmd_sync_channel');
  } catch {
    // fallback
  }
}

export function notifySync() {
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'DATA_UPDATED', timestamp: Date.now() });
    } catch {
      // ignore
    }
  }
}

export function subscribeToSync(callback: () => void): () => void {
  if (!broadcastChannel) {
    // Fallback: storage event
    const handleStorage = (e: StorageEvent) => {
      if (e.key?.startsWith('mas_vmd_')) {
        callback();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }

  const handleMessage = () => {
    callback();
  };

  broadcastChannel.addEventListener('message', handleMessage);
  return () => {
    broadcastChannel?.removeEventListener('message', handleMessage);
  };
}

export function loadStations(): ProductionStation[] {
  if (typeof window === 'undefined') return DEFAULT_STATIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STATIONS);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return DEFAULT_STATIONS;
}

export function saveStations(stations: ProductionStation[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_STATIONS, JSON.stringify(stations));
    notifySync();
  } catch {
    // fallback
  }
}

export function loadGoals(): VMDShiftGoal {
  if (typeof window === 'undefined') return DEFAULT_GOAL;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GOALS);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return DEFAULT_GOAL;
}

export function saveGoals(goal: VMDShiftGoal) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_GOALS, JSON.stringify(goal));
    notifySync();
  } catch {
    // fallback
  }
}

export function loadOrders(): ProductionOrder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ORDERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }

  // Pre-seed with realistic initial production orders for demonstration
  const now = Date.now();
  const sampleOrders: ProductionOrder[] = [
    {
      id: 'ord_1',
      orderNumber: 'ORD-8041',
      articleName: 'Stomme Modell A-40',
      batch: 'B26-09',
      currentStationId: 'st_1_prep',
      createdAt: now - 35 * 60 * 1000,
      updatedAt: now - 12 * 60 * 1000,
      status: 'active',
      priority: 'normal',
      history: [
        {
          stationId: 'st_1_prep',
          stationName: 'Beredning & Klipp',
          timestamp: now - 35 * 60 * 1000,
          operatorName: 'Lars O.',
        },
      ],
    },
    {
      id: 'ord_2',
      orderNumber: 'ORD-8038',
      articleName: 'Panel Profil C-2',
      batch: 'B26-09',
      currentStationId: 'st_2_assembly',
      createdAt: now - 75 * 60 * 1000,
      updatedAt: now - 18 * 60 * 1000,
      status: 'active',
      priority: 'high',
      history: [
        {
          stationId: 'st_1_prep',
          stationName: 'Beredning & Klipp',
          timestamp: now - 75 * 60 * 1000,
          operatorName: 'Lars O.',
          durationMinutes: 22,
        },
        {
          stationId: 'st_2_assembly',
          stationName: 'Montering / Fogning',
          timestamp: now - 18 * 60 * 1000,
          operatorName: 'Anna K.',
        },
      ],
    },
    {
      id: 'ord_3',
      orderNumber: 'ORD-8035',
      articleName: 'Hydraulmodul H-9',
      batch: 'B26-08',
      currentStationId: 'st_3_qc',
      createdAt: now - 110 * 60 * 1000,
      updatedAt: now - 9 * 60 * 1000,
      status: 'active',
      priority: 'normal',
      history: [
        {
          stationId: 'st_1_prep',
          stationName: 'Beredning & Klipp',
          timestamp: now - 110 * 60 * 1000,
          operatorName: 'Lars O.',
          durationMinutes: 18,
        },
        {
          stationId: 'st_2_assembly',
          stationName: 'Montering / Fogning',
          timestamp: now - 52 * 60 * 1000,
          operatorName: 'Anna K.',
          durationMinutes: 34,
        },
        {
          stationId: 'st_3_qc',
          stationName: 'Kvalitetskontroll (QC)',
          timestamp: now - 9 * 60 * 1000,
          operatorName: 'Erik M.',
        },
      ],
    },
    {
      id: 'ord_4',
      orderNumber: 'ORD-8031',
      articleName: 'Chassi X-Heavy',
      batch: 'B26-07',
      currentStationId: 'st_4_pack',
      createdAt: now - 160 * 60 * 1000,
      updatedAt: now - 22 * 60 * 1000,
      status: 'completed',
      priority: 'urgent',
      history: [
        {
          stationId: 'st_1_prep',
          stationName: 'Beredning & Klipp',
          timestamp: now - 160 * 60 * 1000,
          operatorName: 'Lars O.',
          durationMinutes: 15,
        },
        {
          stationId: 'st_2_assembly',
          stationName: 'Montering / Fogning',
          timestamp: now - 120 * 60 * 1000,
          operatorName: 'Anna K.',
          durationMinutes: 45,
        },
        {
          stationId: 'st_3_qc',
          stationName: 'Kvalitetskontroll (QC)',
          timestamp: now - 55 * 60 * 1000,
          operatorName: 'Erik M.',
          durationMinutes: 14,
        },
        {
          stationId: 'st_4_pack',
          stationName: 'Pack & Färdigleverans',
          timestamp: now - 22 * 60 * 1000,
          operatorName: 'Sofia B.',
        },
      ],
    },
  ];

  try {
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(sampleOrders));
  } catch {
    // ignore
  }

  return sampleOrders;
}

export function saveOrders(orders: ProductionOrder[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
    notifySync();
  } catch {
    // ignore
  }
}

/**
 * Core MAS-Light transition logic:
 * When an operator at targetStation scans a QR code (orderNumber),
 * advance the order to this station or create a new order if it's the first station.
 */
export function advanceOrderThroughStation(
  orderCode: string,
  targetStationId: string,
  operatorName = 'Operatör'
): { order: ProductionOrder; isNew: boolean; previousStationName?: string; isCompleted: boolean } {
  const cleanCode = orderCode.trim();
  const orders = loadOrders();
  const stations = loadStations();
  const targetStation = stations.find((s) => s.id === targetStationId) || stations[0];
  const isFinalStation = targetStation.orderIndex === stations.length - 1;

  const now = Date.now();
  const existingIndex = orders.findIndex(
    (o) => o.orderNumber.toLowerCase() === cleanCode.toLowerCase()
  );

  if (existingIndex !== -1) {
    const existing = orders[existingIndex];
    const prevStation = stations.find((s) => s.id === existing.currentStationId);

    // Calculate time spent at previous station
    const lastStep = existing.history[existing.history.length - 1];
    let durationMins = 0;
    if (lastStep) {
      durationMins = Math.max(1, Math.round((now - lastStep.timestamp) / (1000 * 60)));
      lastStep.durationMinutes = durationMins;
    }

    const newHistory = [
      ...existing.history,
      {
        stationId: targetStation.id,
        stationName: targetStation.name,
        timestamp: now,
        operatorName,
      },
    ];

    const updatedOrder: ProductionOrder = {
      ...existing,
      currentStationId: targetStation.id,
      updatedAt: now,
      status: isFinalStation ? 'completed' : 'active',
      history: newHistory,
    };

    orders[existingIndex] = updatedOrder;
    saveOrders(orders);

    return {
      order: updatedOrder,
      isNew: false,
      previousStationName: prevStation?.name,
      isCompleted: isFinalStation,
    };
  } else {
    // Create new order starting at this station
    const newOrder: ProductionOrder = {
      id: `ord_${Date.now()}`,
      orderNumber: cleanCode,
      articleName: guessArticleName(cleanCode),
      batch: `B${new Date().toISOString().slice(2, 7).replace('-', '')}`,
      currentStationId: targetStation.id,
      createdAt: now,
      updatedAt: now,
      status: isFinalStation ? 'completed' : 'active',
      priority: cleanCode.toLowerCase().includes('vip') ? 'high' : 'normal',
      history: [
        {
          stationId: targetStation.id,
          stationName: targetStation.name,
          timestamp: now,
          operatorName,
        },
      ],
    };

    orders.unshift(newOrder);
    saveOrders(orders);

    return {
      order: newOrder,
      isNew: true,
      isCompleted: isFinalStation,
    };
  }
}

function guessArticleName(code: string): string {
  if (code.startsWith('BILJETT-') || code.startsWith('ORD-')) {
    return `Artikel Komponent ${code.replace(/^[A-Z]+-/, '#')}`;
  }
  if (code.length < 8) {
    return `Standardmodul ${code}`;
  }
  return `Produkt ${code.slice(0, 10)}`;
}

/**
 * Resets all orders or seeds fresh test data
 */
export function resetProductionBoard() {
  saveOrders([]);
}

export function seedDemoProductionData() {
  localStorage.removeItem(STORAGE_KEY_ORDERS);
  return loadOrders();
}

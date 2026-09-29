import { TableOrder, TableStep } from './types';

export const TABLE_STEPS: TableStep[] = [
  {
    stepId: 1,
    title: 'Beställt vid bordet',
    badge: '1. Vid bordet',
    iconName: 'Utensils',
    color: 'sky',
  },
  {
    stepId: 2,
    title: 'I köket (Tillagas)',
    badge: '2. I köket',
    iconName: 'Flame',
    color: 'amber',
  },
  {
    stepId: 3,
    title: 'Klart för servering',
    badge: '3. Klart i kök',
    iconName: 'Bell',
    color: 'purple',
  },
  {
    stepId: 4,
    title: 'Serverat vid bordet',
    badge: '4. Serverat',
    iconName: 'CheckCircle2',
    color: 'emerald',
  },
];

const STORAGE_KEY = 'restaurant_table_orders_v1';

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('restaurant_table_sync');
  } catch {
    // fallback
  }
}

function notifySync() {
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'SYNC', timestamp: Date.now() });
    } catch {
      // ignore
    }
  }
}

export function subscribeTableSync(callback: () => void): () => void {
  if (!broadcastChannel) {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) callback();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }

  const handleMessage = () => callback();
  broadcastChannel.addEventListener('message', handleMessage);
  return () => broadcastChannel?.removeEventListener('message', handleMessage);
}

export function loadTableOrders(): TableOrder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }

  // Pre-seed demo tables
  const now = Date.now();
  const demo: TableOrder[] = [
    {
      id: 'tbl_1',
      tableCode: 'Bord 4',
      currentStep: 2,
      stepTitle: 'I köket (Tillagas)',
      createdAt: now - 18 * 60 * 1000,
      updatedAt: now - 8 * 60 * 1000,
      history: [
        { step: 1, stepTitle: 'Beställt vid bordet', timestamp: now - 18 * 60 * 1000 },
        { step: 2, stepTitle: 'I köket (Tillagas)', timestamp: now - 8 * 60 * 1000 },
      ],
    },
    {
      id: 'tbl_2',
      tableCode: 'Bord 7',
      currentStep: 3,
      stepTitle: 'Klart för servering',
      createdAt: now - 25 * 60 * 1000,
      updatedAt: now - 2 * 60 * 1000,
      history: [
        { step: 1, stepTitle: 'Beställt vid bordet', timestamp: now - 25 * 60 * 1000 },
        { step: 2, stepTitle: 'I köket (Tillagas)', timestamp: now - 16 * 60 * 1000 },
        { step: 3, stepTitle: 'Klart för servering', timestamp: now - 2 * 60 * 1000 },
      ],
    },
    {
      id: 'tbl_3',
      tableCode: 'Bord 12',
      currentStep: 1,
      stepTitle: 'Beställt vid bordet',
      createdAt: now - 4 * 60 * 1000,
      updatedAt: now - 4 * 60 * 1000,
      history: [{ step: 1, stepTitle: 'Beställt vid bordet', timestamp: now - 4 * 60 * 1000 }],
    },
  ];

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demo));
  } catch {
    // ignore
  }

  return demo;
}

export function saveTableOrders(orders: TableOrder[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    notifySync();
  } catch {
    // ignore
  }
}

/**
 * Normalizes input: "4" -> "Bord 4", "BORD-12" -> "Bord 12", "b8" -> "Bord 8"
 */
export function formatTableCode(input: string): string {
  const clean = input.trim();
  if (/^\d+$/.test(clean)) {
    return `Bord ${clean}`;
  }
  if (/^bord\s*[-_]?\s*(\d+)$/i.test(clean)) {
    const match = clean.match(/^bord\s*[-_]?\s*(\d+)$/i);
    return `Bord ${match ? match[1] : clean}`;
  }
  return clean;
}

/**
 * Advance table to next step in chain:
 * 1 (Beställt) -> 2 (I köket) -> 3 (Klart för servering) -> 4 (Serverat vid bordet)
 */
export function advanceTableOrder(rawCode: string): {
  order: TableOrder;
  prevStep: number;
  newStep: number;
  stepInfo: TableStep;
  isFirstScan: boolean;
  isCompleted: boolean;
} {
  const tableCode = formatTableCode(rawCode);
  const orders = loadTableOrders();
  const now = Date.now();

  const existingIdx = orders.findIndex(
    (o) => o.tableCode.toLowerCase() === tableCode.toLowerCase()
  );

  if (existingIdx !== -1) {
    const current = orders[existingIdx];
    const prevStep = current.currentStep;

    // Advance to next step (or wrap around if served to start a new order)
    let newStep = prevStep + 1;
    if (newStep > 4) {
      newStep = 1; // Start a new order round for this table
    }

    const stepDef = TABLE_STEPS.find((s) => s.stepId === newStep) || TABLE_STEPS[0];

    const updated: TableOrder = {
      ...current,
      currentStep: newStep,
      stepTitle: stepDef.title,
      updatedAt: now,
      history: [
        ...current.history,
        {
          step: newStep,
          stepTitle: stepDef.title,
          timestamp: now,
        },
      ],
    };

    orders[existingIdx] = updated;
    saveTableOrders(orders);

    return {
      order: updated,
      prevStep,
      newStep,
      stepInfo: stepDef,
      isFirstScan: false,
      isCompleted: newStep === 4,
    };
  } else {
    // Brand new table order starting at Step 1 (Beställt vid bordet)
    const stepDef = TABLE_STEPS[0];
    const newOrder: TableOrder = {
      id: `tbl_${Date.now()}`,
      tableCode,
      currentStep: 1,
      stepTitle: stepDef.title,
      createdAt: now,
      updatedAt: now,
      history: [
        {
          step: 1,
          stepTitle: stepDef.title,
          timestamp: now,
        },
      ],
    };

    orders.unshift(newOrder);
    saveTableOrders(orders);

    return {
      order: newOrder,
      prevStep: 0,
      newStep: 1,
      stepInfo: stepDef,
      isFirstScan: true,
      isCompleted: false,
    };
  }
}

export function clearAllTableOrders() {
  saveTableOrders([]);
}

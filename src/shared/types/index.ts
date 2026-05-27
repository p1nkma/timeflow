// ===== Navigation =====
export type Page = 'today' | 'planner' | 'analytics' | 'settings';

// ===== Categories =====
export type CategoryKey = string;

export interface Category {
  key: CategoryKey;
  label: string;
  varPrefix: string;
  cls: string;
  icon: unknown;
}

export interface CustomCategory {
  key: string;       // 'custom_<timestamp>'
  label: string;
  iconName: string;  // key in ICON_MAP
  color: string;     // hex, e.g. '#6366f1'
}

// ===== Tasks =====
export type TaskSource  = 'user' | 'ai' | 'uni' | 'google';
export type EnergyLevel = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  date?: string;       // ISO YYYY-MM-DD; absent = today
  start: number;       // minutes from midnight
  end: number;         // minutes from midnight
  cat: CategoryKey;
  source: TaskSource;
  done: boolean;
  locked?: boolean;
  overdue?: boolean;
  isBreak?: boolean;
  energy?: EnergyLevel;
  reason?: string;
  reasonLong?: string;
  notes?: string;
}

// ===== Inbox =====
export interface InboxItem {
  id: string;
  title: string;
  cat: CategoryKey;
  deadline?: string | null;
  urgent?: boolean;
}

// ===== Planner =====
export type ChronoType = 'lark' | 'owl' | 'pigeon';

export interface PlannerSettings {
  chronotype: ChronoType;
  workStart: number;   // minutes from midnight
  workEnd: number;
  breakDuration: number;
  enabledCategories: CategoryKey[];
}

// ===== UI =====
export type ToastVariant = 'default' | 'success' | 'error';

export interface ToastState {
  message: string;
  variant: ToastVariant;
  id: number;
  undoId?: string;
  undoTask?: Task; // восстанавливаем задачу при undo
}

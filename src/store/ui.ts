import { create } from 'zustand';
import type { TransactionType } from '@/db/types';

export type Period = 'day' | 'week' | 'month' | 'year';

interface UIState {
  // Модалка добавления операции
  txnModalOpen: boolean;
  txnModalType: TransactionType;
  editingTxnId: number | null;
  openTxnModal: (type?: TransactionType, editId?: number | null) => void;
  closeTxnModal: () => void;

  // Выбранный период на экране статистики
  statsPeriod: Period;
  setStatsPeriod: (p: Period) => void;

  // Опорная дата (для навигации по периодам)
  anchorDate: number;
  setAnchorDate: (ts: number) => void;
}

export const useUI = create<UIState>((set) => ({
  txnModalOpen: false,
  txnModalType: 'expense',
  editingTxnId: null,
  openTxnModal: (type = 'expense', editId = null) =>
    set({ txnModalOpen: true, txnModalType: type, editingTxnId: editId }),
  closeTxnModal: () => set({ txnModalOpen: false, editingTxnId: null }),

  statsPeriod: 'month',
  setStatsPeriod: (p) => set({ statsPeriod: p }),

  anchorDate: Date.now(),
  setAnchorDate: (ts) => set({ anchorDate: ts }),
}));

import { create } from 'zustand';
import type { TransactionType } from '@/db/types';

interface UIState {
  // Модалка добавления операции
  txnModalOpen: boolean;
  txnModalType: TransactionType;
  editingTxnId: number | null;
  openTxnModal: (type?: TransactionType, editId?: number | null) => void;
  closeTxnModal: () => void;
}

export const useUI = create<UIState>((set) => ({
  txnModalOpen: false,
  txnModalType: 'expense',
  editingTxnId: null,
  openTxnModal: (type = 'expense', editId = null) =>
    set({ txnModalOpen: true, txnModalType: type, editingTxnId: editId }),
  closeTxnModal: () => set({ txnModalOpen: false, editingTxnId: null }),
}));

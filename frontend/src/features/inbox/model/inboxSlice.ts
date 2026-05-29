import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { InboxItem } from '../../../shared/types';

const inboxSlice = createSlice({
  name: 'inbox',
  initialState: [] as InboxItem[],
  reducers: {
    setInboxItems(_state, action: PayloadAction<InboxItem[]>) {
      return action.payload;
    },
    addInboxItem(state, action: PayloadAction<Omit<InboxItem, 'id'>>) {
      state.push({ ...action.payload, id: `i${Date.now()}` });
    },
    removeInboxItem(state, action: PayloadAction<string>) {
      return state.filter(i => i.id !== action.payload);
    },
    resetInbox() {
      return [];
    },
  },
});

export const { setInboxItems, addInboxItem, removeInboxItem, resetInbox } = inboxSlice.actions;
export default inboxSlice.reducer;

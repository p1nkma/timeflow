import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { InboxItem } from '../../../shared/types';
import { MOCK_INBOX } from '../../../mocks/inbox';

const initialInbox: InboxItem[] = import.meta.env.DEV ? MOCK_INBOX : [];

const inboxSlice = createSlice({
  name: 'inbox',
  initialState: initialInbox,
  reducers: {
    addInboxItem(state, action: PayloadAction<Omit<InboxItem, 'id'>>) {
      state.push({ ...action.payload, id: `i${Date.now()}` });
    },
    removeInboxItem(state, action: PayloadAction<string>) {
      return state.filter(i => i.id !== action.payload);
    },
    resetInbox() {
      return [...MOCK_INBOX];
    },
  },
});

export const { addInboxItem, removeInboxItem, resetInbox } = inboxSlice.actions;
export default inboxSlice.reducer;

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { InboxItem } from '../../shared/types';

const initialInbox: InboxItem[] = [
  { id: 'i1', title: 'Позвонить в деканат',           cat: 'study',     deadline: new Date().toISOString().slice(0, 10), urgent: false },
  { id: 'i2', title: 'Ответить Лёне про пет-проект',  cat: 'code',      deadline: null,                                   urgent: false },
  { id: 'i3', title: 'Продлить библиотечную книгу',   cat: 'study',     deadline: '2026-04-21',                           urgent: false },
  { id: 'i4', title: 'Переделать шапку сайта клиента',cat: 'freelance', deadline: '2026-04-22',                           urgent: true  },
  { id: 'i5', title: 'Настроить линтер в проекте',    cat: 'code',      deadline: null,                                   urgent: false },
];

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
  },
});

export const { addInboxItem, removeInboxItem } = inboxSlice.actions;
export default inboxSlice.reducer;

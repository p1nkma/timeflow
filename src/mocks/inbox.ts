import type { InboxItem } from '../shared/types';

export const MOCK_INBOX: InboxItem[] = [
  { id: 'i1', title: 'Позвонить в деканат',                cat: 'study',     deadline: new Date().toISOString().slice(0, 10), urgent: false },
  { id: 'i2', title: 'Ответить Лёне про пет-проект',       cat: 'code',      deadline: null,         urgent: false },
  { id: 'i3', title: 'Продлить библиотечную книгу',        cat: 'study',     deadline: '2026-05-29', urgent: false },
  { id: 'i4', title: 'Переделать шапку сайта клиента',     cat: 'freelance', deadline: '2026-05-28', urgent: true  },
  { id: 'i5', title: 'Настроить линтер в проекте',         cat: 'code',      deadline: null,         urgent: false },
  { id: 'i6', title: 'Подготовить слайды к коллоквиуму',   cat: 'study',     deadline: '2026-05-28', urgent: false },
  { id: 'i7', title: 'Прочитать главу 6 «DDIA»',           cat: 'reading',   deadline: null,         urgent: false },
  { id: 'i8', title: 'Code review PR #214',                cat: 'code',      deadline: null,         urgent: false },
];

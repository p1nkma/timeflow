import { format, addDays, startOfDay, isValid } from 'date-fns';
import type { CategoryKey, EnergyLevel } from '../types';

export interface ParsedToken {
  type: 'date' | 'time' | 'duration' | 'category' | 'energy';
  start: number;
  end: number;
  raw: string;
}

export interface ParsedQuickAdd {
  title: string;
  date?: string;
  start?: number;
  duration?: number;
  cat?: CategoryKey;
  energy?: EnergyLevel;
  tokens: ParsedToken[];
}

const WEEKDAYS: Record<string, number> = {
  'пн': 1, 'пон': 1, 'понедельник': 1,
  'вт': 2, 'вто': 2, 'вторник': 2,
  'ср': 3, 'сре': 3, 'среда': 3,
  'чт': 4, 'чет': 4, 'четверг': 4,
  'пт': 5, 'пят': 5, 'пятница': 5,
  'сб': 6, 'суб': 6, 'суббота': 6,
  'вс': 0, 'воск': 0, 'воскресенье': 0,
};

const MONTHS: Record<string, number> = {
  'янв': 0, 'января': 0,
  'фев': 1, 'февраля': 1,
  'мар': 2, 'марта': 2,
  'апр': 3, 'апреля': 3,
  'мая': 4, 'май': 4,
  'июн': 5, 'июня': 5,
  'июл': 6, 'июля': 6,
  'авг': 7, 'августа': 7,
  'сен': 8, 'сентября': 8,
  'окт': 9, 'октября': 9,
  'ноя': 10, 'ноября': 10,
  'дек': 11, 'декабря': 11,
};

const CATEGORY_ALIASES: Record<string, CategoryKey> = {
  study: 'study', учёба: 'study', учеба: 'study',
  code: 'code', код: 'code', кодинг: 'code', программирование: 'code',
  freelance: 'freelance', фриланс: 'freelance',
  sport: 'sport', спорт: 'sport',
  reading: 'reading', чтение: 'reading',
  fixed: 'fixed', вуз: 'fixed',
};

function toIso(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function nextWeekday(from: Date, target: number, forceNext: boolean): Date {
  const cur = from.getDay();
  let diff = (target - cur + 7) % 7;
  if (forceNext) diff += 7;
  else if (diff === 0) diff = 7;
  return addDays(from, diff);
}

interface Match {
  start: number;
  end: number;
  apply: (acc: Partial<ParsedQuickAdd>) => void;
  type: ParsedToken['type'];
}

export function parseQuickAdd(input: string, now: Date = new Date()): ParsedQuickAdd {
  const text = input;
  const lower = text.toLowerCase();
  const today = startOfDay(now);
  const matches: Match[] = [];

  // ── Даты ──
  const reToday = /\b(сегодня)\b/g;
  const reTomorrow = /\b(завтра)\b/g;
  const reDayAfter = /\b(послезавтра)\b/g;

  for (const m of lower.matchAll(reToday)) {
    matches.push({
      start: m.index!, end: m.index! + m[0].length, type: 'date',
      apply: a => { a.date = toIso(today); },
    });
  }
  for (const m of lower.matchAll(reTomorrow)) {
    matches.push({
      start: m.index!, end: m.index! + m[0].length, type: 'date',
      apply: a => { a.date = toIso(addDays(today, 1)); },
    });
  }
  for (const m of lower.matchAll(reDayAfter)) {
    matches.push({
      start: m.index!, end: m.index! + m[0].length, type: 'date',
      apply: a => { a.date = toIso(addDays(today, 2)); },
    });
  }

  // "след(ующий) пн", "след пятницу"
  const reNextWeekday = /\b(след(?:ующ(?:ий|ую|ая|ее))?|сл\.?)\s+(пн|пон|понедельник|вт|вто|вторник|ср|сре|среда|среду|чт|чет|четверг|пт|пят|пятница|пятницу|сб|суб|суббота|субботу|вс|воск|воскресенье)\b/g;
  for (const m of lower.matchAll(reNextWeekday)) {
    const wd = WEEKDAYS[m[2]] ?? WEEKDAYS[m[2].slice(0, 2)];
    if (wd === undefined) continue;
    const date = nextWeekday(today, wd, true);
    matches.push({
      start: m.index!, end: m.index! + m[0].length, type: 'date',
      apply: a => { a.date = toIso(date); },
    });
  }

  // одиночный день недели: "в пятницу", "пн"
  const reWeekday = /\b(в\s+)?(понедельник|вторник|сред[аеуы]|четверг|пятниц[ауы]|суббот[ауы]|воскресенье|пн|вт|ср|чт|пт|сб|вс)\b/g;
  for (const m of lower.matchAll(reWeekday)) {
    if (matches.some(x => x.start <= m.index! && x.end > m.index!)) continue;
    const raw = m[2];
    const key = WEEKDAYS[raw] ?? WEEKDAYS[raw.slice(0, 3)] ?? WEEKDAYS[raw.slice(0, 2)];
    if (key === undefined) continue;
    const date = nextWeekday(today, key, false);
    matches.push({
      start: m.index!, end: m.index! + m[0].length, type: 'date',
      apply: a => { a.date = toIso(date); },
    });
  }

  // "25 мая", "1 сентября", "25 мая 2026"
  const reDateRu = /\b(\d{1,2})\s+(янв(?:аря)?|фев(?:раля)?|мар(?:та)?|апр(?:еля)?|май|мая|июн(?:я)?|июл(?:я)?|авг(?:уста)?|сен(?:тября)?|окт(?:ября)?|ноя(?:бря)?|дек(?:абря)?)(?:\s+(\d{4}))?\b/g;
  for (const m of lower.matchAll(reDateRu)) {
    const day = parseInt(m[1], 10);
    const month = MONTHS[m[2]] ?? MONTHS[m[2].slice(0, 3)];
    if (month === undefined) continue;
    const year = m[3] ? parseInt(m[3], 10) : now.getFullYear();
    const date = new Date(year, month, day);
    if (!isValid(date)) continue;
    if (!m[3] && date < today) date.setFullYear(year + 1);
    matches.push({
      start: m.index!, end: m.index! + m[0].length, type: 'date',
      apply: a => { a.date = toIso(date); },
    });
  }

  // "25.05", "25.05.2026", "25/05"
  const reDateNum = /\b(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\b/g;
  for (const m of lower.matchAll(reDateNum)) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    let year = m[3] ? parseInt(m[3], 10) : now.getFullYear();
    if (year < 100) year += 2000;
    const date = new Date(year, month, day);
    if (!isValid(date) || date.getDate() !== day || date.getMonth() !== month) continue;
    if (!m[3] && date < today) date.setFullYear(year + 1);
    matches.push({
      start: m.index!, end: m.index! + m[0].length, type: 'date',
      apply: a => { a.date = toIso(date); },
    });
  }

  // ── Время ──
  // "10:00", "10:30", "в 10:00", "в 10"
  const reTime = /\b(?:в\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/g;
  for (const m of lower.matchAll(reTime)) {
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    matches.push({
      start: m.index!, end: m.index! + m[0].length, type: 'time',
      apply: a => { a.start = h * 60 + min; },
    });
  }

  // "в 10", "в 9" — только с предлогом, чтобы не ловить числа в названии
  const reTimeShort = /\bв\s+([01]?\d|2[0-3])(?!\s*[:.\-\dчмh])\b/g;
  for (const m of lower.matchAll(reTimeShort)) {
    if (matches.some(x => x.start <= m.index! && x.end > m.index!)) continue;
    const h = parseInt(m[1], 10);
    matches.push({
      start: m.index!, end: m.index! + m[0].length, type: 'time',
      apply: a => { a.start = h * 60; },
    });
  }

  // ── Длительность ──
  // "1ч", "1.5ч", "1,5ч", "2 ч", "90м", "30 мин"
  const reDuration = /\b(\d+(?:[.,]\d+)?)\s*(ч(?:ас(?:а|ов)?)?|h|мин(?:ут[ауы]?)?|м(?!\w))\b/g;
  for (const m of lower.matchAll(reDuration)) {
    const num = parseFloat(m[1].replace(',', '.'));
    const unit = m[2];
    const minutes = unit.startsWith('ч') || unit === 'h' ? Math.round(num * 60) : Math.round(num);
    if (minutes <= 0 || minutes > 24 * 60) continue;
    matches.push({
      start: m.index!, end: m.index! + m[0].length, type: 'duration',
      apply: a => { a.duration = minutes; },
    });
  }

  // ── Категория ──
  const aliasKeys = Object.keys(CATEGORY_ALIASES).sort((a, b) => b.length - a.length);
  const aliasPattern = aliasKeys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const reCat = new RegExp(`#(${aliasPattern})\\b`, 'gu');
  for (const m of lower.matchAll(reCat)) {
    const cat = CATEGORY_ALIASES[m[1]];
    if (!cat) continue;
    matches.push({
      start: m.index!, end: m.index! + m[0].length, type: 'category',
      apply: a => { a.cat = cat; },
    });
  }

  // ── Нагрузка ──
  // !!!, !!, ! — только как отдельный токен (не часть слова)
  const reEnergy = /(?:^|\s)(!{1,3})(?=\s|$)/g;
  for (const m of lower.matchAll(reEnergy)) {
    const bangs = m[1];
    const offset = m[0].startsWith(' ') ? 1 : 0;
    const start = m.index! + offset;
    const energy: EnergyLevel = bangs.length === 1 ? 'low' : bangs.length === 2 ? 'medium' : 'high';
    matches.push({
      start, end: start + bangs.length, type: 'energy',
      apply: a => { a.energy = energy; },
    });
  }

  // ── Сборка результата ──
  matches.sort((a, b) => a.start - b.start);
  const merged: Match[] = [];
  for (const m of matches) {
    if (merged.length && m.start < merged[merged.length - 1].end) continue;
    merged.push(m);
  }

  const result: ParsedQuickAdd = { title: '', tokens: [] };
  for (const m of merged) {
    m.apply(result);
    result.tokens.push({
      type: m.type,
      start: m.start,
      end: m.end,
      raw: text.slice(m.start, m.end),
    });
  }

  // Title = текст без распознанных токенов
  let title = '';
  let cursor = 0;
  for (const t of result.tokens) {
    title += text.slice(cursor, t.start);
    cursor = t.end;
  }
  title += text.slice(cursor);
  result.title = title.replace(/\s+/g, ' ').trim();

  return result;
}


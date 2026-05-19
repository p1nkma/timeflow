import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Task } from '../../shared/types';
import { toMin } from '../../shared/utils/time';

const NOW_MIN = toMin(14, 20);

const initialTasks: Task[] = [
  { id: 't1',  start: toMin(8,0),   end: toMin(8,30),  title: 'Разбор входящих + план дня',               cat: 'study',     source: 'user', done: true,  reason: 'Утро, лёгкий старт',               reasonLong: 'Утро ты начинаешь медленнее — лёгкая задача задаёт ритм без сопротивления.' },
  { id: 't2',  start: toMin(8,30),  end: toMin(10,0),  title: 'Матан · подготовка к коллоквиуму',         cat: 'study',     source: 'ai',   done: true,  reason: 'Тяжёлая задача → пик энергии',     reasonLong: 'У тебя пик концентрации с 9 до 11. Самый сложный предмет — сюда.' },
  { id: 't3',  start: toMin(10,0),  end: toMin(11,30), title: 'Пара · Линейная алгебра (ауд. 412)',        cat: 'fixed',     source: 'uni',  done: true,  locked: true, reason: 'Зафиксировано в расписании',   reasonLong: 'Пара из расписания вуза. Изменить можно в Настройках.' },
  { id: 't4',  start: toMin(11,45), end: toMin(13,15), title: 'Пара · Программирование (ауд. 201)',        cat: 'fixed',     source: 'uni',  done: true,  locked: true, reason: 'Зафиксировано в расписании',   reasonLong: 'Пара из расписания вуза.' },
  { id: 't5',  start: toMin(13,30), end: toMin(14,0),  title: 'Обед + выдох',                             cat: 'sport',     source: 'ai',   done: true,  reason: 'Восстановление между блоками',      reasonLong: 'После двух пар нужен перерыв — иначе следующий блок будет слабым.' },
  { id: 't5a', start: toMin(13,0),  end: toMin(13,30), title: 'Ответить на письма куратору',               cat: 'study',     source: 'user', done: true,  reason: 'Пока свежо после пары',             reasonLong: 'Быстрая административная задача — лучше закрыть сразу.' },
  { id: 't5b', start: toMin(13,0),  end: toMin(13,25), title: 'Зафиксировать конспект по линейке',         cat: 'study',     source: 'ai',   done: false, reason: 'Пока материал в памяти',            reasonLong: 'Сразу после пары — пока структура ещё свежа, потом придётся восстанавливать.' },
  { id: 't6',  start: toMin(14,0),  end: toMin(14,15), title: 'Созвон с заказчиком — лендинг',            cat: 'freelance', source: 'google', done: false, overdue: true, reason: 'Просрочено на 20 мин', reasonLong: 'Блок был запланирован в 14:00, но ещё не отмечен выполненным.' },
  { id: 't7',  start: toMin(14,30), end: toMin(16,30), title: 'Кодинг · фикс багов на проде',             cat: 'code',      source: 'ai',   done: false, reason: 'После встречи, свежий контекст',   reasonLong: 'Сразу после созвона — пока всё ещё в голове. Блок 2 часа под глубокую работу.' },
  { id: 't8',  start: toMin(16,30), end: toMin(16,45), title: 'Перерыв',                                  cat: 'sport',     source: 'ai',   done: false, isBreak: true, reason: '15 мин',               reasonLong: 'Короткий перерыв между глубокими блоками.' },
  { id: 't9',  start: toMin(16,45), end: toMin(18,15), title: 'Кодинг · рефакторинг auth-модуля',         cat: 'code',      source: 'ai',   done: false, reason: 'Продолжение кодинг-блока',          reasonLong: 'Продолжение кодинг-сессии — второй блок короче, голова уже устаёт.' },
  { id: 't10', start: toMin(18,30), end: toMin(19,30), title: 'Пробежка 5 км',                            cat: 'sport',     source: 'user', done: false, reason: 'Переключение после экрана',         reasonLong: 'После 4 часов за монитором — физическая активность очищает голову.' },
  { id: 't11', start: toMin(20,0),  end: toMin(21,0),  title: 'Читать «Designing Data-Intensive Applications» гл. 4', cat: 'reading', source: 'user', done: false, reason: 'Вечер, чтение без дедлайна',  reasonLong: 'Лёгкий формат работы перед сном — без давления.' },
  { id: 't12', start: toMin(21,0),  end: toMin(21,30), title: 'План на завтра',                           cat: 'study',     source: 'ai',   done: false, reason: 'Завершение дня',                    reasonLong: 'Закрываешь день с ощущением контроля — на утро уже не надо думать.' },
];

interface TasksState {
  items: Task[];
  nowMin: number;
}

const initialState: TasksState = {
  items: initialTasks,
  nowMin: NOW_MIN,
};

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    toggleTask(state, action: PayloadAction<string>) {
      const task = state.items.find(t => t.id === action.payload);
      if (task && !task.locked) task.done = !task.done;
    },
    updateTask(state, action: PayloadAction<Task>) {
      const idx = state.items.findIndex(t => t.id === action.payload.id);
      if (idx !== -1) state.items[idx] = action.payload;
    },
    deleteTask(state, action: PayloadAction<string>) {
      state.items = state.items.filter(t => t.id !== action.payload);
    },
    addTask(state, action: PayloadAction<Pick<Task, 'title'>>) {
      const id = `t${Date.now()}`;
      state.items.push({
        id,
        title: action.payload.title,
        start: state.nowMin,
        end: state.nowMin + 60,
        cat: 'study',
        source: 'user',
        done: false,
      });
    },
    reorderTask(state, action: PayloadAction<{ id: string; newStart: number }>) {
      const task = state.items.find(t => t.id === action.payload.id);
      if (task) {
        const dur = task.end - task.start;
        task.start = action.payload.newStart;
        task.end = action.payload.newStart + dur;
      }
    },
    // Сдвигает задачу на текущий момент (nowMin) сохраняя длительность
    startTaskNow(state, action: PayloadAction<string>) {
      const task = state.items.find(t => t.id === action.payload);
      if (task && !task.locked) {
        const dur = task.end - task.start;
        task.start = state.nowMin;
        task.end   = state.nowMin + dur;
        task.overdue = false;
      }
    },
    // Сдвигает просроченную задачу на nowMin (сохраняет длительность, снимает overdue)
    rescheduleTask(state, action: PayloadAction<string>) {
      const task = state.items.find(t => t.id === action.payload);
      if (task && !task.locked) {
        const dur = task.end - task.start;
        task.start   = state.nowMin;
        task.end     = state.nowMin + dur;
        task.overdue = false;
      }
    },
    // Переносит задачу в конец дня (20:00+) или на ближайший свободный вечерний слот
    moveTaskToEvening(state, action: PayloadAction<string>) {
      const task = state.items.find(t => t.id === action.payload);
      if (!task || task.locked) return;
      const EVENING_START = 20 * 60; // 20:00
      const dur = task.end - task.start;
      // Найти конец последней задачи после 20:00
      const eveningTasks = state.items
        .filter(t => t.id !== task.id && t.start >= EVENING_START)
        .sort((a, b) => a.start - b.start);
      const newStart = eveningTasks.length > 0
        ? eveningTasks[eveningTasks.length - 1].end
        : EVENING_START;
      task.start   = newStart;
      task.end     = newStart + dur;
      task.overdue = false;
    },
  },
});

export const { toggleTask, updateTask, deleteTask, addTask, reorderTask, startTaskNow, rescheduleTask, moveTaskToEvening } = tasksSlice.actions;
export default tasksSlice.reducer;

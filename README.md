# TimeFlow

Умный планировщик дня для студентов и фрилансеров. Помогает выстраивать расписание с учётом хронотипа и энергозон, объясняет каждое решение через AI и отправляет напоминания в Telegram.

---

## Стек

| Слой | Технологии |
|---|---|
| Frontend | React 19, Vite, TypeScript |
| State | Redux Toolkit, RTK Query |
| Routing | React Router v7 |
| Стили | CSS Modules + CSS-переменные |
| Валидация | Zod |
| Графики | Recharts |
| Даты | date-fns |
| Backend | FastAPI, SQLAlchemy, PostgreSQL *(в разработке)* |
| TMA | React + @twa-dev/sdk *(в разработке)* |
| AI | Claude API (claude-sonnet-4-6) |

---

## Быстрый старт

```bash
# Установка зависимостей
npm install

# Dev-сервер на localhost:5173
npm run dev

# Сборка
npm run build

# Превью сборки
npm run preview
```

---

## Структура проекта

```
src/
├── app/            # store, провайдеры, App.tsx
├── components/     # глобальные компоненты (Sidebar)
├── features/       # tasks, planner, ui — Redux-срезы
├── pages/          # Today, Planner, Analytics, Settings
├── shared/
│   ├── types/      # все TypeScript-типы
│   ├── ui/         # переиспользуемые компоненты
│   ├── hooks/      # хуки
│   └── utils/      # time.ts, categories.ts
└── styles/
    ├── tokens.css  # дизайн-токены (цвета, шрифты, отступы)
    └── global.css  # глобальные стили и типографика
```

---

## Текущий статус

- [x] Дизайн-система, токены, типографика
- [x] Sidebar, Redux-слои, Shared UI
- [ ] Today Page *(в разработке)*
- [ ] Planner, Analytics, Settings
- [ ] Подключение бэкенда
- [ ] Telegram Mini App

---

## Автор

**Михаил Полунин** — [poluninmisa140@gmail.com](mailto:poluninmisa140@gmail.com)

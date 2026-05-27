# TimeFlow Backend

FastAPI + SQLAlchemy 2 (async) + PostgreSQL 17. Менеджер зависимостей — `uv`.

## Требования

- `uv` ([install](https://docs.astral.sh/uv/getting-started/installation/))
- `docker` + `docker compose` (для Postgres)

`uv` сам подтянет Python 3.13 при первом `uv sync`.

## Первый запуск

```bash
cp .env.example .env       # секреты и токены потом
uv sync                    # установит зависимости и Python 3.13
docker compose up -d       # поднимет postgres на :5432
uv run alembic upgrade head  # пока миграций нет — no-op
uv run uvicorn app.main:app --reload
```

Открыть:
- API: <http://localhost:8000/health>
- Swagger: <http://localhost:8000/docs>

## Структура

```
backend/
├── app/
│   ├── core/          # config, security, deps
│   ├── db/            # engine, session, Base
│   ├── auth/          # блок 1: register, login, JWT
│   ├── users/         # блок 1: профиль, admin
│   ├── tasks/         # блок 2: CRUD задач
│   ├── categories/    # блок 2: категории
│   ├── telegram/      # блок 3: bot, webhook, deep link
│   ├── analytics/     # блок 4: статистика
│   ├── ai/            # блок 4: rule-based + Claude
│   ├── integrations/  # блок 5: Google Calendar
│   ├── export/        # блок 5: PDF/CSV
│   ├── gamification/  # блок 5: streak, achievements
│   └── main.py
├── alembic/           # миграции
├── docker-compose.yml # postgres
├── pyproject.toml     # uv-зависимости
└── .env.example
```

## Полезные команды

```bash
# Создать миграцию по изменениям моделей
uv run alembic revision --autogenerate -m "describe change"

# Применить миграции
uv run alembic upgrade head

# Откатить одну
uv run alembic downgrade -1

# Линтер и форматтер
uv run ruff check .
uv run ruff format .

# Тесты
uv run pytest
```

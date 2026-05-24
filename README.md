# Express Exchange — Telegram Mini App

Обмен валют и оплата услуг (TMA) + админ-бот заявок + Google Sheets + Shipday.

## Быстрый старт

```bash
npm install
npm run bot:install
cp .env.example .env.development.local   # Windows: copy .env.example .env.development.local
# Заполните токены в .env.development.local
# Положите Google JSON: server/google-service-account.json

npm run bot    # :3001
npm start      # :3000 → http://localhost:3000
```

Подробнее: [HANDOVER.md](./HANDOVER.md)

## Структура

| Путь | Описание |
|------|----------|
| `src/` | React UI |
| `server/` | API, Telegram bots, Sheets, Shipday |
| `public/` | Статика (см. `public/MEDIA_README.md`) |
| `.env.example` | Шаблон секретов |

## Секреты (не в git)

- `.env.development.local`
- `server/google-service-account.json`

Новый разработчик получает их от владельца проекта отдельно (1Password, Signal и т.п.).

## Скрипты

- `npm start` — фронт (dev)
- `npm run build` — production build
- `npm run bot` — backend + polling orders bot
- `npm run tunnel` — Cloudflare tunnel для теста TMA

# Передача проекта Express Exchange (TMA)

## Быстрый старт

```bash
cd exchange
npm install
npm run bot:install
copy .env.example .env.development.local   # Windows: заполнить токены
npm run bot    # терминал 1 — API + Telegram-бот заявок (:3001)
npm start      # терминал 2 — React (:3000)
```

В dev фронт ходит на бот через `proxy` в `package.json` (`http://localhost:3001`).

---

## Что уже в репозитории

| Путь | Содержимое |
|------|------------|
| `src/` | React-приложение |
| `server/` | HTTP API, orders bot, Google Sheets, Shipday |
| `public/logo.svg`, `public/imagemercado.svg` | Статика |
| `public/cashback-cards/express-exchange.svg` | Одна тема карточки кэшбэка |
| `.env.example` | Шаблон переменных окружения |
| `server/GOOGLE_SHEETS_SETUP.md` | Подключение таблицы |

---

## Передать отдельно (не в git)

### Секреты

1. **`exchange/.env.development.local`** — скопировать из `.env.example` и заполнить:
   - `ORDERS_BOT_TOKEN`, `ORDERS_ADMIN_CHAT_ID`
   - `EXEXCHANGE_BOT_TOKEN` / `REACT_APP_EXEXCHANGE_BOT_TOKEN`
   - `GEMINI_API_KEY` (подсказки AI)
   - `SHIPDAY_API_KEY` (курьер после Approve)
   - `GOOGLE_SPREADSHEET_ID`, `GOOGLE_SHEET_TAB`

2. **`exchange/server/google-service-account.json`** — JSON-ключ Google Cloud (Sheets API).  
   Таблицу расшарить на `client_email` из файла (см. `server/GOOGLE_SHEETS_SETUP.md`).

Файлы в `.gitignore` / `server/.gitignore` — **в архив проекта положить вручную**.

### Медиа (см. `public/MEDIA_README.md` и `public/cashback-cards/README.md`)

- `public/14218019_1280_720_30fps.mp4` — фон главной (если нет файла, показывается градиент)
- JPG тем карточек кэшбэка в `public/cashback-cards/`

### Данные (опционально)

`server/data/` — кошельки и заказы на диске. Для чистой установки не копировать.

---

## Продакшен

- `npm run build` → статика в `build/`
- Поднять `npm run bot` с тем же `.env`
- Задать `REACT_APP_BOT_API_URL` на URL API при сборке фронта
- Mini App URL в BotFather → ваш HTTPS-домен

---

## Полезные команды бота

- `/chatid` в orders-боте — узнать `ORDERS_ADMIN_CHAT_ID`
- Лог бота: `Google Sheets: ✅`, `Shipday: ✅ API ключ задан`

# Google Sheets — подключение

Кнопка **«Подтвердить»** пишет заказ на вкладку `Orders_Today NEW` (имя в `.env`: `GOOGLE_SHEET_TAB`).

## Шаги

1. [Google Cloud Console](https://console.cloud.google.com/) → создать проект.
2. **APIs & Services** → **Library** → включить **Google Sheets API**.
3. **IAM & Admin** → **Service Accounts** → **Create** → **Keys** → **Add key** → **JSON**.
4. Скачанный файл переименовать и положить сюда:

   ```
   exchange/server/google-service-account.json
   ```

5. Открыть [таблицу](https://docs.google.com/spreadsheets/d/11p4tMxdnq91JngFwFUFUykcy60Tqxpfyhf1amLGI2v4) → **Поделиться**.
6. Добавить email из JSON (поле `client_email`) с правом **Редактор**.
7. Перезапустить: `npm run bot`

В логе должно быть: `Google Sheets: ✅ настроен`

## Проверка

- Напишите orders-боту: `/chatid` — сверьте `ORDERS_ADMIN_CHAT_ID` в `.env`.
- Оформите тестовый заказ → **Подтвердить** → новая строка в таблице.

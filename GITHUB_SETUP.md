# Публикация на GitHub

Локальный репозиторий уже создан (ветка `main`, первый коммит). Секреты **не** в git.

## Вариант A — через GitHub CLI (рекомендуется)

### 1. Войти в GitHub

В терминале в папке `exchange`:

```powershell
gh auth login
```

Выберите: GitHub.com → HTTPS → Login with a web browser → скопируйте код с экрана.

### 2. Создать репозиторий и отправить код

```powershell
cd "c:\Users\natas\Desktop\TMA Ex\exchange"
gh repo create express-exchange-tma --private --source=. --remote=origin --push --description "Express Exchange Telegram Mini App"
```

Имя `express-exchange-tma` можно заменить на своё.

### 3. Пригласить разработчика

```powershell
gh repo invite USERNAME --permission write
```

Или: GitHub → репозиторий → **Settings** → **Collaborators** → **Add people**.

---

## Вариант B — вручную на сайте

1. [github.com/new](https://github.com/new) → имя репозитория → **Private** → без README.
2. В терминале:

```powershell
cd "c:\Users\natas\Desktop\TMA Ex\exchange"
git remote add origin https://github.com/ВАШ_ЛОГИН/ИМЯ_РЕПО.git
git push -u origin main
```

---

## Что передать второму разработчику отдельно (не через GitHub)

| Файл | Описание |
|------|----------|
| `.env.development.local` | Токены ботов, Gemini, Shipday, Sheets |
| `server/google-service-account.json` | Ключ Google Sheets |

Инструкция по запуску: [README.md](./README.md), [HANDOVER.md](./HANDOVER.md).

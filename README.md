# LocalSpeaking

LocalSpeaking — self-hosted платформа для общения, вдохновлённая Discord.

Проект позволяет поднять собственный сервер общения локально, на VPS или домашнем сервере, чтобы пользователи могли подключаться напрямую без централизованной инфраструктуры.

## Содержание

- [Описание](#описание)
- [Используемый стек](#используемый-стек)
- [Текущие возможности](#текущие-возможности)
- [Структура проекта](#структура-проекта)
- [Установка проекта](#установка-проекта)
- [Запуск backend](#запуск-backend)
- [Запуск frontend](#запуск-frontend)
- [Адреса сервисов](#адреса-сервисов)
- [Текущая архитектура](#текущая-архитектура)
- [Планы по развитию](#планы-по-развитию)
- [Статус проекта](#статус-проекта)
- [Цель проекта](#цель-проекта)

## Описание

LocalSpeaking строится как модульная realtime-платформа с поддержкой:

- серверов;
- каналов;
- сообщений;
- WebSocket-realtime-связи;
- Docker-развёртывания;
- self-hosted архитектуры.

## Используемый стек

### Backend

- Django
- Django REST Framework
- Django Channels
- Daphne
- PostgreSQL
- Redis
- WebSockets

### Frontend

- React
- TypeScript
- Vite

### Инфраструктура

- Docker
- Docker Compose

## Текущие возможности

### Backend

- кастомная система пользователей;
- модель серверов;
- модель каналов;
- модель сообщений;
- REST API;
- интеграция PostgreSQL;
- Django admin панель;
- базовая WebSocket-архитектура.

### Frontend

- React-интерфейс;
- динамический sidebar серверов;
- динамический список каналов;
- связь frontend ↔ backend;
- подготовленная realtime-архитектура.

## Структура проекта

```text
LocalSpeaking/
├── users/
├── servers/
├── channels_app/
├── messages_app/
├── config/
├── frontend/
│   ├── src/
│   └── public/
├── docker-compose.yml
├── manage.py
└── requirements.txt
```

## Установка проекта

### Клонирование репозитория

```bash
git clone <repo_url>
cd LocalSpeaking
```

### Создание виртуального окружения

```bash
python -m venv venv
```

### Активация venv

#### Linux / macOS

```bash
source venv/bin/activate
```

#### Windows

```bash
venv\Scripts\activate
```

### Установка зависимостей backend

```bash
pip install -r requirements.txt
```

### Запуск PostgreSQL и Redis через Docker

```bash
docker compose up -d
```

## Запуск backend

### Применение миграций

```bash
python manage.py makemigrations
python manage.py migrate
```

Если схема базы уже создана, обычно достаточно только `migrate`.

### Создание superuser

```bash
python manage.py createsuperuser
```

### Запуск ASGI-сервера

```bash
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

Backend будет доступен по адресу `http://127.0.0.1:8000`.

## Запуск frontend

### Переход в frontend

```bash
cd frontend
```

### Установка зависимостей

```bash
npm install
```

### Запуск dev-сервера

```bash
npm run dev
```

Frontend будет доступен по адресу `http://localhost:5173`.

## Адреса сервисов

- Frontend: `http://localhost:5173`
- Backend API: `http://127.0.0.1:8000`
- Django Admin: `http://127.0.0.1:8000/admin`

## Текущая архитектура

### Servers

Серверы являются основными пространствами общения.

Каждый сервер:

- содержит каналы;
- имеет владельца;
- хранит участников.

### Channels

Каналы принадлежат серверу и используются для общения.

Поддерживаются:

- text channels;
- voice channels, которые находятся в разработке.

### Messages

Сообщения принадлежат каналам и пользователям.

Планируется:

- realtime-доставка;
- WebSocket broadcasting;
- история сообщений;
- редактирование сообщений.

## Планы по развитию

### Realtime

- WebSocket-чат;
- live-обновления;
- online status;
- typing events.

### Voice

- voice channels;
- P2P-соединения;
- WebRTC.

### Self-hosting

- автоматическое Docker-развёртывание;
- конфигурация сервера через UI;
- поддержка VPS и домашних серверов.

### Безопасность

- JWT-авторизация;
- роли и permissions;
- приватные серверы.

## Статус проекта

Проект находится в активной разработке.

На текущем этапе уже реализованы:

- backend API;
- frontend интерфейс;
- система серверов;
- система каналов;
- базовая realtime-инфраструктура.

## Цель проекта

Создать полноценную self-hosted альтернативу Discord, где пользователь полностью контролирует:

- сервер;
- данные;
- инфраструктуру;
- подключение друзей.


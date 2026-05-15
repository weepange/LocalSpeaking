# LocalSpeaking

LocalSpeaking - self-hosted chat platform, inspired by Discord.

The project is built to run locally, on a VPS, or on your own server so people can talk directly without relying on a centralized platform.

## What it does now

- servers with ownership and member management;
- text and voice channels;
- Discord-like roles and permissions;
- server settings in a dedicated modal;
- server member management and role assignment;
- direct messages and a separate Friends/DM area;
- realtime chat over WebSockets;
- JWT login;
- Django REST API;
- React + TypeScript frontend.

## Stack

### Backend

- Django 6
- Django REST Framework
- Django Channels
- Daphne
- PostgreSQL
- Redis
- JWT auth with SimpleJWT

### Frontend

- React
- TypeScript
- Vite

### Infrastructure

- Docker / Docker Compose

## Project structure

```text
LocalSpeaking/
├── users/
├── servers/
├── channels_app/
├── messages_app/
├── config/
├── frontend/
├── manage.py
└── requirements.txt
```

## Main features

### Servers

- create servers from the UI;
- edit server settings in a modal;
- delete servers;
- see server member and channel counts;
- switch between multiple servers quickly.

### Channels

- create text and voice channels;
- pick a channel and chat in realtime;
- manage channels from server settings.

### Roles and permissions

- Discord-like role model;
- `@everyone` default role;
- admin role on server creation;
- full permission set for text and voice permissions;
- role hoisting, mentionable flag, icon support;
- change role order;
- assign roles to members from the settings modal.

### Members

- invite members by username;
- open a member profile from the message list;
- assign and remove roles from a member;
- remove members from a server.

### Direct messages

- start a DM from the Friends/DM area;
- open a DM from a profile card;
- separate private chat mode from server chat;
- realtime DM messaging.

## Setup

### Clone the repo

```bash
git clone <repo_url>
cd LocalSpeaking
```

### Create a virtual environment

```bash
python -m venv venv
```

### Activate it

#### Linux / macOS

```bash
source venv/bin/activate
```

#### Windows

```bash
venv\Scripts\activate
```

### Install backend dependencies

```bash
pip install -r requirements.txt
```

### Start PostgreSQL and Redis

```bash
docker compose up -d
```

## Backend run

### Apply migrations

```bash
python manage.py migrate
```

If this is the first setup, migrations are required before creating servers or roles.

### Optional: create admin user

```bash
python manage.py createsuperuser
```

### Start the ASGI server

```bash
DJANGO_DEBUG=false daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

If you want verbose debug pages locally, use:

```bash
DJANGO_DEBUG=true daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

Backend API:

- `http://127.0.0.1:8000`

## Frontend run

### Install frontend dependencies

```bash
cd frontend
npm install
```

### Start the dev server

```bash
npm run dev
```

Frontend:

- `http://localhost:5173`

## Available endpoints

- API: `http://127.0.0.1:8000`
- Admin: `http://127.0.0.1:8000/admin`
- Frontend: `http://localhost:5173`

## Architecture notes

### Authentication

- JWT-based login;
- `/api/users/login/` returns access and refresh tokens;
- `/api/users/me/` returns the current authenticated user.

### Servers and roles

- each server has an owner;
- each server has default and admin roles created on setup;
- roles store Discord-style permissions as boolean flags;
- members can have multiple roles.

### Messaging

- server chat uses channel-based WebSockets;
- direct messages use a separate conversation model and socket route;
- history is loaded through REST;
- realtime updates are delivered through Channels.

## Current roadmap

- channel permission overwrites;
- server categories;
- richer Friends page;
- friend requests;
- message edit/delete and reactions;
- mentions and clickable user popovers;
- unread indicators;
- typing status;
- voice chat.

## Status

The project is actively in development.

Already working:

- JWT login;
- server/channel creation;
- Discord-like roles and permissions;
- server member management;
- server settings modal;
- direct messages;
- realtime message delivery;
- React + Django split frontend/backend architecture.

## Goal

Build a fully self-hosted Discord alternative where the owner controls:

- the server;
- the data;
- the infrastructure;
- the people who can connect.

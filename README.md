# SupportAI Frontend

AI Customer Support Platform — React frontend for an RAG-powered support system.

## About

**SupportAI** is a multi-role customer support UI that connects to a backend RAG pipeline. Customers create tickets and chat for answers grounded in company knowledge. Agents handle the queue in real time. Admins manage users, knowledge docs, SLA policies, and analytics.

### Features

- **Role-based dashboards** — separate flows for Customer, Agent, and Admin
- **Ticket management** — create, track, and update support tickets with status/priority
- **RAG chat** — AI answers backed by uploaded knowledge-base documents
- **Real-time updates** — live ticket/chat activity for agents
- **Knowledge base** — admin upload of PDFs, FAQs, and docs for retrieval
- **SLA monitoring** — policies and compliance visibility
- **Auth** — email/password, Google OAuth, forgot/reset password

### Roles

| Role | What they can do |
|------|------------------|
| Customer | Dashboard, tickets, AI chat, create ticket |
| Agent | Dashboard, ticket queue, conversations |
| Admin | Analytics, users, knowledge base, SLA policies |

## Quick Start

```bash
npm install
npm run dev
```

Open: http://localhost:5173

## Docker

The image builds the app with Node and serves it with nginx. `VITE_*` values are baked in at build time, so rebuild after changing them.

**Local** (talks to Django at `http://localhost:8000`):

```bash
docker compose up -d --build
```

Open: http://localhost:5173 (same origin as `npm run dev`, already allowed by the backend's local CORS)

**Production (AWS EC2)** — values come from the server's `.env` (both variables required). Start the backend's `docker-compose.prod.yml` first: it creates the `supportai` network and its Caddy serves this container over HTTPS.

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Node/Vite are only used inside the image build; the server just needs Docker.

## Environment

All values live in a single `.env` (not committed):

| Variable | Local | Production |
|----------|-------|------------|
| `VITE_GOOGLE_CLIENT_ID` | Required | Required |
| `VITE_API_BASE_URL` | Leave commented — dev server proxies to `http://localhost:8000`, local Docker defaults to it | Required: `https://rag-support-api.duckdns.org` |

## Demo Login

| Role | Email |
|------|-------|
| Customer | rahim@example.com |
| Agent | sara@company.com |
| Admin | admin@company.com |

Use the quick login buttons on the login page (local/demo).

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- React Router v7
- Lucide Icons

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

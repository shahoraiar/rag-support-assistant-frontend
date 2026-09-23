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

## Environment

Copy `.env.example` to `.env` and set:

| Variable | Description |
|----------|-------------|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Web Client ID |
| `VITE_API_BASE_URL` | Backend API base URL (optional in local; Vite proxies `/api` to `localhost:8000`) |

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

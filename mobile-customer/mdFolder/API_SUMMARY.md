# AI Project Context – Delivery Gjilan (API)

This file defines how the Delivery Gjilan backend is structured.
You MUST follow this map to avoid hallucinating files or breaking architecture.

---

## 🧠 Architecture Overview

This backend follows a **domain-driven GraphQL architecture**.

Flow of responsibility (TOP → BOTTOM):

GraphQL Resolver  
→ Service (business rules)  
→ Repository (DB access)  
→ Drizzle Schema (database source of truth)

Resolvers NEVER talk to the database directly.

---

## 📦 Project Root

api/
├─ index.ts                → API entry point
├─ docker-compose.yml      → Local infra
├─ migrate.ts              → Drizzle migration runner
├─ seed.ts                 → DB seed
├─ database/               → Database layer
└─ src/                    → Application logic

---

## 🗄️ Database Layer (STRICT RULES)

database/
├─ schema/                 → Drizzle table definitions (SOURCE OF TRUTH)
├─ migrations/             → Generated migrations (DO NOT EDIT)
├─ index.ts                → DB connection

Rules:
- Any DB change MUST start in `database/schema`
- Migrations must reflect schema changes
- Never write SQL outside repositories

---

## 🧩 GraphQL Layer

src/graphql/
├─ schema/                 → Shared GraphQL types & scalars
├─ directives/             → Custom directives
├─ context.ts              → Request context (auth, user, db)
├─ createContext.ts        → Context builder

Rules:
- GraphQL schema defines the API contract
- Do NOT change schema unless explicitly asked
- Resolvers must match schema exactly

---

## 🧠 Domain Models (PRIMARY WORK AREA)

src/models/
├─ Business/
│  ├─ Business.graphql     → Domain GraphQL schema
│  └─ resolvers/           → Business resolvers
├─ Order/
├─ Product/
├─ ProductCategory/
├─ ProductSubcategory/
├─ User/
├─ General/                → Shared GraphQL utilities

Rules:
- Each domain owns its schema + resolvers
- When working on a feature, ALWAYS start by reading `*.graphql`
- Do NOT mix logic across domains

Examples:
- Business feature → src/models/Business
- Order logic → src/models/Order
- Shared scalars/types → General

---

## 🧱 Services Layer (BUSINESS LOGIC)

src/services/

Rules:
- Contains business rules and workflows
- Called by resolvers
- Does NOT contain GraphQL or SQL

---

## 🗃️ Repository Layer (DB ACCESS ONLY)

src/repositories/
├─ AuthRepository.ts
├─ BusinessRepository.ts
├─ OrderRepository.ts
├─ ProductRepository.ts
├─ ProductCategoryRepository.ts

Rules:
- Repositories ONLY talk to the database
- No business logic here
- No GraphQL knowledge here
- Prefer using existing repositories before creating new ones

---

## 🌐 Routes (SECONDARY)

src/routes/

Rules:
- REST routes are secondary / legacy
- Prefer GraphQL unless explicitly told otherwise
- Do NOT duplicate logic already in GraphQL

---

## 🧪 Validators

src/validators/

Rules:
- Input validation only
- No DB access
- No business logic

---

## 🚫 Files & Folders You MUST NOT Touch

- database/migrations/*
- src/generated/*
- docker-compose.yml (unless infra task)
- Enums / shared types without approval

---

## 🧭 How to Execute Tasks

When given a task:

1. Identify the DOMAIN (Business, Order, Product, etc.)
2. Read the domain's `.graphql` file
3. Update resolvers ONLY if schema already supports it
4. Use services for logic
5. Use repositories for DB access
6. Make minimal, focused changes

---

## ❓ When Unsure

Ask ONE clear question before proceeding.
Do NOT guess structure or invent files.

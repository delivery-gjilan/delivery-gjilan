# API Project

This is an Express project with TypeScript, Drizzle ORM, and GraphQL Yoga, following Clean Architecture principles.

## Stack

- **Framework**: Express
- **Language**: TypeScript (Strict)
- **Database**: PostgreSQL with Drizzle ORM
- **API**: GraphQL Yoga
- **Codegen**: GraphQL Code Generator
- **Linting/Formatting**: ESLint, Prettier

## Structure

```
src/
  domain/           # Entities and Repository Interfaces
  application/      # Use Cases (Business Logic)
  interfaces/       # Interface Adapters (GraphQL Resolvers, Controllers)
    graphql/
      schemas/      # GraphQL Schema definitions (.graphql)
      resolvers/    # Resolver implementations
      generated/    # Generated types
  infrastructure/   # Frameworks & Drivers
    database/       # Drizzle setup and migrations
    server/         # Server configuration
  index.ts          # Entry point
```

## Scripts

- `npm run dev`: Run development server with hot reload
- `npm run build`: Build the project
- `npm run start`: Run the built project
- `npm run codegen`: Generate GraphQL types
- `npm run db:generate`: Generate SQL migrations from Drizzle schema
- `npm run db:migrate`: Apply migrations
- `npm run lint`: Run ESLint
- `npm run format`: Run Prettier

## Getting Started

1. Copy `.env.example` to `.env` and configure your database URL.
2. Run `npm install`.
3. Run `npm run db:generate` to create migrations.
4. Run `npm run dev` to start the server.
5. Visit `http://localhost:4000/graphql` for GraphiQL.

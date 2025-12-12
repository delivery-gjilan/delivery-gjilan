# NOTE

This instruction file contains guidelines **only for the `mobile-customer` and `mobile-driver` Expo apps**.  
Each app resides under its respective directory with the same name.  
Do not apply these rules or architecture instructions to any other project or directory.

# Project Architecture & Coding Guidelines

This document outlines the strict rules for development within this project. Follow these guidelines for all code generation and modification.

## 1. Directory Structure & Responsibilities

### `app/`

-   **Purpose**: Routing and Page Layouts ONLY.
-   **Restrictions**: Do not define complex UI components or business logic here.

### `modules/[module_name]/`

-   **Purpose**: Encapsulated features (e.g., `businesses`, `account`).
-   **Structure**: Each module must be self-contained with its own:
    -   `components/`: React Native components specific to the module.
    -   `hooks/`: Module-specific hooks.
    -   `utils/`: Module-specific utilities.
    -   `store/`: Zustand stores for module data/caching. (NOTE: we use apollo client so sometimes we can utilize the cache from apollo. If you are not sure if you should use zustand or apollo cache, ask the lead developer.)
    -   `services/`: Module-specific services.

### Root Directories (`components/`, `hooks/`, `store/`, `services/`, `utils/`)

-   **Purpose**: Shared resources used across multiple modules or the entire application.

## 2. Architecture & Data Flow

-   **GraphQL Integration**:

    -   We communicate with an external GraphQL API using **Apollo Client v4**.
    -   The Apollo Client setup is ready to use. Queries, mutations, and subscriptions are executed via this client.

-   **Operations Directory**:

    -   All GraphQL operations must reside under `graphql/operations`.
    -   Organize operations by API entities: e.g., `businesses`, `orders`, `products`, `users`.
    -   Inside each entity folder, create the following TypeScript files:
        -   `queries.ts`
        -   `mutations.ts`
        -   `subscriptions.ts`
        -   `index.ts` (for re-exporting all operations)
    -   Future restructuring is allowed if the number of operations grows.

-   **Defining Operations**:

    -   Use the `graphql` function from `@/gql` for type-safe operations:

        ```ts
        import { graphql } from "@/gql";

        export const GET_BUSINESSES = graphql(`
            query GetBusinesses {
                businesses {
                    id
                    name
                }
            }
        `);
        ```

    -   Name the operation constants with an uppercase letter to indicate they are GraphQL operations.
    -   Use these operations with Apollo Client hooks (`useQuery`, `useMutation`, `useSubscription`) without manually specifying types.
    -   Always ensure imports match **Apollo Client v4** conventions.

## 3. Styling & Theming

-   **Primary Method**: Use **NativeWind** classes (`className`) whenever possible.
-   **Fallback Method**: Use the `style` prop or component-specific props only when NativeWind is insufficient.
-   **Colors**:
    -   **Source of Truth**: `tailwind.config.js`.
    -   **Usage**: Use Tailwind utility classes (e.g., `bg-primary`, `text-text-secondary`).
    -   **JS Access**: If you need color values in JavaScript/TypeScript, use the `hooks/useTheme.ts` hook.
    -   **Prohibition**:
        -   Do NOT hardcode hex values or use colors not defined in the theme.
        -   Do NOT use the `shadow-sm` className. Use `elevation` (Android) or `shadow` props/styles (iOS) appropriately, or other shadow utilities if available, but `shadow-sm` is strictly forbidden.

## 4. Localization (i18n)

-   **Access**: Use the `hooks/useTranslations.ts` hook.
-   **Workflow for Adding Text**:
    1. **Update Schema**: Add the new key to `localization/schema.ts` (Zod schema).
    2. **Update JSONs**: Add translations for the new key in ALL JSON files within the `localization/` directory.
-   **Organization**: Keep translation keys logical and separated from application logic.

## 5. UI/UX & Platform Guidelines

-   **Cross-Platform**: Ensure all code works flawlessly on both **iOS** and **Android**.
-   **Design**:
    -   Implement modern, trending UI designs.
    -   Adhere strictly to the app's theme.
-   **Animations**: Always include transitions and animations where feasible to enhance user experience.
-   **Safe Area**:
    -   Use `react-native-safe-area-context` for handling safe areas (status bar, navigation bar).
    -   Do not use other packages for this purpose.

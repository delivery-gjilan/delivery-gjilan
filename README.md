# Delivery Gjilan

## Prerequisites

Ensure you have the following installed on your machine:

-   **Node.js**: v20 or higher
    ```bash
    node -v
    ```
-   **TypeScript**: v5.7 or higher
    ```bash
    tsc -v
    ```
-   **Docker**: v24
    ```bash
    docker --version
    ```
-   **Docker Compose**: v2
    ```bash
    docker compose version
    ```

---

## Development Environment Setup

### Required VSCode Extensions

Install the following extensions for the best development experience:

-   **ESLint** - JavaScript/TypeScript linting
-   **GraphQL: Language Feature Support** - GraphQL autocomplete and validation
-   **GraphQL: Syntax Highlighting** - Syntax highlighting for GraphQL
-   **JavaScript and TypeScript Nightly** - Latest TypeScript features
-   **Prettier - Code Formatter** - Code formatting
-   **Tailwind CSS IntelliSense** - Tailwind CSS autocomplete

### Initial Setup

1. **Install root dependencies:**

    ```bash
    npm install
    ```

    This sets up the monorepo workspace and installs GraphQLSP for TypeScript LSP support.

2. **Configure TypeScript to use workspace version:**

    - Open any TypeScript file in `admin-panel`
    - Press `Cmd/Ctrl + Shift + P`
    - Select **"TypeScript: Select TypeScript Version"** → **"Use Workspace Version"**
    - Restart TS Server: `Cmd/Ctrl + Shift + P` → **"TypeScript: Restart TS Server"**

3. **Configure Prettier as default formatter:**

    - Open any TypeScript file
    - Right click and select: **"Format Document With..."**
    - Select: **"Configure Default Formatter..."**
    - Choose **"Prettier - Code formatter"**

4. **Format frequently:**
    > **💡 Pro Tip**: Find the keyboard shortcut for "Format Document" (default: `Ctrl + Shift + I` on Linux/Windows, `Shift + Option + F` on Mac). Format your code frequently as you write to catch errors early and maintain consistent code style.

### GraphQL Operations Organization

GraphQL operations in the admin-panel are organized in `src/graphql/operations/` by domain:

```
src/graphql/operations/
├── businesses/
│   ├── queries.ts       # Business queries
│   ├── mutations.ts     # Business mutations
│   └── fragments.ts     # Reusable fragments
├── products/
│   ├── queries.ts
│   ├── mutations.ts
│   └── fragments.ts
└── productCategories/
    ├── queries.ts
    ├── mutations.ts
    └── fragments.ts
```

**Writing GraphQL Operations:**

-   Use the `graphql` function from `@/gql` to define operations
-   Each domain has separate files for queries, mutations, and fragments
-   Future: subscriptions will be added for real-time features

**Example:**

```typescript
import { graphql } from "@/gql";

export const GET_BUSINESSES = graphql(`
    query GetBusinesses {
        businesses {
            id
            name
            businessType
        }
    }
`);
```

**GraphQL Autocomplete:**

If you've set up everything correctly (workspace TypeScript version + GraphQLSP), you'll get:

-   ✅ Field autocomplete as you type
-   ✅ Hover information showing types and descriptions
-   ✅ Real-time error detection for invalid fields
-   ✅ Deprecation warnings

---

## Mobile Applications

We have two mobile applications: `mobile-customer` and `mobile-driver`. The setup process is similar for both.

### Setup & Run

1. Navigate to the application directory:

    ```bash
    cd mobile-customer
    # OR
    cd mobile-driver
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Start the development server:
    ```bash
    npm start
    ```

### Running on Device/Emulator

**Option 1: Expo Go (Physical Device)**

-   Install the **Expo Go** app on your phone.
-   Ensure your phone and computer are on the **same Wi-Fi network**.
-   Scan the QR code displayed in the terminal after running `npm start`.

**Option 2: Android Emulator**

-   Install **Android Studio**.
-   Add the following environment variables to your `~/.bashrc` or `~/.zshrc` (adjust paths as necessary for your system):
    ```bash
    # Android SDK paths for Expo development
    export ANDROID_HOME="/home/edon/Android/Sdk"
    export ANDROID_SDK_ROOT="/home/edon/Android/Sdk"
    export PATH="$PATH:/home/edon/Android/Sdk/platform-tools"
    ```
-   Run `npm start` and press `a` in the terminal to open the app in the Android Emulator.

---

## API & Database

### Initial Setup

1. Navigate to the API directory:

    ```bash
    cd api
    ```

2. Create the environment file:
   Create a `.env` file in the `api` directory with the exact contents of `.env.example`:

    ```bash
    cp .env.example .env
    ```

3. Install dependencies:
    ```bash
    npm install
    ```

### Database Initialization

1. Start the database container:

    ```bash
    cd database
    docker compose up -d
    # OR if you need sudo
    sudo docker compose up -d
    ```

    > **Troubleshooting**: If the container fails to start, port `8081` might be in use.
    >
    > - **Recommended**: Find and terminate the process using port `8081`.
    > - **Alternative**: Change the port in `api/database/docker-compose.yml` AND `api/.env` to an available port.

2. Apply migrations:
   Return to the `api` directory and run:
    ```bash
    npm run db:migrate
    ```
    _If this fails, please consult with Edon._

### Running the API

Start the development server:

```bash
npm run dev
```

**Development Workflow:**

-   The server automatically restarts on code changes.
-   **GraphQL Changes**: Modifying `.graphql` files (e.g., adding fields or queries) automatically triggers `codegen` to generate TypeScript resolvers, then restarts the server.
-   **Environment Variables**: Changes to `.env` require a manual server restart.

---

## Database Development

### Making Schema Changes

1. **Modify Schema**: Add or update tables in `api/database/schema`.
2. **Export New Tables**: If you added a new file, export it in `api/database/schema/index.ts`:

    ```typescript
    export * from "./new-table";
    ```

3. **Generate Migration**:

    ```bash
    npm run db:generate
    ```

    _This creates SQL migration scripts._

4. **Apply Migration**:

    ```bash
    npm run db:migrate
    ```

5. **Visualize Database**:
    ```bash
    npm run db:studio
    ```
    Open `https://local.drizzle.studio` in your browser to view and manage data.

> [!IMPORTANT] > **Do not push changes in the `drizzle` (migrations) folder without consulting the team.**

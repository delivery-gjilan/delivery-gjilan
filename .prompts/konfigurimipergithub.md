# Expo EAS + GitHub Branch Based Environment Builds (Dev / Production)

This guide explains how to configure **branch-based environments** for an Expo app so that:

* `dev` branch → **Dev app + Dev API**
* `main` branch → **Production app + Production API**

and **GitHub automatically triggers EAS builds to TestFlight**.

---

# 1. Environment Architecture

| Branch | App Name  | Bundle ID     | API               | Purpose          |
| ------ | --------- | ------------- | ----------------- | ---------------- |
| dev    | MyApp Dev | com.myapp.dev | dev-api.myapp.com | internal testing |
| main   | MyApp     | com.myapp     | api.myapp.com     | production       |

Both apps use **the same codebase** but different configuration.

---

# 2. Expo Dynamic Config

Create:

```
app.config.js
```

Example:

```javascript
export default ({ config }) => {
  const variant = process.env.APP_VARIANT;

  if (variant === "dev") {
    return {
      ...config,
      name: "MyApp Dev",
      ios: {
        bundleIdentifier: "com.myapp.dev"
      },
      extra: {
        API_URL: process.env.API_URL
      }
    };
  }

  return {
    ...config,
    name: "MyApp",
    ios: {
      bundleIdentifier: "com.myapp"
    },
    extra: {
      API_URL: process.env.API_URL
    }
  };
};
```

---

# 3. EAS Build Configuration

Create or edit:

```
eas.json
```

Example:

```json
{
  "build": {
    "development": {
      "env": {
        "APP_VARIANT": "dev",
        "API_URL": "https://dev-api.myapp.com"
      }
    },
    "production": {
      "env": {
        "APP_VARIANT": "prod",
        "API_URL": "https://api.myapp.com"
      }
    }
  }
}
```

---

# 4. Install EAS CLI

```
npm install -g eas-cli
```

Login:

```
eas login
```

---

# 5. Manual Builds (optional)

Dev build:

```
APP_VARIANT=dev eas build --profile development --platform ios
```

Production build:

```
APP_VARIANT=prod eas build --profile production --platform ios
```

---

# 6. GitHub Actions Auto Build

Create:

```
.github/workflows/eas-build.yml
```

Example pipeline:

```yaml
name: EAS Build

on:
  push:
    branches:
      - main
      - dev

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - run: npm install -g eas-cli

      - run: npm install

      - name: Build Dev
        if: github.ref == 'refs/heads/dev'
        run: eas build --platform ios --profile development --non-interactive

      - name: Build Production
        if: github.ref == 'refs/heads/main'
        run: eas build --platform ios --profile production --non-interactive
```

---

# 7. Automatic TestFlight Submission

Add submit config to `eas.json`:

```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "your@email.com"
      }
    }
  }
}
```

Then run builds with:

```
eas build --platform ios --profile production --auto-submit
```

This uploads the build directly to **TestFlight**.

---

# 8. Recommended Git Workflow

Branch structure:

```
feature/*
   ↓
dev
   ↓
main
```

Flow:

1. Develop features in `feature/*`
2. Merge into `dev` → **TestFlight dev build**
3. Merge `dev` into `main` → **production TestFlight build**
4. Submit production build to App Store.

---

# 9. Optional (Recommended)

Use **EAS Update** for OTA updates:

* Push UI fixes without rebuilding.
* Faster iteration during TestFlight testing.

Example:

```
eas update --branch dev
```

---

# Result

| Action         | Result                      |
| -------------- | --------------------------- |
| Push to `dev`  | Dev TestFlight build        |
| Push to `main` | Production TestFlight build |
| Manual build   | Local control               |

---

# Summary

This setup provides:

* **Branch-based environments**
* **Automatic TestFlight builds**
* **Separate dev and production apps**
* **Single shared codebase**

Ideal for fast iteration while maintaining a safe production pipeline.

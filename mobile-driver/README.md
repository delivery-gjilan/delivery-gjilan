# Mobile Driver - Delivery Gjilan

Driver app with heartbeat, navigation, and delivery execution flows, built with Expo and React Native.

## Get started

1. Node and npm versions

   Use Node version greater than 18. Use Node version greater than 20 for best results.

   Use npm version greater than 10 if possible. The project works with lower versions, but newer versions reduce install issues.
   ```bash
   node --version # >18 preferably >20
   npm --version # >10
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

### Dependency Notes

If something in the project does not work and you have tried everything else, check if upgrading any of these packages helps. The versions below were recommended in the NativeWind documentation, but some may require updates to work with your environment:

```
react-native-reanimated@~3.17.4  (we upgraded to 4.1.1 due to issues)
react-native-safe-area-context@5.4.0
tailwindcss@^3.4.17
prettier-plugin-tailwindcss@^0.5.11
```

Adjust versions as needed if you encounter compatibility issues.
However, if you change the versions and the problem still persists, make sure to revert the version changes.

## Project Structure and Development Rules

This project uses a flat shared structure (not per-domain modules). The `modules/` directory only contains the `expo-mapbox-navigation` native module. All other domain logic lives in top-level shared directories.

Top level directories contain all shared and feature logic:

- `app/` — All routes. Route files render screens only. No business logic.
- `components/` — Shared UI components used across screens.
- `hooks/` — All React hooks (auth, heartbeat, notifications, PTT, navigation camera, etc.).
- `store/` — Zustand stores: `authStore`, `navigationStore`, `navigationLocationStore`, `orderAcceptStore`, `useLocaleStore`, `useThemeStore`.
- `graphql/operations/` — GraphQL query/mutation/subscription definitions.
- `lib/` — Apollo client setup, auth session utilities.
- `utils/` — Shared helpers, formatters, and constants.
- `localization/` — Translation JSONs and schema validation.
- `modules/` — Contains only the `expo-mapbox-navigation` native Expo module.
- `assets/` — Images and static files.

Coding rules:
- All business logic stays in hooks or stores. Screens only call hooks.
- Do not write API code inside screens. Use GraphQL operations from `graphql/operations/`.
- Stores handle global state (auth, navigation, order accept). Hooks connect screens to stores and the Apollo client.
- Use the repository convention: queries go through Apollo Client not raw `fetch`, except the background heartbeat task which runs in a headless context and must use `fetch`.
- Shared logic never depends on app/ screens.

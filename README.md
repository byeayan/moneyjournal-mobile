# MoneyJournal Mobile

Expo React Native client for MoneyJournal.

## Setup

```bash
npm install
```

## Run

```bash
npm run start
```

Optional platform commands:

```bash
npm run android
npm run ios
npm run web
```

## Quality Checks

```bash
npm run lint
npx tsc --noEmit
```

## API Base URL

Set `EXPO_PUBLIC_API_BASE_URL` if needed, for example:

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:5000/api
```

PowerShell example:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL="http://localhost:5000/api"
npm run start
```

If not set, the app falls back to local development defaults.

Run one of these:

1. SQL directly against Postgres
- File: scripts/set-business-locations-gjilan.sql

2. Drizzle/Node script from the API workspace
```powershell
Set-Location c:\projects\delivery-gjilan\api
npx tsx scripts/set-business-locations-gjilan.ts
```

Default location used:
- Center: 42.4635, 21.4694
- Distribution: stable pseudo-random spread within about 250m to 1.8km of central Gjilan
- Address label: Gjilan, Kosovo (approx)

# MDS Update Workflow

> **How to keep MDS consistent with project changes.**
> Read this before updating any documentation file.

---

## 1. When to Update MDS

| Trigger | Action |
|---------|--------|
| GraphQL schema change | Update B1 (API), affected domain MDS (B2/BL1/etc.), and M* input docs |
| New/changed mutation or query | Update the MDS that owns the domain + any dependent MDS listed in `Depended-By` |
| Service layer refactor | Update the MDS referencing that service (check `File Source Code References` in MDS_INDEX) |
| New mobile screen or flow | Update M1 (Overview) + relevant flow MDS (BL3, M4, M5) |
| Admin panel page change | Update UI1 + relevant backend MDS if mutation contract changed |
| Database schema migration | Update BL1 (if settlements/promotions), BL2 (if products/categories), B2 (if orders) |
| Security fix applied | Update O6 (mark as resolved), O5 (if posture changed) |
| Monitoring/observability change | Update O1 or O2, PKG6 if docker-compose changed |
| New environment or CI/CD change | Update O7 (Environments), O8 (Testing) |
| Dependency upgrade | Update O6 if security-related |
| Push notification change | Update O3, O4, M2, M3 as applicable |

## 2. Update Procedure

### Step 1: Identify Affected MDS

1. Open [MDS_INDEX.md](MDS_INDEX.md)
2. Find the changed file in `File Source Code References` → note which MDS IDs reference it
3. For each affected MDS, check its `Depends-On` and `Depended-By` for ripple effects

### Step 2: Update Content

1. Update the primary MDS with the new facts
2. Verify all `Depends-On` MDS are still accurate (no stale references)
3. If a new dependency was introduced, add it to both:
   - The `Depends-On` comment in the updated file
   - The `Depended-By` comment in the referenced file

### Step 3: Update Index

1. If a new MDS file was created:
   - Add a row to the Quick Lookup Table in MDS_INDEX.md
   - Add it to the Dependency Graph
   - Add it to the relevant Domain-to-MDS Mapping section
2. Update `Last full scan` date in MDS_INDEX.md versioning section
3. If broken links were fixed, remove them from the Known Issues table

### Step 4: Bump Timestamp

Update the `Updated: YYYY-MM-DD` in the navigation comment of every MDS you touched.

## 3. Navigation Hint Format

Every docs/ MDS file uses this comment block at the top:

```markdown
<!-- MDS:{ID} | Domain: {domain} | Updated: {date} -->
<!-- Depends-On: {list of MDS IDs this file reads from} -->
<!-- Depended-By: {list of MDS IDs that read from this file} -->
<!-- Nav: {plain-English guidance on what to update if this file changes} -->
```

### Rules
- `Depends-On`: IDs of MDS files whose content this file references or relies on
- `Depended-By`: IDs of MDS files that reference or rely on this file's content
- `Nav`: Human-readable sentence(s) explaining the impact chain
- Always keep these bidirectional: if A depends on B, then B's `Depended-By` must include A

## 4. Agent Optimization Guidelines

### Token-Efficient Reads

| Goal | Strategy |
|------|----------|
| Find which MDS to read | Read MDS_INDEX.md → Quick Lookup Table + Domain-to-MDS Mapping |
| Understand impact of a code change | Read MDS_INDEX.md → File Source Code References → find MDS IDs |
| Read only relevant content | Use MDS ID navigation comments at file top to decide scope |
| Skip unrelated domains | Use Domain-to-MDS Mapping to filter by domain |

### Minimize Redundant Reads

1. **Start with MDS_INDEX.md** — never read all 26 docs files unless doing a full audit
2. **Use navigation hints** — the `Depends-On` / `Depended-By` links tell you exactly which files to chain-read
3. **Domain filtering** — if working on orders, read only "Orders Domain" row from the mapping table
4. **File matching** — if a code change touched `DriverHeartbeatHandler.ts`, look up that file in the Source Code References → find `A1, B4, M3` → read only those three

### Summary Tables for Large Domains

For domains with 4+ MDS files, the MDS_INDEX.md Domain-to-MDS Mapping provides pre-built concern-to-file tables. Use these instead of scanning all files.

## 5. Creating New MDS Files

1. Choose the correct directory:
   - `docs/BACKEND/` — API services, resolvers, data layer
   - `docs/MOBILE/` — Mobile app behavior, flows, audits
   - `docs/BUSINESS_LOGIC/` — Cross-cutting domain flows (orders, products, finance)
   - `docs/OPERATIONS/` — Infrastructure, CI/CD, security, monitoring, releases
   - `docs/` (root) — System-level or UI bridging docs

2. Add the navigation comment block at the top with a new MDS ID:
   - Backend: `B{next}`, Mobile: `M{next}`, Business Logic: `BL{next}`, Operations: `O{next}`, UI: `UI{next}`

3. Register in MDS_INDEX.md:
   - Add to Quick Lookup Table
   - Add to Dependency Graph
   - Add to Domain-to-MDS Mapping
   - Add any source code files to File Source Code References

4. Update `Depended-By` in all files this new MDS depends on

## 6. Deleting or Archiving MDS Files

1. Remove the row from MDS_INDEX.md Quick Lookup Table
2. Remove from Dependency Graph
3. Remove from Domain-to-MDS Mapping
4. Search all MDS files for references to the deleted ID → remove from `Depends-On` / `Depended-By`
5. Remove from docs/README.md index

## 7. Consistency Checks (Periodic)

Run these checks monthly or before major releases:

- [ ] Every docs/ file has a navigation comment block
- [ ] Every `Depends-On` reference has a matching `Depended-By` in the target
- [ ] Every file in docs/ is listed in MDS_INDEX.md Quick Lookup Table
- [ ] Every file in docs/ is listed in docs/README.md
- [ ] All links in root README.md resolve to existing files
- [ ] All links in package READMEs resolve to existing files
- [ ] File Source Code References in MDS_INDEX.md match actual file locations
- [ ] No MDS references deleted or renamed source files

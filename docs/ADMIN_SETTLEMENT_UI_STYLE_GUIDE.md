# Settlement UI Style Guide (Mobile + Admin)

## Theme Palette (aligned with mobile-customer)
- Primary accent: `#2DD4BF`
- Background (dark): `#0F172A`
- Card (dark): `#1E293B`
- Border (dark): `#334155`
- Text primary: `#FFFFFF`
- Text secondary: `#94A3B8`
- Success / positive net: `#22C55E`
- Expense / destructive: `#EF4444`
- Warning / pending: `#F59E0B`

## Settlement Table Styling Rules
- Use one elevated card container with radius `14-16` and border `#334155`.
- Header row:
  - Background: slightly darker than card (`~8-12%` darker)
  - Text: uppercase, small (`11-12px`), semibold, secondary color
- Body rows:
  - Alternating subtle row backgrounds for readability
  - Minimum row height `44px`
  - Vertical rhythm with `10-12px` row padding
- Net column:
  - Always positive green (`#22C55E`) for visual consistency
  - Right aligned numeric values
- Payable emphasis:
  - Subtle left accent border (`2-3px`, `#22C55E`)
  - No heavy badges when row itself communicates meaning
- Status chips:
  - Keep compact, single-line, with low-alpha background
  - Map statuses to consistent color tokens

## Interaction Patterns
- Pull-to-refresh only on mobile settlement lists.
- Row tap opens details bottom sheet (items, delivery, discounts, settlement breakdown).
- Pagination controls should be compact and centered below the table.
- Keep one primary action per context (avoid multiple competing CTAs).

## Admin Panel Refactor Recommendations
1. **Layout hierarchy**
   - Move filters into a single top toolbar card.
   - Keep stats cards in one row beneath filters.
   - Place settlement requests in a dedicated section card, visually separated from settlement rows.

2. **Table redesign**
   - Use sticky table header with compact column labels.
   - Standardize spacing and numeric alignment for all amount columns.
   - Replace loud badges with subtle chips; reserve bright colors for key status only.

3. **Actions**
   - Primary action: `Request Settlement`.
   - Secondary actions grouped in overflow menu (`...`) to reduce clutter.
   - Show confirmation dialogs with clear amount + period summary before apply.

4. **Color consistency**
   - Remove ad-hoc hex values from admin settlements page.
   - Introduce semantic tokens (primary/success/warning/danger/subtext/border) and use everywhere.

5. **Auditability UX**
   - Add a timeline block per business showing: requested → accepted/disputed → paid.
   - Keep all timestamps in same format and timezone handling.

## Localization Notes
- All user-facing settlement labels should be key-based (no inline hardcoded strings).
- Keep `en` and `al` dictionaries parallel with identical keys.
- For dynamic strings, use interpolation placeholders (e.g., `{{amount}}`, `{{count}}`).

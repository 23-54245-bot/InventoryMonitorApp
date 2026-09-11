## Plan: Figma-Driven Inventory Redesign

Rebuild the current Expo Router inventory app to match the provided mobile inventory design as closely as possible. The screenshots confirm these target surfaces: login, home/dashboard, inventory list, reports, alerts, profile, and a barcode scanner modal, along with the blue header style, rounded cards, bottom tab navigation, summary metrics, chart sections, settings toggles, and alert badges. The current app already has a working shell, tabs, static inventory data, and some safety-stock/reporting logic, so the safest path is to map the screens onto those existing surfaces first, then extend the data model and routes only where the design truly requires it.

**Steps**
1. Lock the source design reference before implementation. The shared Figma link cannot be opened here because the viewer requires WebGL, so the next usable input is screenshots, exported frames, or a frame-by-frame description of the sample.
2. Audit the current app shell and identify which parts can be reused unchanged versus restyled: root provider shell, tab layout, auth gating, inventory data helpers, and reusable text/view primitives.
3. Translate the Figma information architecture into the Expo Router structure, including any new tab(s), nested routes, modal screens, onboarding/login states, barcode scanning entry points, filters, detail views, or settings screens that the design introduces.
4. Define a shared design token layer that can drive the whole app consistently, replacing the current mix of Paper theme colors, template constants, and screen-local hardcoded values with a single source for spacing, typography, colors, radii, shadows, and status colors.
5. Rebuild the highest-visibility screens first, likely the dashboard/home, inventory list/detail, alerts, reports, and profile/settings surfaces, using reusable card, stat, chip, progress, search, and empty-state patterns that match the Figma components.
6. Expand or reshape the data model only as needed for the Figma sample, such as richer item metadata, filtering/sorting fields, chart/report inputs, alert states, scan metadata, or action affordances like add/edit/delete, while keeping helper functions deterministic and easy to test.
7. Add any cross-screen interaction patterns from the design, such as search, segmented controls, barcode scanning, bottom sheets, modals, detail drill-downs, status badges, and loading/empty/error states, then wire them into the existing route and auth flow.
8. Verify screen parity and behavior with targeted checks after each major slice: lint/typecheck, route access behavior, and visual/manual comparison against the Figma screens on the relevant device sizes.

**Relevant files**
- `c:/Users/jedeann/Documents/InventoryMonitorApp/src/app/_layout.tsx` - root provider shell and Paper theme entry point.
- `c:/Users/jedeann/Documents/InventoryMonitorApp/src/app/(tabs)/_layout.tsx` - tab router, allowed-route gating, and tab appearance.
- `c:/Users/jedeann/Documents/InventoryMonitorApp/src/app/(tabs)/dashboard.tsx` - current home/dashboard composition and safety stock visuals.
- `c:/Users/jedeann/Documents/InventoryMonitorApp/src/app/(tabs)/inventory.tsx` - inventory list/search surface and item card patterns.
- `c:/Users/jedeann/Documents/InventoryMonitorApp/src/app/(tabs)/alerts.tsx` - alert presentation and severity styling.
- `c:/Users/jedeann/Documents/InventoryMonitorApp/src/app/(tabs)/reports.tsx` - chart/KPI/period-switcher patterns.
- `c:/Users/jedeann/Documents/InventoryMonitorApp/src/app/(tabs)/profile.tsx` and `c:/Users/jedeann/Documents/InventoryMonitorApp/src/app/(tabs)/settings.tsx` - account/settings surfaces.
- `c:/Users/jedeann/Documents/InventoryMonitorApp/src/data/inventory.ts` - inventory types, summary helpers, and alert derivations.
- `c:/Users/jedeann/Documents/InventoryMonitorApp/src/context/auth.tsx` - route access rules and navigation gating.
- `c:/Users/jedeann/Documents/InventoryMonitorApp/src/constants/theme.ts` and `c:/Users/jedeann/Documents/InventoryMonitorApp/src/global.css` - current theme tokens and typography baseline.
- `c:/Users/jedeann/Documents/InventoryMonitorApp/src/components/*` - reusable UI primitives that can be restyled or replaced.

**Verification**
1. Once the Figma frames are available, build a screen inventory that lists every component, state, and interaction the app must reproduce before writing code.
2. After implementation, run the project lint/typecheck path and validate the route shell still redirects and gates correctly across the affected routes.
3. Manually verify the key screens at phone and tablet widths against the Figma sample, including empty/loading/error states, scanner entry points, and low-stock edge cases.

**Decisions**
- Preserve the existing Expo Router + auth shell unless the Figma sample explicitly requires a different navigation structure.
- Treat the current inventory data as the canonical baseline and extend it only for design-required fields and states.
- Aim for both design fidelity and actual feature parity, including the real camera-based barcode scanner.
- Because the Figma link is not readable in this environment and exports may be subscription-gated, screenshots, screen captures, or exported frames are required to avoid guesswork.

**Further Considerations**
1. If you can share screenshots or exported frames, I can convert this into a screen-by-screen implementation plan with exact component responsibilities.
2. Confirm whether the app should stay single-user/local-data only, or whether the design implies persistence, sync, or real CRUD actions.
3. Confirm whether the barcode scanner should be a real camera flow or a mocked UI surface that only matches the sample visually.
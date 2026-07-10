# Memory: index.md
Updated: now

# Project Memory

## Core
- Tema: SENT AI Drone Mapping. Purple-dark clean (no neon, no glow berlebihan).
- Flat aesthetic: No text shadows, pulsate animations, drop shadows berlebihan.
- Compact typography: Use very small fonts (text-[10px] to text-xs) across primary screens.
- Auth UI: Priority is "Nomor WhatsApp". NEVER mention "Email" in auth UI labels or placeholders.
- Text overflow: Use `break-all` and `min-w-0` for currency/long numbers. NEVER truncate with ellipses.
- Mobile Dialogs: Must use fixed footer for action buttons and ScrollArea for form inputs/lists.
- Istilah: produk = "Drone", sewa = "Membeli", validity = "Hari melayani XD", balance = "Saldo kuantitatif", recharge = "Isi Ulang/Deposito", withdraw = "Tarik".

## Memories
- [Drone Rebrand](mem://design/drone-rebrand) — Full rebrand ke tema drone rental purple-dark
- [App Purpose](mem://business/app-purpose) — White-label transactional investment app
- [Daily Income Claiming](mem://features/daily-income-claiming) — Manual batch claiming on Home, individual on Account
- [Referral RLS](mem://tech/database-referral-rls-policy) — get_my_referral_code() function to prevent infinite recursion
- [Referral Rewards](mem://features/referral-reward-structure) — 3-tier structure (A, B, C) for Purchase & Daily Profit
- [VIP System](mem://features/vip-tier-system) — VIP 0-5 with configurable thresholds via vip_settings table
- [Auth Flow](mem://features/auth-whatsapp-primary) — WhatsApp OTP via Fonnte, maps phone to dummy email
- [Multi-quantity Investment](mem://features/multi-quantity-investment) — Price/profit multiplier per product transaction
- [Footer Navigation](mem://design/footer-navigation-layout) — 5-column grid Rumah/Toko/Beranda(center)/Tim/Saya
- [Mobile Responsiveness](mem://design/mobile-dialog-responsiveness) — Fixed dialog footers, ScrollArea for inputs
- [Admin Recovery](mem://tech/admin-recovery-bypass) — admin-reset-password Edge Function fallback using service role
- [OTP Limits](mem://tech/otp-rate-limiting) — Max 1/min and 5/hour per phone number
- [Auth UI](mem://design/auth-ui-labels) — "Nomor WhatsApp" only, absolutely no email labels
- [Aesthetic](mem://style/aesthetic-clean-flat) — Strictly clean and flat UI components
- [Admin Account](mem://admin/account-mapping) — Hardcoded credentials mapping zuperatmind to 088788738338
- [Theme Persistence](mem://style/theme-persistence) — Dark and Light Clean toggles via ThemeProvider
- [Text Handling](mem://design/responsive-text-handling) — Responsive text sizing and wrap-all instead of truncation
- [Admin Management](mem://features/admin-user-management) — Permanent user deletion and role toggles
- [Daily Check-in](mem://features/daily-checkin-system) — 7-day Mon-Sun random reward grid, strictly current day
- [Product Catalog](mem://features/product-catalog-categorization) — Reguler, Promo, VIP tabs with dynamic discounting
- [Investment Persistence](mem://tech/investment-data-persistence) — Snapshot financial terms for deleted products
- [Compact Typography](mem://style/compact-typography) — High-density small fonts for modern aesthetic
- [Component Layouts](mem://design/ui-component-layouts) — Layout specs for Profile, Team, and Product cards
- [Fonnte Dependency](mem://tech/external-service-fonnte-dependency) — Requires connected device in dashboard for OTP
- [Referral Tier Colors](mem://style/referral-tier-colors) — Level B light blue, Level C light amber (no dark/neon)

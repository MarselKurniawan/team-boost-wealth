# Rencana Update

## Bagian A — 3 Fitur Baru

### 1. Produk dengan 2 Konsep Profit
Tambah kolom `profit_mode` di tabel `products`:
- `daily` — profit masuk saldo tiap 24 jam (perilaku sekarang)
- `locked` — profit terkunci selama masa kontrak, dibayar sekaligus saat kontrak selesai

Perubahan:
- Migration: `profit_mode text default 'daily'` di `products` dan `investments` (snapshot).
- Edge Function `auto-claim-profits` + fungsi `claim_investment_atomic`: kalau `profit_mode='locked'`, jangan tambah saldo tiap hari. Kumpulkan `total_earned` di record investment. Saat `days_remaining` mencapai 0, baru transfer `total_income` sekaligus ke saldo + buat transaksi `income` "Payout kontrak selesai".
- UI Home / Account: tampilkan badge "Locked" + hitung mundur sisa hari + "Total payout saat selesai".
- Admin panel produk: dropdown pilih mode profit.

### 2. VIP Level Manual (bukan otomatis)
- Hilangkan auto-upgrade VIP berdasarkan jumlah downline.
- Panel Admin → daftar user → tombol "Ubah VIP" (0–5) yang langsung update `profiles.vip_level`.
- Tetap simpan `vip_settings` sebagai referensi (opsional ditampilkan sebagai info saja).
- Hapus/nonaktifkan trigger atau logic frontend yang menaikkan VIP otomatis.

### 3. Produk Buka/Tutup Bertahap
- Kolom `is_active` sudah ada — dipakai sebagai on/off publish.
- Admin panel produk: toggle switch "Buka untuk member" per produk.
- Halaman Product user: hanya render produk `is_active=true`. Produk `false` tidak tampil sama sekali (bukan grayed-out).

## Bagian B — Redesign Total

### Visual Language
- Background: putih bersih (`#ffffff`).
- Semua teks utama: biru (`#1e40af` / biru tua).
- Font: **Montserrat** (import Google Fonts, ganti semua `font-sans`).
- Hilangkan semua efek: icon spark, glow, gradient warna-warni, animasi pulsate.
- Semua kartu/komponen ganti jadi bentuk **modal-style**: rounded-2xl, border tipis biru, shadow lembut, padding lega.

### Layout & Navigasi
- Menu utama pindah ke **atas** (top nav bar) — bukan lagi footer 5-kolom.
- Icon menu diganti (set icon baru minimalis biru outline).
- Kartu produk redesign: layout modal-style, tanpa gradient warna-warni per tier.
- Halaman Profile: layout dirapikan ulang, icon-icon baru, style modal.

### Produk Katalog
- Hanya tampilkan produk yang admin buka (`is_active=true`).
- Referensi user: dari 10 produk hanya 3 yang tampil, sisanya dibuka bertahap oleh admin.

## Detail Teknis

- Migration SQL: `ALTER TABLE products ADD profit_mode text default 'daily' check (profit_mode in ('daily','locked'))`; sama untuk `investments`.
- Update `claim_investment_atomic` di Postgres agar handle mode `locked` (skip tambah saldo, akumulasi `total_earned`, payout saat completed).
- Frontend: buat `TopNav.tsx`, ganti `Layout.tsx` dari footer-nav ke top-nav.
- `index.css`: ubah token warna jadi biru+putih, import Montserrat.
- `tailwind.config.ts`: set `fontFamily.sans = ['Montserrat', ...]`.
- Hapus komponen efek: SpinWheel spark, gradient tier di ProductCard, dsb.

## Yang Perlu Dikonfirmasi

1. Untuk **produk mode `locked`**: kalau user beli banyak (qty > 1) apakah payout jadi satu transaksi besar di akhir? (Saya asumsikan ya.)
2. **VIP manual**: apakah reward referral (commission A/B/C 10%/3%/2%) tetap dihitung dari `vip_level` upline (perilaku sekarang)? (Saya asumsikan ya — cuma cara naik VIP-nya yang manual.)
3. **Top nav**: di mobile tetap jadi top bar horizontal, atau top bar + hamburger menu? (Saya asumsikan **top bar horizontal scrollable** biar tetap enak di mobile.)
4. Warna biru spesifik: pakai `#1e40af` (biru tua elegan) atau ada preferensi lain (mis. biru muda `#3b82f6`)?

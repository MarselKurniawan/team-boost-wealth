import LegalLayout from "@/components/LegalLayout";

const PrivacyPolicy = () => (
  <LegalLayout title="Kebijakan Privasi">
    <p>
      Kebijakan Privasi ini menjelaskan bagaimana InvestPro mengumpulkan, menggunakan, dan
      melindungi informasi pribadi Anda saat menggunakan layanan kami.
    </p>

    <h2>1. Informasi yang Kami Kumpulkan</h2>
    <ul>
      <li>Nomor WhatsApp dan nama yang Anda berikan saat pendaftaran.</li>
      <li>Informasi rekening bank/e-wallet untuk proses penarikan dana.</li>
      <li>Data transaksi: deposit, penarikan, investasi produk, dan komisi referral.</li>
      <li>Data teknis: alamat IP, jenis perangkat, dan riwayat akses untuk keamanan.</li>
    </ul>

    <h2>2. Cara Kami Menggunakan Informasi</h2>
    <ul>
      <li>Memproses transaksi deposit dan penarikan dana Anda.</li>
      <li>Mengirim kode OTP verifikasi melalui WhatsApp.</li>
      <li>Menghitung komisi referral dan distribusi penghasilan harian.</li>
      <li>Mencegah penipuan, pencucian uang, dan aktivitas mencurigakan.</li>
      <li>Memberikan layanan pelanggan yang responsif.</li>
    </ul>

    <h2>3. Perlindungan Data</h2>
    <p>
      Seluruh data pribadi dienkripsi dan disimpan di server yang aman. Akses dibatasi hanya
      untuk staf yang berwenang dengan otentikasi berlapis. Password disimpan dalam bentuk
      hash dan tidak dapat dibaca oleh siapapun, termasuk tim internal InvestPro.
    </p>

    <h2>4. Pembagian Data dengan Pihak Ketiga</h2>
    <ul>
      <li><strong>Gateway pembayaran</strong> (Jayapay): untuk memproses deposit & penarikan.</li>
      <li><strong>Penyedia OTP</strong> (Fonnte WhatsApp): untuk verifikasi nomor.</li>
      <li><strong>Otoritas hukum</strong>: hanya jika diwajibkan oleh hukum yang berlaku.</li>
    </ul>
    <p>Kami <strong>tidak menjual</strong> data pengguna kepada pihak ketiga manapun.</p>

    <h2>5. Hak Pengguna</h2>
    <ul>
      <li>Mengakses data pribadi yang kami simpan tentang Anda.</li>
      <li>Memperbarui atau memperbaiki data yang tidak akurat.</li>
      <li>Meminta penghapusan akun (setelah saldo & kewajiban diselesaikan).</li>
    </ul>

    <h2>6. Cookie & Penyimpanan Lokal</h2>
    <p>
      Kami menggunakan penyimpanan lokal browser untuk menjaga sesi login Anda dan preferensi
      tampilan (dark/light mode). Tidak ada cookie pelacak pihak ketiga yang digunakan.
    </p>

    <h2>7. Perubahan Kebijakan</h2>
    <p>
      InvestPro dapat memperbarui kebijakan ini sewaktu-waktu. Perubahan signifikan akan
      diinformasikan melalui notifikasi di aplikasi.
    </p>

    <h2>8. Kontak</h2>
    <p>
      Pertanyaan terkait privasi dapat dikirim ke <strong>support@investpro.id</strong> atau
      WhatsApp CS resmi kami.
    </p>
  </LegalLayout>
);

export default PrivacyPolicy;

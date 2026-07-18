import LegalLayout from "@/components/LegalLayout";

const TermsOfService = () => (
  <LegalLayout title="Syarat & Ketentuan Layanan">
    <p>
      Dengan mendaftar dan menggunakan layanan Terracycle, Anda menyatakan telah membaca,
      memahami, dan menyetujui seluruh syarat dan ketentuan berikut.
    </p>

    <h2>1. Kelayakan Pengguna</h2>
    <ul>
      <li>Pengguna minimal berusia 18 tahun atau telah cakap hukum.</li>
      <li>Pengguna adalah Warga Negara Indonesia dengan nomor WhatsApp aktif.</li>
      <li>Satu nomor WhatsApp hanya boleh memiliki satu akun.</li>
    </ul>

    <h2>2. Akun & Keamanan</h2>
    <ul>
      <li>Pengguna bertanggung jawab penuh atas keamanan password & PIN penarikan.</li>
      <li>Terracycle tidak bertanggung jawab atas kerugian akibat akun yang diretas karena kelalaian pengguna.</li>
      <li>Dilarang membagikan kode OTP kepada siapapun, termasuk staf Terracycle.</li>
    </ul>

    <h2>3. Deposit & Penarikan</h2>
    <ul>
      <li>Deposit diproses melalui gateway pembayaran resmi (Jayapay).</li>
      <li>Penarikan dana diproses ke rekening bank/e-wallet atas nama pemilik akun yang sama.</li>
      <li>Minimum penarikan dan biaya admin mengikuti ketentuan yang berlaku di aplikasi.</li>
      <li>Penarikan diproses pada jam kerja dan dapat memakan waktu 1×24 jam.</li>
    </ul>

    <h2>4. Produk Investasi</h2>
    <ul>
      <li>Setiap produk memiliki harga, penghasilan harian, dan masa berlaku yang tertera jelas.</li>
      <li>Penghasilan harian diberikan setiap hari selama masa berlaku produk aktif.</li>
      <li>Pengguna wajib melakukan klaim penghasilan harian secara manual.</li>
      <li>Produk yang telah dibeli tidak dapat dibatalkan atau direfund.</li>
    </ul>

    <h2>5. Program Referral</h2>
    <ul>
      <li>Komisi referral berlaku 3 level (A, B, C) sesuai struktur yang tertera di aplikasi.</li>
      <li>Komisi dihitung dari pembelian produk dan penghasilan harian downline.</li>
      <li>Dilarang menggunakan akun palsu, bot, atau metode curang untuk menambah downline.</li>
      <li>Pelanggaran akan mengakibatkan pembekuan komisi dan/atau penutupan akun.</li>
    </ul>

    <h2>6. Larangan</h2>
    <ul>
      <li>Menggunakan platform untuk pencucian uang atau aktivitas ilegal.</li>
      <li>Memanipulasi sistem, melakukan eksploitasi bug, atau serangan teknis.</li>
      <li>Menyebarkan informasi palsu mengatasnamakan Terracycle.</li>
      <li>Membuat lebih dari satu akun untuk satu individu.</li>
    </ul>

    <h2>7. Risiko Investasi</h2>
    <p>
      Setiap bentuk investasi memiliki risiko. Pengguna disarankan hanya menginvestasikan dana
      yang siap untuk risiko tersebut. Penghasilan masa lalu bukan jaminan hasil masa depan.
    </p>

    <h2>8. Penutupan Akun</h2>
    <p>
      Terracycle berhak menutup akun yang melanggar syarat ini tanpa pemberitahuan sebelumnya.
      Saldo dari aktivitas yang sah akan dikembalikan setelah verifikasi.
    </p>

    <h2>9. Perubahan Ketentuan</h2>
    <p>
      Ketentuan ini dapat diperbarui sewaktu-waktu. Penggunaan berkelanjutan setelah perubahan
      berarti Anda menyetujui versi terbaru.
    </p>

    <h2>10. Hukum yang Berlaku</h2>
    <p>
      Syarat ini tunduk pada hukum Republik Indonesia. Sengketa diselesaikan secara musyawarah,
      atau melalui pengadilan yang berwenang di Indonesia.
    </p>
  </LegalLayout>
);

export default TermsOfService;

# PRAKTIKUM PEMWEB MODUL 3 - C14

## Anggota Kelompok
| Nama | NRP | Bagian Tugas | Halaman |
| :--- | :---: | :---: | :--- |
| Chilmi Muhammad Ulin Nuha | 5027251003 | Orang 1 (No. 1) | `login.html` |
| Ni Putu Maqueenta Wijaya | 5027251004 | Orang 2 (No. 2 & 3) | `index.html`, `operator.html` |
| Naila Anggun Eka Rizqy | 5027251122 | Orang 3 (No. 4 & 5) | `layar.html`, `ambil-antrian.html` |

---

## Panduan Menjalankan Proyek
1. **Instalasi Dependensi:**
   ```bash
   npm install
   ```
2. **Kompilasi TypeScript:**
   * Build sekali:
     ```bash
     npm run build
     ```
   * Watch mode (otomatis kompilasi saat ada perubahan kode `.ts`):
     ```bash
     npm run watch
     ```
3. **Jalankan Aplikasi:**
   * Buka salah satu halaman menggunakan ekstensi **Live Server** di VS Code:
     - `login.html` (Halaman Login untuk staf/admin/operator)
     - `index.html` (Dashboard Admin - dilindungi Auth Guard)
     - `operator.html` (Panel Operator Pemanggilan - dilindungi Auth Guard)
     - `layar.html` (Layar Monitor Utama Publik - Real-time & Fullscreen)
     - `ambil-antrian.html` (Kios Cetak Tiket Mandiri Pengunjung)

---

## Standar & Struktur Data Local Storage (Koordinasi Kelompok)

### 1. Key Sesi Autentikasi (Orang 1)
- `token`: Access token DummyJSON
- `role`: Role pengguna (`admin` / `moderator` / `user`)
- `firstName`: Nama depan pengguna aktif

### 2. Key Master Jenis Antrean (Orang 2 & 3)
* Key: `hospital_queue_types` (fallback alias: `queue_types`)
* Struktur:
  ```typescript
  interface QueueType {
    code: string;       // 1 huruf kapital, contoh: "A", "B", "G"
    name: string;       // Nama layanan, contoh: "UMUM-1", "GIGI", "FARMASI"
    isActive: boolean;  // Status aktif (true / false)
    counter: number;    // Counter angka terakhir yang diterbitkan (misal: 3 -> tiket berikutnya 4 / A-004)
  }
  ```

### 3. Key Daftar Tiket Antrean (Orang 2 & 3)
* Key: `hospital_queue_tickets` (fallback alias: `queue_tickets`)
* Struktur:
  ```typescript
  type PriorityLevel = "VIP" | "Disabilitas" | "Lansia" | "Normal";
  type TicketStatus = "Menunggu" | "Dipanggil" | "Selesai" | "Dilewati";

  interface QueueTicket {
    id: string;               // ID unik tiket
    queueTypeCode: string;    // Kode jenis antrean, misal "A"
    ticketNumber: string;     // Format: KODE-001 (contoh: "A-001", "G-003")
    priority: PriorityLevel;  // "VIP" | "Disabilitas" | "Lansia" | "Normal"
    status: TicketStatus;     // "Menunggu" | "Dipanggil" | "Selesai" | "Dilewati"
    createdAt: string;        // ISO Timestamp pembuatan
    calledAt?: string;        // ISO Timestamp saat dipanggil operator
  }
  ```

---

## Fitur Tugas Orang 3 (Nomor 4 & 5)
- **Halaman Ambil Antrian (`ambil-antrian.html`):**
  - Tampilan self-service publik untuk pengunjung tanpa perlu login.
  - Kartu jenis antrean aktif otomatis muncul.
  - Tombol cepat *Ambil Nomor* (prioritas Normal) dan opsi pilihan prioritas (*Lansia*, *Disabilitas*, *VIP*).
  - Format nomor tiket otomatis bertambah: `KODE-001` (3 digit angka per layanan).
  - Modal struk tiket dengan opsi *Cetak Struk* dan estimasi jumlah antrean di depan.
  - Sinkronisasi otomatis (*polling* & *storage event*) tanpa reload halaman jika admin menambahkan atau mengubah jenis antrean di dashboard.
- **Halaman Layar Antrian (`layar.html`):**
  - Layar monitor utama yang menampilkan nomor yang sedang dipanggil (`Dipanggil`) per loket/layanan aktif.
  - Indikator kartu: badge status, nomor besar yang dipanggil, serta jumlah antrean yang sedang menunggu.
  - *Polling* otomatis setiap 2 detik tanpa reload halaman.
  - Tombol toggle Layar Penuh (*Fullscreen API*).
  - **Bonus Fitur:** Suara panggilan (*Audio Chime* & *Text-to-Speech*) bahasa Indonesia native via Web Audio API dan Web Speech API ketika ada antrean baru yang dipanggil.
# 📋 SIASIH — Sistem Administrasi Sekretaris Himpunan

> Aplikasi web berbasis PHP & MySQL untuk mengelola seluruh kegiatan administrasi organisasi himpunan mahasiswa secara digital, efisien, dan terintegrasi.

---

## 👤 Identitas Pengembang

| Keterangan   | Detail                        |
|--------------|-------------------------------|
| Nama         | Diana Anis Fardah             |
| NIM          | 2430511046                    |
| Mata Kuliah  | Pemrograman Web Dasar         |
| Program      | SIASIH (Sistem Administrasi Sekretaris Himpunan) |

---

## 📌 Deskripsi Aplikasi

**SIASIH** adalah sistem informasi administrasi berbasis web yang dirancang khusus untuk membantu sekretaris himpunan mahasiswa dalam mengelola seluruh kegiatan organisasi secara digital. Sistem ini menyederhanakan proses pencatatan surat masuk dan keluar, pengelolaan arsip dokumen, pengelolaan data anggota, penjadwalan kegiatan, pencatatan absensi, pembuatan notulensi rapat, hingga pembuatan dan penyimpanan tanda tangan digital.

Aplikasi dibangun menggunakan arsitektur **Single Page Application (SPA)** dengan antarmuka yang responsif, interaktif, dan dilengkapi efek suara serta animasi untuk meningkatkan pengalaman pengguna.

---

## 🗂️ Struktur Proyek

```
SistemAdministrasiSekretarisHimpunan(SIASIH)/
├── index.html              # Halaman utama (SPA — semua tampilan ada di sini)
├── style.css               # Seluruh gaya tampilan aplikasi
├── script.js               # Logika utama aplikasi (JavaScript)
├── sound.js                # Efek audio menggunakan Web Audio API
├── database.sql            # Skrip pembuatan dan struktur database MySQL
├── api/
│   ├── koneksi.php         # Koneksi database
│   ├── auth.php            # Login & logout (session PHP)
│   ├── surat_masuk.php     # CRUD surat masuk + sinkronisasi arsip
│   ├── surat_keluar.php    # CRUD surat keluar + generate surat
│   ├── upload_surat_masuk.php   # Upload multiple file surat masuk
│   ├── upload_surat_keluar.php  # Upload multiple file surat keluar
│   ├── dokumen.php         # CRUD arsip dokumen
│   ├── upload_dokumen.php  # Upload multiple file dokumen
│   ├── anggota.php         # CRUD data anggota himpunan
│   ├── kegiatan.php        # CRUD program kegiatan
│   ├── absensi.php         # CRUD sesi & peserta absensi
│   ├── notulensi.php       # CRUD notulensi rapat
│   └── signature.php       # Simpan & kelola tanda tangan digital (canvas)
└── uploads/
    ├── surat_masuk/        # Folder file lampiran surat masuk
    ├── surat_keluar/       # Folder file lampiran surat keluar
    └── dokumen/            # Folder file arsip dokumen
```

---

## 🛠️ Teknologi yang Digunakan

| Lapisan      | Teknologi                                     |
|--------------|-----------------------------------------------|
| Frontend     | HTML5, CSS3, JavaScript (Vanilla ES6+)        |
| Backend      | PHP 8 (REST API pattern)                      |
| Database     | MySQL                                         |
| Audio        | Web Audio API (tanpa file eksternal)          |
| Canvas       | HTML5 Canvas API (tanda tangan digital)       |
| Export       | SheetJS (Excel), jsPDF (PDF), Blob API (Word) |
| Ikon         | Font Awesome 6.5                              |
| Font         | Google Fonts — DM Serif Display & DM Sans     |

---

## ✅ Fitur-Fitur Aplikasi

### 1. 🔐 Login & Autentikasi Sesi

Sistem login dibangun menggunakan **session PHP** dengan validasi di sisi server.

- Halaman login terpisah dengan kartu login bergaya modern
- **Mascot animasi** pada layar login: karakter wajah yang bereaksi secara animasi:
  - Menutup mata (cover face) saat pengguna mengetik di kolom password
  - Animasi **sukses** (wajah senang) ketika login berhasil
  - Animasi **gagal** (wajah kecewa/goyang) ketika username atau password salah
- Validasi kredensial di backend (`api/auth.php`) dengan query aman menggunakan `mysqli_real_escape_string`
- Tampilan pesan error yang informatif bila login gagal
- Transisi fade-out halaman login dan fade-in dashboard saat berhasil masuk
- Tombol keluar (logout) yang mengakhiri sesi PHP secara aman
- Pengecekan sesi aktif otomatis saat aplikasi dibuka kembali

---

### 2. 📝 CRUD + Upload Multiple File

Seluruh modul utama mendukung operasi **Create, Read, Update, Delete** secara lengkap, dengan kemampuan upload banyak file sekaligus.

#### 📨 Manajemen Surat Masuk
- Tambah, ubah, dan hapus data surat masuk (nomor, tanggal, pengirim, perihal, status, disposisi, keterangan)
- **Upload multiple file lampiran** (PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, ZIP, RAR) per surat
- Tampilan daftar file terlampir dengan ikon sesuai tipe file dan tombol hapus per file
- Drag-and-drop area untuk upload file
- Sinkronisasi otomatis: setiap surat masuk beserta lampirannya otomatis tersimpan ke modul Arsip Dokumen
- Preview dan detail surat dalam modal
- Export surat masuk ke format Word (`.docx`) dan lembar disposisi

#### 📤 Manajemen Surat Keluar
- Tambah, ubah, dan hapus data surat keluar (nomor otomatis, tanggal, tujuan, lokasi, perihal, isi, penandatangan, status)
- **Upload multiple file lampiran** surat keluar
- Generator otomatis **preview surat resmi** lengkap dengan kop, isi, dan nama penandatangan
- Export surat keluar ke **Word (.docx)** dan **PDF** langsung dari aplikasi
- Penomoran surat otomatis berformat urut

#### 🗄️ Arsip Dokumen
- Tambah, ubah, dan hapus dokumen (nama, kategori, tanggal, deskripsi, tahun)
- **Upload multiple file** per dokumen (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, PNG, ZIP, RAR)
- Penghitungan total ukuran file secara otomatis dan ditampilkan pada tabel
- Arsip otomatis dari surat masuk dan surat keluar yang tersinkronisasi
- Badge warna untuk kategori dokumen
- Detail dokumen beserta daftar semua file terlampir dalam modal

#### 👥 Data Anggota
- CRUD lengkap data anggota (NIM, nama, jabatan, bidang, angkatan, nomor HP, email, status)
- Detail profil anggota dalam modal

#### 📅 Program Kegiatan
- CRUD program kegiatan (nama, tanggal mulai & selesai, tempat, penanggung jawab, divisi, status, deskripsi)
- Tampilan kartu kegiatan dengan status badge berwarna (Terlaksana, Berlangsung, Direncanakan, Dibatalkan)
- Integrasi dengan modul absensi (kegiatan dapat langsung dijadikan sesi absensi)

#### 📋 Absensi
- Buat sesi absensi berdasarkan kegiatan yang terdaftar
- Tambah peserta dari daftar anggota (pilih dari daftar atau input manual)
- Ubah status kehadiran: Hadir, Izin, Sakit, Alpha
- Rekap statistik kehadiran per sesi (jumlah Hadir, Izin, Sakit, Alpha)
- Detail peserta dalam tabel interaktif
- Export absensi ke Excel dan cetak langsung dari browser

#### 📖 Notulensi Rapat
- CRUD notulensi lengkap (judul, tanggal, jenis rapat, tempat, notulis, pimpinan rapat, waktu mulai & selesai, peserta, agenda, isi, kesimpulan, tindak lanjut, status)
- Detail notulensi dalam modal dengan tampilan terformat
- Export notulensi ke **Word (.docx)** dan **PDF**

---

### 3. 🔍 Pencarian Data & DataTable

Setiap modul dilengkapi fitur pencarian dan tampilan tabel yang informatif.

- **Search bar real-time** di setiap modul: surat masuk, surat keluar, arsip dokumen, anggota, notulensi
  - Pencarian langsung memfilter baris tabel secara instan tanpa reload halaman
  - Fungsi `searchTable(tableId, query)` yang generik dan digunakan di semua modul
- **Tabel data interaktif** dengan kolom yang relevan per modul
- Tombol aksi per baris: Detail (👁), Edit (✏️), Hapus (🗑)
- **Export data tabel** ke:
  - **Excel (.xlsx)** — menggunakan library SheetJS
  - **CSV** — langsung dari data tabel HTML
  - **Print** — layout cetak khusus via `window.print()`
- Badge status berwarna untuk memudahkan identifikasi data
- Tampilan kosong yang informatif ketika belum ada data

---

### 4. 🖊️ Canvas Tanda Tangan Digital

Modul **TTD Digital** memungkinkan pengguna membuat, menyimpan, dan menggunakan tanda tangan digital secara langsung di browser.

- **HTML5 Canvas API** sebagai media menggambar tanda tangan
- Dukungan input dari **mouse** dan **layar sentuh (touchscreen)** secara bersamaan
- Pengaturan warna pena (color picker) dan ketebalan garis (range slider) secara dinamis
- Tombol **Hapus** untuk membersihkan kanvas dan mengulang tanda tangan
- Validasi: tanda tangan hanya dapat disimpan jika kanvas tidak kosong (pengecekan pixel)
- Tanda tangan disimpan sebagai **Base64 PNG** ke database (`user_signatures` tabel) via `api/signature.php`
- Setiap user dapat menyimpan **banyak TTD** (tidak overwrite, tetap menyimpan riwayat)
- Daftar TTD tersimpan ditampilkan dengan pratinjau gambar dan metadata (nama, jabatan, label, waktu dibuat)
- Fitur **Download TTD** sebagai file PNG
- Fitur **Download TTD Card**: menghasilkan kartu tanda tangan profesional (nama, jabatan, garis tanda tangan) dalam format PNG menggunakan Canvas API
- TTD dapat digunakan pada surat keluar sebagai nama penandatangan
- Tombol hapus per TTD tersimpan

---

### 5. 🎨 Animasi & Audio

Aplikasi diperkaya dengan animasi visual dan efek suara untuk memberikan umpan balik interaktif kepada pengguna.

#### Animasi
- **Mascot Login**: karakter animasi CSS di halaman login yang menutup mata saat password diketik, bereaksi senang saat login berhasil, dan bereaksi kecewa saat login gagal
- **Transisi halaman login → dashboard**: efek fade-out dan fade-in yang halus (`opacity` transition)
- **Ripple effect** pada tombol: gelombang lingkaran yang muncul dari titik klik pengguna saat menekan tombol
- **Toast notification**: pesan notifikasi yang muncul dari pojok kanan bawah dengan animasi slide-in dan slide-out otomatis (sukses, error, info)
- **Animasi kartu kegiatan**: tampilan kartu dengan hover effect
- **Transisi navigasi antar halaman**: perpindahan antar modul tanpa reload

#### Audio (Web Audio API — tanpa file eksternal)
Semua efek suara dibangkitkan secara programatik menggunakan **Web Audio API** (`AudioContext`, `OscillatorNode`, `GainNode`) sehingga tidak memerlukan file audio eksternal:

| Event           | Efek Suara                              |
|-----------------|-----------------------------------------|
| Simpan sukses   | Dua nada naik (880Hz → 1320Hz, sine)   |
| Error / gagal   | Nada rendah kasar (220Hz, square)      |
| Klik tombol     | Klik singkat (600Hz, triangle)         |
| Hapus data      | Dua nada turun (440Hz → 220Hz, sawtooth) |
| Buka modal      | Nada pembuka (523Hz, sine)             |
| Tutup modal     | Nada penutup (392Hz, sine)             |

---

### 6. 🪟 Penggunaan Modal

Seluruh form tambah, edit, dan detail data ditampilkan menggunakan **modal (popup dialog)** tanpa berpindah halaman.

Modal yang tersedia dalam aplikasi:

| Nama Modal               | Fungsi                                              |
|--------------------------|-----------------------------------------------------|
| `modalSuratMasuk`        | Form tambah/edit surat masuk + upload file          |
| `modalSuratKeluar`       | Form tambah/edit surat keluar + upload file         |
| `modalPreviewSurat`      | Preview surat keluar dalam format resmi             |
| `modalDokumen`           | Form tambah/edit arsip dokumen + upload file        |
| `modalAnggota`           | Form tambah/edit data anggota                       |
| `modalKegiatan`          | Form tambah/edit program kegiatan                   |
| `modalBuatAbsensi`       | Form pembuatan sesi absensi baru                    |
| `modalTambahPeserta`     | Form tambah peserta ke sesi absensi (dari daftar anggota atau input manual) |
| `modalNotulensi`         | Form tambah/edit notulensi rapat (full form)        |
| `modalDetailNotulensi`   | Tampilan detail notulensi + tombol export           |
| `modalDetailSuratMasuk`  | Tampilan detail surat masuk + daftar file           |
| `modalDetailDokumen`     | Tampilan detail arsip + semua file terlampir        |
| `modalDetailAnggota`     | Tampilan profil lengkap anggota                     |

Fitur modal:
- Overlay gelap di belakang modal saat dibuka
- Tombol tutup (✕) di pojok kanan atas
- Klik overlay untuk menutup modal
- Efek suara `open` dan `close` saat modal dibuka/ditutup
- Tiga ukuran modal: `modal` (standar), `modal-lg` (besar), `modal-xl` (ekstra besar untuk preview)
- Form dalam modal direset otomatis saat ditutup

---

## 🗄️ Struktur Database

Database bernama `siasih` terdiri dari **12 tabel** utama:

| Tabel                  | Deskripsi                                       |
|------------------------|-------------------------------------------------|
| `users`                | Akun pengguna dengan role (admin, sekretaris, ketua) |
| `surat_masuk`          | Data surat masuk                                |
| `surat_masuk_files`    | File lampiran surat masuk (relasi ke surat_masuk) |
| `surat_keluar`         | Data surat keluar beserta isi dan penandatangan |
| `surat_keluar_files`   | File lampiran surat keluar                      |
| `dokumen`              | Arsip dokumen dengan sumber (manual/surat_masuk/surat_keluar) |
| `dokumen_files`        | File lampiran arsip dokumen                     |
| `anggota`              | Data anggota himpunan                           |
| `kegiatan`             | Program kegiatan organisasi                     |
| `absensi_sessions`     | Sesi absensi per kegiatan                       |
| `absensi_peserta`      | Data kehadiran per peserta per sesi             |
| `notulensi`            | Catatan notulensi rapat lengkap                 |
| `user_signatures`      | Tanda tangan digital per user (Base64 PNG)      |

---

## 📸 Ringkasan Tampilan

| Halaman         | Deskripsi                                                   |
|-----------------|-------------------------------------------------------------|
| Login           | Kartu login dengan mascot animasi interaktif                |
| Dashboard       | Statistik total surat, dokumen, anggota, kegiatan + agenda  |
| Manajemen Surat | Tab surat masuk & keluar dengan tabel, search, upload file  |
| Arsip Dokumen   | Daftar dokumen dengan filter, export, upload multi-file     |
| Data Anggota    | Tabel anggota dengan CRUD dan pencarian                     |
| Program Kegiatan| Kartu kegiatan dengan status badge dan filter               |
| Absensi         | Sesi per kegiatan, rekap status, export Excel               |
| Notulensi       | Form lengkap rapat, export Word & PDF                       |
| TTD Digital     | Canvas tanda tangan, simpan permanen, download kartu TTD    |

---
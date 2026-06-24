-- =========================
-- USERS
-- =========================
CREATE TABLE users_diana_2430511046 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nama VARCHAR(100),
    role ENUM('admin','sekretaris','ketua') DEFAULT 'sekretaris',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users_diana_2430511046
(username,password,nama,role)
VALUES
('admin','admin123','Administrator','admin');

-- =========================
-- SURAT MASUK
-- =========================
CREATE TABLE surat_masuk_diana_2430511046 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nomor VARCHAR(100) NOT NULL,
    tanggal DATE NOT NULL,
    pengirim VARCHAR(200) NOT NULL,
    perihal VARCHAR(255) NOT NULL,
    status VARCHAR(50),
    disposisi VARCHAR(100),
    ket TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- FILE SURAT MASUK
-- =========================
CREATE TABLE surat_masuk_files_diana_2430511046 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    surat_id INT NOT NULL,
    nama_file VARCHAR(255),
    file_path VARCHAR(500),
    FOREIGN KEY (surat_id)
    REFERENCES surat_masuk_diana_2430511046(id)
    ON DELETE CASCADE
);

-- =========================
-- SURAT KELUAR
-- =========================
CREATE TABLE surat_keluar_diana_2430511046 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nomor VARCHAR(100),
    tanggal DATE,
    tujuan VARCHAR(200),
    lokasi VARCHAR(200),
    perihal VARCHAR(255),
    isi LONGTEXT,
    ttd VARCHAR(100),
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE surat_keluar_files_diana_2430511046 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    surat_id INT,
    nama_file VARCHAR(255),
    FOREIGN KEY (surat_id)
    REFERENCES surat_keluar_diana_2430511046(id)
    ON DELETE CASCADE
);

-- =========================
-- DOKUMEN
-- =========================
CREATE TABLE dokumen_diana_2430511046 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(255),
    kategori VARCHAR(100),
    tanggal DATE,
    ukuran VARCHAR(50),
    deskripsi TEXT,
    tahun VARCHAR(10),
    sumber ENUM('manual','surat_masuk','surat_keluar') DEFAULT 'manual',
    sumber_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dokumen_files_diana_2430511046 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dokumen_id INT,
    nama_file VARCHAR(255),
    file_path VARCHAR(500),
    FOREIGN KEY (dokumen_id)
    REFERENCES dokumen_diana_2430511046(id)
    ON DELETE CASCADE
);

-- =========================
-- ANGGOTA
-- =========================
CREATE TABLE anggota_diana_2430511046 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nim VARCHAR(20),
    nama VARCHAR(150),
    jabatan VARCHAR(100),
    bidang VARCHAR(100),
    angkatan VARCHAR(10),
    hp VARCHAR(20),
    email VARCHAR(150),
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- KEGIATAN
-- =========================
CREATE TABLE kegiatan_diana_2430511046 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(255),
    mulai DATE,
    selesai DATE,
    tempat VARCHAR(255),
    pj VARCHAR(150),
    divisi VARCHAR(100),
    status VARCHAR(50),
    deskripsi TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- ABSENSI SESSION
-- =========================
CREATE TABLE absensi_sessions_diana_2430511046 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kegiatan_id INT,
    nama_session VARCHAR(255),
    tanggal DATE,
    keterangan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kegiatan_id)
    REFERENCES kegiatan_diana_2430511046(id)
    ON DELETE CASCADE
);

-- =========================
-- ABSENSI PESERTA
-- =========================
CREATE TABLE absensi_peserta_diana_2430511046 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT,
    nama VARCHAR(150),
    nim VARCHAR(20),
    status ENUM(
        'Hadir',
        'Izin',
        'Sakit',
        'Alpha'
    ) DEFAULT 'Hadir',
    waktu_absen DATETIME,
    FOREIGN KEY (session_id)
    REFERENCES absensi_sessions_diana_2430511046(id)
    ON DELETE CASCADE
);

-- =========================
-- NOTULENSI
-- =========================
CREATE TABLE notulensi_diana_2430511046 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    judul VARCHAR(255),
    tanggal DATE,
    jenis VARCHAR(100),
    tempat VARCHAR(255),
    notulis VARCHAR(150),
    pimpinan VARCHAR(150),
    mulai TIME,
    selesai TIME,
    peserta LONGTEXT,
    agenda LONGTEXT,
    isi LONGTEXT,
    kesimpulan LONGTEXT,
    tindak_lanjut LONGTEXT,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- USER SIGNATURES (TTD Permanen)
-- Simpan tanda tangan digital per user agar tidak hilang setelah refresh
-- =========================
-- user_signatures: menyimpan banyak TTD per user (tidak overwrite)
CREATE TABLE IF NOT EXISTS user_signatures_diana_2430511046 (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    ttd_image   LONGTEXT NOT NULL,
    ttd_nama    VARCHAR(150),
    ttd_jabatan VARCHAR(100),
    ttd_label   VARCHAR(150),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users_diana_2430511046(id) ON DELETE CASCADE
);
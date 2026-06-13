<?php

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type");

include "koneksi.php";

// ── Helper: sinkronisasi surat masuk → arsip dokumen ──────────────────────
function syncArsipSuratMasuk($conn, $suratId, $nomor, $tanggal, $pengirim, $perihal, $status) {
    $tahun = date('Y', strtotime($tanggal));
    $nama  = mysqli_real_escape_string($conn, "Surat Masuk: $perihal");
    $desk  = mysqli_real_escape_string($conn, "Dari: $pengirim | No: $nomor | Status: $status");

    // Cek apakah sudah ada arsip untuk surat ini
    $cek = mysqli_query($conn, "SELECT id FROM dokumen WHERE sumber='surat_masuk' AND sumber_id='$suratId'");

    if (mysqli_num_rows($cek) > 0) {
        // UPDATE arsip yang sudah ada
        $row = mysqli_fetch_assoc($cek);
        $dokId = $row['id'];
        mysqli_query($conn, "
            UPDATE dokumen SET
                nama      = '$nama',
                deskripsi = '$desk',
                tanggal   = '$tanggal',
                tahun     = '$tahun'
            WHERE id = '$dokId'
        ");
    } else {
        // INSERT arsip baru
        mysqli_query($conn, "
            INSERT INTO dokumen (nama, kategori, tanggal, ukuran, deskripsi, tahun, sumber, sumber_id)
            VALUES ('$nama','Surat Masuk','$tanggal','—','$desk','$tahun','surat_masuk','$suratId')
        ");
        $dokId = mysqli_insert_id($conn);
    }
    return $dokId;
}

// ── Helper: salin file dari surat_masuk_files → dokumen_files ─────────────
function syncFilesSuratMasuk($conn, $suratId, $dokId) {
    // Hapus file arsip lama yang bersumber dari surat ini
    mysqli_query($conn, "DELETE FROM dokumen_files WHERE dokumen_id='$dokId'");

    // Salin referensi file dari surat_masuk_files
    $files = mysqli_query($conn, "SELECT * FROM surat_masuk_files WHERE surat_id='$suratId'");
    $totalBytes = 0;
    while ($f = mysqli_fetch_assoc($files)) {
        $nama = mysqli_real_escape_string($conn, $f['nama_file']);
        $path = mysqli_real_escape_string($conn, $f['file_path'] ?? '');
        mysqli_query($conn, "
            INSERT INTO dokumen_files (dokumen_id, nama_file, file_path)
            VALUES ('$dokId','$nama','$path')
        ");
        // Hitung ukuran file fisik
        $fullPath = __DIR__ . '/../' . $f['file_path'];
        if (file_exists($fullPath)) $totalBytes += filesize($fullPath);
    }
    // Update kolom ukuran
    if ($totalBytes > 0) {
        $ukuran = $totalBytes >= 1048576
            ? round($totalBytes / 1048576, 2) . ' MB'
            : round($totalBytes / 1024, 1) . ' KB';
        mysqli_query($conn, "UPDATE dokumen SET ukuran='$ukuran' WHERE id='$dokId'");
    }
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    // READ
    case 'GET':
        $result = mysqli_query($conn, "SELECT * FROM surat_masuk ORDER BY id DESC");
        $data   = [];
        while ($row = mysqli_fetch_assoc($result)) {
            $id = $row['id'];
            $fileResult = mysqli_query($conn, "SELECT * FROM surat_masuk_files WHERE surat_id='$id'");
            $files = [];
            while ($f = mysqli_fetch_assoc($fileResult)) {
                $files[] = ['id' => $f['id'], 'name' => $f['nama_file'], 'file_path' => $f['file_path']];
            }
            $row['files'] = $files;
            $data[] = $row;
        }
        echo json_encode($data);
    break;

    // CREATE
    case 'POST':
        $d = json_decode(file_get_contents("php://input"), true);

        $nomor     = mysqli_real_escape_string($conn, $d['nomor']     ?? '');
        $tanggal   = mysqli_real_escape_string($conn, $d['tanggal']   ?? date('Y-m-d'));
        $pengirim  = mysqli_real_escape_string($conn, $d['pengirim']  ?? '');
        $perihal   = mysqli_real_escape_string($conn, $d['perihal']   ?? '');
        $status    = mysqli_real_escape_string($conn, $d['status']    ?? '');
        $disposisi = mysqli_real_escape_string($conn, $d['disposisi'] ?? '');
        $ket       = mysqli_real_escape_string($conn, $d['ket']       ?? '');

        mysqli_query($conn, "
            INSERT INTO surat_masuk (nomor,tanggal,pengirim,perihal,status,disposisi,ket)
            VALUES ('$nomor','$tanggal','$pengirim','$perihal','$status','$disposisi','$ket')
        ");
        $suratId = mysqli_insert_id($conn);

        // ── Auto-arsip ──────────────────────────────────────────────────────
        $dokId = syncArsipSuratMasuk($conn, $suratId, $nomor, $tanggal, $pengirim, $perihal, $status);

        echo json_encode(["success" => true, "id" => $suratId, "dokumen_id" => $dokId]);
    break;

    // UPDATE
    case 'PUT':
        $d = json_decode(file_get_contents("php://input"), true);

        $id        = (int)($d['id']        ?? 0);
        $nomor     = mysqli_real_escape_string($conn, $d['nomor']     ?? '');
        $tanggal   = mysqli_real_escape_string($conn, $d['tanggal']   ?? '');
        $pengirim  = mysqli_real_escape_string($conn, $d['pengirim']  ?? '');
        $perihal   = mysqli_real_escape_string($conn, $d['perihal']   ?? '');
        $status    = mysqli_real_escape_string($conn, $d['status']    ?? '');
        $disposisi = mysqli_real_escape_string($conn, $d['disposisi'] ?? '');
        $ket       = mysqli_real_escape_string($conn, $d['ket']       ?? '');

        mysqli_query($conn, "
            UPDATE surat_masuk SET
                nomor='$nomor', tanggal='$tanggal', pengirim='$pengirim',
                perihal='$perihal', status='$status', disposisi='$disposisi', ket='$ket'
            WHERE id='$id'
        ");

        // ── Sync arsip ──────────────────────────────────────────────────────
        $dokId = syncArsipSuratMasuk($conn, $id, $nomor, $tanggal, $pengirim, $perihal, $status);

        echo json_encode(["success" => true, "id" => $id, "dokumen_id" => $dokId]);
    break;

    // DELETE
    case 'DELETE':
        $id = (int)($_GET['id'] ?? 0);

        // Hapus arsip dokumen yang terhubung
        $cek = mysqli_query($conn, "SELECT id FROM dokumen WHERE sumber='surat_masuk' AND sumber_id='$id'");
        while ($r = mysqli_fetch_assoc($cek)) {
            $did = $r['id'];
            // Hapus file fisik
            $fRes = mysqli_query($conn, "SELECT file_path FROM dokumen_files WHERE dokumen_id='$did'");
            while ($f = mysqli_fetch_assoc($fRes)) {
                $fp = __DIR__ . '/../' . $f['file_path'];
                if (file_exists($fp)) unlink($fp);
            }
            mysqli_query($conn, "DELETE FROM dokumen WHERE id='$did'");
        }

        mysqli_query($conn, "DELETE FROM surat_masuk WHERE id='$id'");
        echo json_encode(["success" => true]);
    break;
}

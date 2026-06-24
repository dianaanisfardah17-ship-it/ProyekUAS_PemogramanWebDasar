<?php

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type");

include "koneksi.php";

// ── Helper: sinkronisasi surat keluar → arsip dokumen ─────────────────────
function syncArsipSuratKeluar($conn, $suratId, $nomor, $tanggal, $tujuan, $perihal, $status) {
    $tahun = date('Y', strtotime($tanggal ?: date('Y-m-d')));
    $nama  = mysqli_real_escape_string($conn, "Surat Keluar: $perihal");
    $desk  = mysqli_real_escape_string($conn, "Kepada: $tujuan | No: $nomor | Status: $status");

    $cek = mysqli_query($conn, "SELECT id FROM dokumen_diana_2430511046 WHERE sumber='surat_keluar' AND sumber_id='$suratId'");

    if (mysqli_num_rows($cek) > 0) {
        $row   = mysqli_fetch_assoc($cek);
        $dokId = $row['id'];
        mysqli_query($conn, "
            UPDATE dokumen_diana_2430511046 SET
                nama      = '$nama',
                deskripsi = '$desk',
                tanggal   = '$tanggal',
                tahun     = '$tahun'
            WHERE id = '$dokId'
        ");
    } else {
        mysqli_query($conn, "
            INSERT INTO dokumen_diana_2430511046 (nama, kategori, tanggal, ukuran, deskripsi, tahun, sumber, sumber_id)
            VALUES ('$nama','Surat Keluar','$tanggal','—','$desk','$tahun','surat_keluar','$suratId')
        ");
        $dokId = mysqli_insert_id($conn);
    }
    return $dokId;
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    // READ
    case 'GET':
        $result = mysqli_query($conn, "SELECT * FROM surat_keluar_diana_2430511046 ORDER BY id DESC");
        $data   = [];
        while ($row = mysqli_fetch_assoc($result)) {
            $id = $row['id'];
            $fRes = mysqli_query($conn, "SELECT * FROM surat_keluar_files_diana_2430511046 WHERE surat_id='$id'");
            $files = [];
            while ($f = mysqli_fetch_assoc($fRes)) {
                $files[] = ['id' => $f['id'], 'name' => $f['nama_file'], 'file_path' => $f['file_path'] ?? ''];
            }
            $row['files'] = $files;
            $data[] = $row;
        }
        echo json_encode($data);
    break;

    // CREATE
    case 'POST':
        $d = json_decode(file_get_contents("php://input"), true);

        $nomor   = mysqli_real_escape_string($conn, $d['nomor']   ?? '');
        $tanggal = mysqli_real_escape_string($conn, $d['tanggal'] ?? date('Y-m-d'));
        $tujuan  = mysqli_real_escape_string($conn, $d['tujuan']  ?? '');
        $lokasi  = mysqli_real_escape_string($conn, $d['di']      ?? '');
        $perihal = mysqli_real_escape_string($conn, $d['perihal'] ?? '');
        $isi     = mysqli_real_escape_string($conn, $d['isi']     ?? '');
        $ttd     = mysqli_real_escape_string($conn, $d['ttd']     ?? '');
        $status  = mysqli_real_escape_string($conn, $d['status']  ?? '');

        mysqli_query($conn, "
            INSERT INTO surat_keluar_diana_2430511046 (nomor,tanggal,tujuan,lokasi,perihal,isi,ttd,status)
            VALUES ('$nomor','$tanggal','$tujuan','$lokasi','$perihal','$isi','$ttd','$status')
        ");
        $suratId = mysqli_insert_id($conn);

        // ── Auto-arsip ──────────────────────────────────────────────────────
        $dokId = syncArsipSuratKeluar($conn, $suratId, $nomor, $tanggal, $tujuan, $perihal, $status);

        echo json_encode(["success" => true, "id" => $suratId, "dokumen_id" => $dokId]);
    break;

    // UPDATE
    case 'PUT':
        $d = json_decode(file_get_contents("php://input"), true);

        $id      = (int)($d['id']      ?? 0);
        $nomor   = mysqli_real_escape_string($conn, $d['nomor']   ?? '');
        $tanggal = mysqli_real_escape_string($conn, $d['tanggal'] ?? '');
        $tujuan  = mysqli_real_escape_string($conn, $d['tujuan']  ?? '');
        $lokasi  = mysqli_real_escape_string($conn, $d['di']      ?? '');
        $perihal = mysqli_real_escape_string($conn, $d['perihal'] ?? '');
        $isi     = mysqli_real_escape_string($conn, $d['isi']     ?? '');
        $ttd     = mysqli_real_escape_string($conn, $d['ttd']     ?? '');
        $status  = mysqli_real_escape_string($conn, $d['status']  ?? '');

        mysqli_query($conn, "
            UPDATE surat_keluar_diana_2430511046 SET
                nomor='$nomor', tanggal='$tanggal', tujuan='$tujuan',
                lokasi='$lokasi', perihal='$perihal', isi='$isi',
                ttd='$ttd', status='$status'
            WHERE id='$id'
        ");

        // ── Sync arsip ──────────────────────────────────────────────────────
        $dokId = syncArsipSuratKeluar($conn, $id, $nomor, $tanggal, $tujuan, $perihal, $status);

        echo json_encode(["success" => true, "id" => $id, "dokumen_id" => $dokId]);
    break;

    // DELETE
    case 'DELETE':
        $id = (int)($_GET['id'] ?? 0);

        // Hapus arsip dokumen yang terhubung
        $cek = mysqli_query($conn, "SELECT id FROM dokumen_diana_2430511046 WHERE sumber='surat_keluar' AND sumber_id='$id'");
        while ($r = mysqli_fetch_assoc($cek)) {
            $did  = $r['id'];
            $fRes = mysqli_query($conn, "SELECT file_path FROM dokumen_files_diana_2430511046 WHERE dokumen_id='$did'");
            while ($f = mysqli_fetch_assoc($fRes)) {
                $fp = __DIR__ . '/../' . $f['file_path'];
                if (file_exists($fp)) unlink($fp);
            }
            mysqli_query($conn, "DELETE FROM dokumen_diana_2430511046 WHERE id='$did'");
        }

        mysqli_query($conn, "DELETE FROM surat_keluar_diana_2430511046 WHERE id='$id'");
        echo json_encode(["success" => true]);
    break;
}

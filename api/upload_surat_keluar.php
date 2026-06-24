<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
include 'koneksi.php';

$suratId = $_POST['surat_id'] ?? null;

if (!$suratId) {
    echo json_encode(["success" => false, "message" => "surat_id tidak ditemukan"]);
    exit;
}

// ✅ FIX: naik satu level dari /api/ ke root project, lalu masuk uploads/
$folder = __DIR__ . "/../uploads/surat_keluar/";
if (!file_exists($folder)) mkdir($folder, 0777, true);

$allowedExt = ['pdf','doc','docx','xls','xlsx','jpg','jpeg','png','zip','rar'];
$uploaded   = [];
$errors     = [];

if (!empty($_FILES['files']['tmp_name'])) {
    foreach ($_FILES['files']['tmp_name'] as $key => $tmpName) {
        if (!$tmpName || $_FILES['files']['error'][$key] !== UPLOAD_ERR_OK) continue;

        $namaAsli = basename($_FILES['files']['name'][$key]);
        $ext      = strtolower(pathinfo($namaAsli, PATHINFO_EXTENSION));

        if (!in_array($ext, $allowedExt)) {
            $errors[] = "$namaAsli: tipe tidak diizinkan";
            continue;
        }

        $namaFile = time() . rand(100,999) . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $namaAsli);
        $filePath = 'uploads/surat_keluar/' . $namaFile;
        $fullPath = $folder . $namaFile;

        if (move_uploaded_file($tmpName, $fullPath)) {
            $safeNama = mysqli_real_escape_string($conn, $namaAsli);
            $safePath = mysqli_real_escape_string($conn, $filePath);
            $safeId   = (int)$suratId;

            mysqli_query($conn, "
                INSERT INTO surat_keluar_files_diana_2430511046 (surat_id, nama_file, file_path)
                VALUES ('$safeId','$safeNama','$safePath')
            ");
            $fileDbId   = mysqli_insert_id($conn);
            $uploaded[] = ['id' => $fileDbId, 'name' => $namaAsli, 'file_path' => $filePath];
        }
    }
}

// ── Sync file ke arsip dokumen ──────────────────────────────────────────────
if (!empty($uploaded)) {
    $cek = mysqli_query($conn, "SELECT id FROM dokumen_diana_2430511046 WHERE sumber='surat_keluar' AND sumber_id='" . (int)$suratId . "'");
    if ($row = mysqli_fetch_assoc($cek)) {
        $dokId = $row['id'];
        foreach ($uploaded as $uf) {
            $safeNama = mysqli_real_escape_string($conn, $uf['name']);
            $safePath = mysqli_real_escape_string($conn, $uf['file_path']);
            mysqli_query($conn, "
                INSERT INTO dokumen_files_diana_2430511046 (dokumen_id, nama_file, file_path)
                VALUES ('$dokId','$safeNama','$safePath')
            ");
        }
        // Update ukuran
        $allFiles = mysqli_query($conn, "SELECT file_path FROM dokumen_files_diana_2430511046 WHERE dokumen_id='$dokId'");
        $total = 0;
        while ($f = mysqli_fetch_assoc($allFiles)) {
            $fp = __DIR__ . '/../' . $f['file_path'];
            if (file_exists($fp)) $total += filesize($fp);
        }
        if ($total > 0) {
            $ukuran = $total >= 1048576
                ? round($total / 1048576, 2) . ' MB'
                : round($total / 1024, 1) . ' KB';
            mysqli_query($conn, "UPDATE dokumen_diana_2430511046 SET ukuran='$ukuran' WHERE id='$dokId'");
        }
    }
}

echo json_encode(["success" => true, "uploaded" => $uploaded, "errors" => $errors]);
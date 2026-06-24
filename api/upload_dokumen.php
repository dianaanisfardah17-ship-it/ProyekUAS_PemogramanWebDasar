<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

include 'koneksi.php';

$dokumenId = $_POST['dokumen_id'] ?? null;

if (!$dokumenId) {
    echo json_encode(["success" => false, "message" => "dokumen_id tidak ditemukan"]);
    exit;
}

$folder = __DIR__ . "/../uploads/dokumen/";
if (!file_exists($folder)) {
    mkdir($folder, 0777, true);
}

$uploaded   = [];
$errors     = [];
$totalBytes = 0;

$allowedExt = ['pdf','doc','docx','xls','xlsx','ppt','pptx','jpg','jpeg','png','zip','rar'];

if (!empty($_FILES['files']['tmp_name'])) {
    foreach ($_FILES['files']['tmp_name'] as $key => $tmpName) {
        if (!$tmpName || $_FILES['files']['error'][$key] !== UPLOAD_ERR_OK) {
            $errors[] = $_FILES['files']['name'][$key] . " gagal diupload";
            continue;
        }

        $namaAsli  = basename($_FILES['files']['name'][$key]);
        $ext       = strtolower(pathinfo($namaAsli, PATHINFO_EXTENSION));

        if (!in_array($ext, $allowedExt)) {
            $errors[] = "$namaAsli: tipe file tidak diizinkan";
            continue;
        }

        $namaFile  = time() . rand(100, 999) . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $namaAsli);
        $filePath  = 'uploads/dokumen/' . $namaFile;
        $fullPath  = $folder . $namaFile;

        if (move_uploaded_file($tmpName, $fullPath)) {
            $size       = filesize($fullPath);
            $totalBytes += $size;

            $safeNama  = mysqli_real_escape_string($conn, $namaAsli);
            $safePath  = mysqli_real_escape_string($conn, $filePath);
            $safeId    = (int)$dokumenId;

            mysqli_query($conn, "
                INSERT INTO dokumen_files_diana_2430511046 (dokumen_id, nama_file, file_path)
                VALUES ('$safeId','$safeNama','$safePath')
            ");

            $uploaded[] = [
                'id'        => mysqli_insert_id($conn),
                'name'      => $namaAsli,
                'file_path' => $filePath,
                'size'      => round($size / 1024, 1) . ' KB'
            ];
        } else {
            $errors[] = "$namaAsli: gagal dipindahkan ke server";
        }
    }
}

// Update kolom ukuran di tabel dokumen (total semua file)
if (!empty($uploaded)) {
    $totalRes = mysqli_query($conn, "
        SELECT SUM(LENGTH(file_path)) FROM dokumen_files_diana_2430511046 WHERE dokumen_id='" . (int)$dokumenId . "'
    ");
    // Hitung ukuran dari file fisik yang baru saja diupload
    $totalMB  = round($totalBytes / 1024 / 1024, 2);
    $ukuran   = $totalMB > 0 ? $totalMB . ' MB' : round($totalBytes / 1024, 1) . ' KB';
    mysqli_query($conn, "UPDATE dokumen_diana_2430511046 SET ukuran='$ukuran' WHERE id='" . (int)$dokumenId . "'");
}

echo json_encode([
    "success"  => true,
    "uploaded" => $uploaded,
    "errors"   => $errors,
    "count"    => count($uploaded)
]);

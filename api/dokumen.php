<?php

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type");

include "koneksi.php";

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    // READ - ambil semua dokumen beserta file-nya
    case 'GET':
        $id = isset($_GET['id']) ? (int)$_GET['id'] : null;

        if ($id) {
            $result = mysqli_query($conn, "SELECT * FROM dokumen WHERE id='$id'");
            $row = mysqli_fetch_assoc($result);
            if (!$row) {
                echo json_encode(["success" => false, "message" => "Dokumen tidak ditemukan"]);
                break;
            }
            $fRes = mysqli_query($conn, "SELECT * FROM dokumen_files WHERE dokumen_id='$id'");
            $files = [];
            while ($f = mysqli_fetch_assoc($fRes)) {
                $files[] = [
                    'id'        => $f['id'],
                    'name'      => $f['nama_file'],
                    'file_path' => $f['file_path'] ?? ''
                ];
            }
            $row['files'] = $files;
            echo json_encode($row);
        } else {
            $result = mysqli_query($conn, "SELECT * FROM dokumen ORDER BY id DESC");
            $data = [];
            while ($row = mysqli_fetch_assoc($result)) {
                $did = $row['id'];
                $fRes = mysqli_query($conn, "SELECT * FROM dokumen_files WHERE dokumen_id='$did'");
                $files = [];
                while ($f = mysqli_fetch_assoc($fRes)) {
                    $files[] = [
                        'id'        => $f['id'],
                        'name'      => $f['nama_file'],
                        'file_path' => $f['file_path'] ?? ''
                    ];
                }
                $row['files']     = $files;
                $row['sumber']    = $row['sumber']    ?? 'manual';
                $row['sumber_id'] = $row['sumber_id'] ?? null;
                $data[] = $row;
            }
            echo json_encode($data);
        }
        break;

    // CREATE
    case 'POST':
        $raw  = json_decode(file_get_contents("php://input"), true);
        $nama      = mysqli_real_escape_string($conn, $raw['nama']      ?? '');
        $kategori  = mysqli_real_escape_string($conn, $raw['kategori']  ?? '');
        $tanggal   = mysqli_real_escape_string($conn, $raw['tanggal']   ?? date('Y-m-d'));
        $ukuran    = mysqli_real_escape_string($conn, $raw['ukuran']    ?? '—');
        $deskripsi = mysqli_real_escape_string($conn, $raw['deskripsi'] ?? '');
        $tahun     = mysqli_real_escape_string($conn, $raw['tahun']     ?? date('Y'));

        if (empty($nama)) {
            echo json_encode(["success" => false, "message" => "Nama dokumen wajib diisi"]);
            break;
        }

        $ok = mysqli_query($conn, "
            INSERT INTO dokumen (nama, kategori, tanggal, ukuran, deskripsi, tahun)
            VALUES ('$nama','$kategori','$tanggal','$ukuran','$deskripsi','$tahun')
        ");

        if ($ok) {
            echo json_encode(["success" => true, "id" => mysqli_insert_id($conn)]);
        } else {
            echo json_encode(["success" => false, "message" => mysqli_error($conn)]);
        }
        break;

    // UPDATE
    case 'PUT':
        $raw  = json_decode(file_get_contents("php://input"), true);
        $id        = (int)($raw['id']        ?? 0);
        $nama      = mysqli_real_escape_string($conn, $raw['nama']      ?? '');
        $kategori  = mysqli_real_escape_string($conn, $raw['kategori']  ?? '');
        $tanggal   = mysqli_real_escape_string($conn, $raw['tanggal']   ?? '');
        $ukuran    = mysqli_real_escape_string($conn, $raw['ukuran']    ?? '');
        $deskripsi = mysqli_real_escape_string($conn, $raw['deskripsi'] ?? '');
        $tahun     = mysqli_real_escape_string($conn, $raw['tahun']     ?? '');

        if (!$id) {
            echo json_encode(["success" => false, "message" => "ID tidak valid"]);
            break;
        }

        $ok = mysqli_query($conn, "
            UPDATE dokumen SET
                nama='$nama', kategori='$kategori', tanggal='$tanggal',
                ukuran='$ukuran', deskripsi='$deskripsi', tahun='$tahun'
            WHERE id='$id'
        ");

        echo json_encode(["success" => (bool)$ok, "id" => $id]);
        break;

    // DELETE
    case 'DELETE':
        $fileId = (int)($_GET['file_id'] ?? 0);

        // Hapus satu file dari dokumen (tanpa menghapus dokumennya)
        if ($fileId) {
            $fRes = mysqli_query($conn, "SELECT file_path FROM dokumen_files WHERE id='$fileId'");
            $f = mysqli_fetch_assoc($fRes);
            if (!$f) {
                echo json_encode(["success" => false, "message" => "File tidak ditemukan"]);
                break;
            }
            $path = __DIR__ . '/../' . $f['file_path'];
            if (file_exists($path)) unlink($path);

            $ok = mysqli_query($conn, "DELETE FROM dokumen_files WHERE id='$fileId'");
            echo json_encode(["success" => (bool)$ok]);
            break;
        }

        $id = (int)($_GET['id'] ?? 0);
        if (!$id) {
            echo json_encode(["success" => false, "message" => "ID tidak valid"]);
            break;
        }

        // Hapus file fisik terlebih dahulu
        $fRes = mysqli_query($conn, "SELECT file_path FROM dokumen_files WHERE dokumen_id='$id'");
        while ($f = mysqli_fetch_assoc($fRes)) {
            $path = __DIR__ . '/../' . $f['file_path'];
            if (file_exists($path)) unlink($path);
        }

        // Hapus record (CASCADE akan hapus dokumen_files juga)
        $ok = mysqli_query($conn, "DELETE FROM dokumen WHERE id='$id'");
        echo json_encode(["success" => (bool)$ok]);
        break;
}

<?php

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE");
header("Access-Control-Allow-Headers: Content-Type");

session_start();
include "koneksi.php";

// Cek login
if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Tidak terautentikasi"]);
    exit;
}

$userId = (int)$_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    // GET — ambil semua TTD milik user yang sedang login
    case 'GET':
        $result = mysqli_query($conn,
            "SELECT id, ttd_image, ttd_nama, ttd_jabatan, ttd_label, created_at
             FROM user_signatures
             WHERE user_id = '$userId'
             ORDER BY created_at DESC"
        );

        if (!$result) {
            echo json_encode(["success" => false, "message" => "Tabel belum ada, jalankan migrasi SQL."]);
            exit;
        }

        $list = [];
        while ($row = mysqli_fetch_assoc($result)) {
            $list[] = $row;
        }

        echo json_encode([
            "success" => true,
            "data"    => $list,
        ]);
        break;

    // POST — tambah TTD baru (selalu INSERT, tidak mengganti yang lama)
    case 'POST':
        $data = json_decode(file_get_contents("php://input"), true);

        $ttdImage   = mysqli_real_escape_string($conn, $data['ttd_image']   ?? '');
        $ttdNama    = mysqli_real_escape_string($conn, $data['ttd_nama']    ?? '');
        $ttdJabatan = mysqli_real_escape_string($conn, $data['ttd_jabatan'] ?? '');
        $ttdLabel   = mysqli_real_escape_string($conn, $data['ttd_label']   ?? '');

        if (empty($ttdImage)) {
            echo json_encode(["success" => false, "message" => "Data TTD kosong"]);
            exit;
        }

        $ok = mysqli_query($conn,
            "INSERT INTO user_signatures (user_id, ttd_image, ttd_nama, ttd_jabatan, ttd_label)
             VALUES ('$userId', '$ttdImage', '$ttdNama', '$ttdJabatan', '$ttdLabel')"
        );

        if ($ok) {
            $newId = mysqli_insert_id($conn);
            echo json_encode(["success" => true, "id" => $newId, "message" => "TTD berhasil disimpan"]);
        } else {
            echo json_encode(["success" => false, "message" => "Gagal menyimpan: " . mysqli_error($conn)]);
        }
        break;

    // DELETE — hapus TTD by id (hanya milik user sendiri)
    case 'DELETE':
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) {
            echo json_encode(["success" => false, "message" => "ID tidak valid"]);
            exit;
        }
        $ok = mysqli_query($conn,
            "DELETE FROM user_signatures WHERE id = '$id' AND user_id = '$userId'"
        );
        if ($ok) {
            echo json_encode(["success" => true, "message" => "TTD dihapus"]);
        } else {
            echo json_encode(["success" => false, "message" => "Gagal menghapus: " . mysqli_error($conn)]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Method tidak diizinkan"]);
}

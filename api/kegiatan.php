<?php

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type");

include 'koneksi.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    case 'GET':

        $result = mysqli_query($conn, "SELECT * FROM kegiatan ORDER BY mulai ASC, id DESC");

        $data = [];
        while ($row = mysqli_fetch_assoc($result)) {
            $data[] = $row;
        }

        echo json_encode($data);
        break;

    case 'POST':

        $input = json_decode(file_get_contents("php://input"), true);

        $nama      = mysqli_real_escape_string($conn, $input['nama'] ?? '');
        $mulai     = mysqli_real_escape_string($conn, $input['mulai'] ?? null);
        $selesai   = mysqli_real_escape_string($conn, $input['selesai'] ?? null);
        $tempat    = mysqli_real_escape_string($conn, $input['tempat'] ?? '');
        $pj        = mysqli_real_escape_string($conn, $input['pj'] ?? '');
        $divisi    = mysqli_real_escape_string($conn, $input['divisi'] ?? '');
        $status    = mysqli_real_escape_string($conn, $input['status'] ?? '');
        $deskripsi = mysqli_real_escape_string($conn, $input['deskripsi'] ?? '');

        mysqli_query($conn, "
            INSERT INTO kegiatan
            (nama, mulai, selesai, tempat, pj, divisi, status, deskripsi)
            VALUES
            ('$nama', '$mulai', '$selesai', '$tempat', '$pj', '$divisi', '$status', '$deskripsi')
        ");

        echo json_encode(["success" => true, "id" => mysqli_insert_id($conn)]);
        break;

    case 'PUT':

        $input = json_decode(file_get_contents("php://input"), true);

        $id        = (int)($input['id'] ?? 0);
        $nama      = mysqli_real_escape_string($conn, $input['nama'] ?? '');
        $mulai     = mysqli_real_escape_string($conn, $input['mulai'] ?? null);
        $selesai   = mysqli_real_escape_string($conn, $input['selesai'] ?? null);
        $tempat    = mysqli_real_escape_string($conn, $input['tempat'] ?? '');
        $pj        = mysqli_real_escape_string($conn, $input['pj'] ?? '');
        $divisi    = mysqli_real_escape_string($conn, $input['divisi'] ?? '');
        $status    = mysqli_real_escape_string($conn, $input['status'] ?? '');
        $deskripsi = mysqli_real_escape_string($conn, $input['deskripsi'] ?? '');

        mysqli_query($conn, "
            UPDATE kegiatan
            SET
                nama='$nama',
                mulai='$mulai',
                selesai='$selesai',
                tempat='$tempat',
                pj='$pj',
                divisi='$divisi',
                status='$status',
                deskripsi='$deskripsi'
            WHERE id='$id'
        ");

        echo json_encode(["success" => true]);
        break;

    case 'DELETE':

        $id = (int)($_GET['id'] ?? 0);

        mysqli_query($conn, "DELETE FROM kegiatan WHERE id='$id'");

        echo json_encode(["success" => true]);
        break;

    default:
        echo json_encode(["success" => false, "message" => "Method tidak didukung"]);
}

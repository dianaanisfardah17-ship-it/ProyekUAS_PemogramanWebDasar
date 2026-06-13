<?php

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type");

include 'koneksi.php';

$method = $_SERVER['REQUEST_METHOD'];

function val($conn, $v) {
    return mysqli_real_escape_string($conn, $v ?? '');
}

switch ($method) {

    case 'GET':

        $result = mysqli_query($conn, "SELECT * FROM notulensi ORDER BY tanggal DESC, id DESC");

        $data = [];
        while ($row = mysqli_fetch_assoc($result)) {
            // alias tindak_lanjut -> tindaklanjut & next agar cocok dengan frontend
            $row['tindaklanjut'] = $row['tindak_lanjut'];
            unset($row['tindak_lanjut']);
            $data[] = $row;
        }

        echo json_encode($data);
        break;

    case 'POST':

        $input = json_decode(file_get_contents("php://input"), true);

        $judul         = val($conn, $input['judul']);
        $tanggal       = val($conn, $input['tanggal']);
        $jenis         = val($conn, $input['jenis']);
        $tempat        = val($conn, $input['tempat']);
        $notulis       = val($conn, $input['notulis']);
        $pimpinan      = val($conn, $input['pimpinan']);
        $mulai         = val($conn, $input['mulai']);
        $selesai       = val($conn, $input['selesai']);
        $peserta       = val($conn, $input['peserta']);
        $agenda        = val($conn, $input['agenda']);
        $isi           = val($conn, $input['isi']);
        $kesimpulan    = val($conn, $input['kesimpulan']);
        $tindak_lanjut = val($conn, $input['tindaklanjut']);
        $status        = val($conn, $input['status']);

        mysqli_query($conn, "
            INSERT INTO notulensi
            (judul, tanggal, jenis, tempat, notulis, pimpinan, mulai, selesai, peserta, agenda, isi, kesimpulan, tindak_lanjut, status)
            VALUES
            ('$judul','$tanggal','$jenis','$tempat','$notulis','$pimpinan','$mulai','$selesai','$peserta','$agenda','$isi','$kesimpulan','$tindak_lanjut','$status')
        ");

        echo json_encode(["success" => true, "id" => mysqli_insert_id($conn)]);
        break;

    case 'PUT':

        $input = json_decode(file_get_contents("php://input"), true);

        $id            = (int)($input['id'] ?? 0);
        $judul         = val($conn, $input['judul']);
        $tanggal       = val($conn, $input['tanggal']);
        $jenis         = val($conn, $input['jenis']);
        $tempat        = val($conn, $input['tempat']);
        $notulis       = val($conn, $input['notulis']);
        $pimpinan      = val($conn, $input['pimpinan']);
        $mulai         = val($conn, $input['mulai']);
        $selesai       = val($conn, $input['selesai']);
        $peserta       = val($conn, $input['peserta']);
        $agenda        = val($conn, $input['agenda']);
        $isi           = val($conn, $input['isi']);
        $kesimpulan    = val($conn, $input['kesimpulan']);
        $tindak_lanjut = val($conn, $input['tindaklanjut']);
        $status        = val($conn, $input['status']);

        mysqli_query($conn, "
            UPDATE notulensi
            SET
                judul='$judul',
                tanggal='$tanggal',
                jenis='$jenis',
                tempat='$tempat',
                notulis='$notulis',
                pimpinan='$pimpinan',
                mulai='$mulai',
                selesai='$selesai',
                peserta='$peserta',
                agenda='$agenda',
                isi='$isi',
                kesimpulan='$kesimpulan',
                tindak_lanjut='$tindak_lanjut',
                status='$status'
            WHERE id='$id'
        ");

        echo json_encode(["success" => true]);
        break;

    case 'DELETE':

        $id = (int)($_GET['id'] ?? 0);

        mysqli_query($conn, "DELETE FROM notulensi WHERE id='$id'");

        echo json_encode(["success" => true]);
        break;

    default:
        echo json_encode(["success" => false, "message" => "Method tidak didukung"]);
}
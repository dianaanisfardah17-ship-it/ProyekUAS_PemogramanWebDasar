<?php

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

include 'koneksi.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

function val($conn, $v) {
    return mysqli_real_escape_string($conn, trim($v ?? ''));
}

switch ($method) {

    // ============================================================
    // GET: daftar sesi absensi (dengan peserta), atau detail 1 sesi
    // ============================================================
    case 'GET':

       if (!empty($_GET['id'])) {
        $id = (int)$_GET['id'];
        $res = mysqli_query($conn, "
        SELECT a.*, k.nama AS kegiatan_nama
        FROM absensi_sessions_diana_2430511046 a
        LEFT JOIN kegiatan_diana_2430511046 k ON k.id = a.kegiatan_id
        WHERE a.id = '$id'
        ");
            $sesi = mysqli_fetch_assoc($res);
            if (!$sesi) { echo json_encode(null); exit; }
            $sesi = formatSesi($sesi);
            $sesi['peserta'] = getPeserta($conn, $id);
            echo json_encode($sesi);
            exit;
        }

        $result = mysqli_query($conn, "
            SELECT a.*, k.nama AS kegiatan_nama
            FROM absensi_sessions_diana_2430511046 a
            LEFT JOIN kegiatan_diana_2430511046 k ON k.id = a.kegiatan_id
            ORDER BY a.tanggal DESC, a.id DESC
        ");

        $data = [];
        while ($row = mysqli_fetch_assoc($result)) {
            $row = formatSesi($row);
            $row['peserta'] = getPeserta($conn, $row['id']);
            $data[] = $row;
        }

        echo json_encode($data);
        break;

    // ============================================================
    // POST: buat sesi baru / tambah peserta / set all
    // ============================================================
    case 'POST':

        $input = json_decode(file_get_contents("php://input"), true);

        // -------------------------------------------------------
        // ACTION: tambah_peserta
        // -------------------------------------------------------
        if ($action === 'tambah_peserta') {
            $session_id = (int)($input['session_id'] ?? 0);

            if ($session_id <= 0) {
                echo json_encode(["success" => false, "message" => "session_id tidak valid"]);
                exit;
            }

            // Pastikan sesi ada
            $chk = mysqli_query($conn, "SELECT id FROM absensi_sessions_diana_2430511046 WHERE id = '$session_id'");
            if (mysqli_num_rows($chk) === 0) {
                echo json_encode(["success" => false, "message" => "Sesi absensi tidak ditemukan"]);
                exit;
            }

            $nama   = val($conn, $input['nama'] ?? '');
            $nim    = val($conn, $input['nim'] ?? '');
            $status = val($conn, $input['status'] ?? 'Hadir');

            $validStatus = ['Hadir', 'Izin', 'Sakit', 'Alpha'];
            if (!in_array($status, $validStatus)) $status = 'Hadir';

            if (empty($nama)) {
                echo json_encode(["success" => false, "message" => "Nama peserta tidak boleh kosong"]);
                exit;
            }

            // Cek duplikat berdasarkan nim (jika nim diisi)
            if (!empty($nim)) {
                $dupChk = mysqli_query($conn, "
                    SELECT id FROM absensi_peserta_diana_2430511046
                    WHERE session_id = '$session_id' AND nim = '$nim'
                    LIMIT 1
                ");
                if (mysqli_num_rows($dupChk) > 0) {
                    echo json_encode(["success" => false, "message" => "Peserta dengan NIM $nim sudah ada di sesi ini"]);
                    exit;
                }
            }

            $ok = mysqli_query($conn, "
                INSERT INTO absensi_peserta_diana_2430511046 (session_id, nama, nim, status, waktu_absen)
                VALUES ('$session_id', '$nama', '$nim', '$status', NOW())
            ");

            if (!$ok) {
                echo json_encode(["success" => false, "message" => mysqli_error($conn)]);
                exit;
            }

            $newId = mysqli_insert_id($conn);

            echo json_encode([
                "success" => true,
                "id"      => $newId,
                "peserta" => [
                    "id"     => (string)$newId,
                    "nama"   => $input['nama'] ?? '',
                    "nim"    => $input['nim'] ?? '',
                    "ket"    => $input['ket'] ?? '',   // dikembalikan ke frontend walau tidak disimpan
                    "status" => $status,
                ]
            ]);
            exit;
        }

        // -------------------------------------------------------
        // ACTION: set_all
        // -------------------------------------------------------
        if ($action === 'set_all') {
            $session_id = (int)($input['session_id'] ?? 0);
            $status     = val($conn, $input['status'] ?? 'Hadir');

            $validStatus = ['Hadir', 'Izin', 'Sakit', 'Alpha'];
            if (!in_array($status, $validStatus)) $status = 'Hadir';

            mysqli_query($conn, "
                UPDATE absensi_peserta_diana_2430511046
                SET status = '$status', waktu_absen = NOW()
                WHERE session_id = '$session_id'
            ");

            echo json_encode(["success" => true]);
            exit;
        }

        // -------------------------------------------------------
        // DEFAULT: buat sesi absensi baru
        // -------------------------------------------------------
        $nama       = val($conn, $input['nama'] ?? '');
        $tanggal    = val($conn, $input['tanggal'] ?? date('Y-m-d'));
        $kegiatanId = isset($input['kegiatanId']) && $input['kegiatanId'] !== '' && $input['kegiatanId'] !== null
                      ? (int)$input['kegiatanId'] : null;
        $keterangan = val($conn, $input['keterangan'] ?? '');

        if (empty($nama)) {
            echo json_encode(["success" => false, "message" => "Nama sesi tidak boleh kosong"]);
            exit;
        }

        $kegSql = ($kegiatanId === null) ? 'NULL' : $kegiatanId;

        // Cek kolom tempat & mulai ada tidak (opsional, sesuai database)
        $columns = [];
        $colRes  = mysqli_query($conn, "SHOW COLUMNS FROM absensi_sessions_diana_2430511046");
        while ($col = mysqli_fetch_assoc($colRes)) {
            $columns[] = $col['Field'];
        }

        $hasTemp  = in_array('tempat', $columns);
        $hasMulai = in_array('mulai', $columns);

        $tempat = val($conn, $input['tempat'] ?? '-');
        $mulai  = val($conn, $input['mulai'] ?? '-');

        if ($hasTemp && $hasMulai) {
            $ok = mysqli_query($conn, "
                INSERT INTO absensi_sessions_diana_2430511046 (kegiatan_id, nama_session, tanggal, tempat, mulai, keterangan)
                VALUES ($kegSql, '$nama', '$tanggal', '$tempat', '$mulai', '$keterangan')
            ");
        } else {
            $ok = mysqli_query($conn, "
                INSERT INTO absensi_sessions_diana_2430511046 (kegiatan_id, nama_session, tanggal, keterangan)
                VALUES ($kegSql, '$nama', '$tanggal', '$keterangan')
            ");
        }

        if (!$ok) {
            echo json_encode(["success" => false, "message" => mysqli_error($conn)]);
            exit;
        }

        $sessionId = mysqli_insert_id($conn);

        // Tambah peserta sekaligus (mode all anggota aktif)
        $peserta = $input['peserta'] ?? [];
        foreach ($peserta as $p) {
            $pnama   = val($conn, $p['nama'] ?? '');
            $pnim    = val($conn, $p['nim'] ?? '');
            $pstatus = val($conn, $p['status'] ?? 'Hadir');

            if (!in_array($pstatus, ['Hadir','Izin','Sakit','Alpha'])) $pstatus = 'Hadir';

            if (!empty($pnama)) {
                mysqli_query($conn, "
                    INSERT INTO absensi_peserta_diana_2430511046 (session_id, nama, nim, status, waktu_absen)
                    VALUES ('$sessionId', '$pnama', '$pnim', '$pstatus', NOW())
                ");
            }
        }

        echo json_encode(["success" => true, "id" => $sessionId]);
        break;

    // ============================================================
    // PUT: update status peserta
    // ============================================================
    case 'PUT':

        $input = json_decode(file_get_contents("php://input"), true);

        if ($action === 'update_status') {
            $id     = (int)($input['id'] ?? 0);
            $status = val($conn, $input['status'] ?? 'Hadir');

            $validStatus = ['Hadir', 'Izin', 'Sakit', 'Alpha'];
            if (!in_array($status, $validStatus)) $status = 'Hadir';

            $ok = mysqli_query($conn, "
                UPDATE absensi_peserta_diana_2430511046
                SET status = '$status', waktu_absen = NOW()
                WHERE id = '$id'
            ");

            if (!$ok) {
                echo json_encode(["success" => false, "message" => mysqli_error($conn)]);
                exit;
            }

            echo json_encode(["success" => true]);
            exit;
        }

        echo json_encode(["success" => false, "message" => "Aksi tidak dikenal"]);
        break;

    // ============================================================
    // DELETE: hapus sesi atau 1 peserta
    // ============================================================
    case 'DELETE':

        if ($action === 'peserta') {
            $id = (int)($_GET['id'] ?? 0);
            if ($id <= 0) { echo json_encode(["success" => false, "message" => "ID tidak valid"]); exit; }
            $ok = mysqli_query($conn, "DELETE FROM absensi_peserta_diana_2430511046 WHERE id = '$id'");
            echo json_encode(["success" => (bool)$ok]);
            exit;
        }

        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) { echo json_encode(["success" => false, "message" => "ID tidak valid"]); exit; }
        $ok = mysqli_query($conn, "DELETE FROM absensi_sessions_diana_2430511046 WHERE id = '$id'");
        echo json_encode(["success" => (bool)$ok]);
        break;

    default:
        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Method tidak didukung"]);
}

// ================================================================
// Helper functions
// ================================================================

function formatSesi($row) {
    return [
        "id"           => (int)$row['id'],
        "nama"         => $row['nama_session'] ?? '',
        "tanggal"      => $row['tanggal'] ?? '',
        "kegiatanId"   => isset($row['kegiatan_id']) && $row['kegiatan_id'] !== null
                          ? (int)$row['kegiatan_id'] : null,
        "kegiatanNama" => $row['kegiatan_nama'] ?? 'Tanpa Kegiatan',
        "tempat"       => $row['tempat'] ?? '-',
        "mulai"        => $row['mulai'] ?? '-',
        "keterangan"   => $row['keterangan'] ?? '',
        "createdAt"    => $row['created_at'] ?? '',
    ];
}

function getPeserta($conn, $sessionId) {
    $res = mysqli_query($conn, "
        SELECT * FROM absensi_peserta_diana_2430511046
        WHERE session_id = '$sessionId'
        ORDER BY id ASC
    ");
    $peserta = [];
    while ($p = mysqli_fetch_assoc($res)) {
        $peserta[] = [
            "id"     => (string)$p['id'],
            "nama"   => $p['nama'] ?? '',
            "nim"    => $p['nim'] ?? '',
            "ket"    => '',   // kolom ini tidak ada di DB, dikosongkan
            "status" => $p['status'] ?? 'Hadir',
        ];
    }
    return $peserta;
}
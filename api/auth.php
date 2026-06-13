<?php

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST");
header("Access-Control-Allow-Headers: Content-Type");

session_start();
include "koneksi.php";

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ── GET: cek status sesi aktif ─────────────────────────────────────────────
if ($method === 'GET' && $action === 'check') {
    if (!empty($_SESSION['user_id'])) {
        $id  = (int)$_SESSION['user_id'];
        $res = mysqli_query($conn, "SELECT id, username, nama, role FROM users WHERE id='$id'");
        $row = mysqli_fetch_assoc($res);
        if ($row) {
            echo json_encode(["loggedIn" => true, "user" => $row]);
        } else {
            session_destroy();
            echo json_encode(["loggedIn" => false]);
        }
    } else {
        echo json_encode(["loggedIn" => false]);
    }
    exit;
}

// ── POST: login ────────────────────────────────────────────────────────────
if ($method === 'POST' && $action === 'login') {
    $body     = json_decode(file_get_contents("php://input"), true);
    $username = trim($body['username'] ?? '');
    $password = $body['password'] ?? '';

    if (empty($username) || empty($password)) {
        echo json_encode(["success" => false, "message" => "Username dan password wajib diisi"]);
        exit;
    }

    $safeUser = mysqli_real_escape_string($conn, $username);
    $res      = mysqli_query($conn, "SELECT * FROM users WHERE username='$safeUser'");
    $user     = mysqli_fetch_assoc($res);

    if (!$user) {
        echo json_encode(["success" => false, "message" => "Username atau password salah"]);
        exit;
    }

    // Support password_hash (bcrypt) maupun plaintext lama
    $valid = password_verify($password, $user['password'])
          || $user['password'] === $password;

    if (!$valid) {
        echo json_encode(["success" => false, "message" => "Username atau password salah"]);
        exit;
    }

    // Upgrade password plaintext ke bcrypt sekaligus
    if ($user['password'] === $password) {
        $hashed = password_hash($password, PASSWORD_DEFAULT);
        $uid    = (int)$user['id'];
        mysqli_query($conn, "UPDATE users SET password='$hashed' WHERE id='$uid'");
    }

    session_regenerate_id(true);
    $_SESSION['user_id']   = $user['id'];
    $_SESSION['user_role'] = $user['role'];

    echo json_encode([
        "success" => true,
        "user"    => [
            "id"       => $user['id'],
            "username" => $user['username'],
            "nama"     => $user['nama'],
            "role"     => $user['role'],
        ]
    ]);
    exit;
}

// ── POST: logout ───────────────────────────────────────────────────────────
if ($method === 'POST' && $action === 'logout') {
    session_destroy();
    echo json_encode(["success" => true]);
    exit;
}

echo json_encode(["success" => false, "message" => "Aksi tidak dikenal"]);

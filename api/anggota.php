<?php

header('Content-Type: application/json');

include 'koneksi.php';

$method = $_SERVER['REQUEST_METHOD'];

switch($method){

    case 'GET':

        $result = mysqli_query($conn, "SELECT * FROM anggota ORDER BY id DESC");

        $data = [];

        while($row = mysqli_fetch_assoc($result)){
            $data[] = $row;
        }

        echo json_encode($data);
        break;

    case 'POST':

        $input = json_decode(file_get_contents("php://input"), true);

        $nim = $input['nim'];
        $nama = $input['nama'];
        $jabatan = $input['jabatan'];
        $bidang = $input['bidang'];
        $angkatan = $input['angkatan'];
        $hp = $input['hp'];
        $email = $input['email'];
        $status = $input['status'];

        mysqli_query($conn,"
            INSERT INTO anggota
            (nim,nama,jabatan,bidang,angkatan,hp,email,status)
            VALUES
            ('$nim','$nama','$jabatan','$bidang','$angkatan','$hp','$email','$status')
        ");

        echo json_encode(["success"=>true]);
        break;

    case 'PUT':

        $input = json_decode(file_get_contents("php://input"), true);

        $id = $input['id'];

        mysqli_query($conn,"
            UPDATE anggota
            SET
                nim='$input[nim]',
                nama='$input[nama]',
                jabatan='$input[jabatan]',
                bidang='$input[bidang]',
                angkatan='$input[angkatan]',
                hp='$input[hp]',
                email='$input[email]',
                status='$input[status]'
            WHERE id='$id'
        ");

        echo json_encode(["success"=>true]);
        break;

    case 'DELETE':

        $id = $_GET['id'];

        mysqli_query($conn,"
            DELETE FROM anggota
            WHERE id='$id'
        ");

        echo json_encode(["success"=>true]);
        break;
}
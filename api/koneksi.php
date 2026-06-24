<?php

$conn = mysqli_connect(
    "localhost",
    "ifummiid_kelasc",
    "pemweb_db_c",
    "ifummiid_kelasc"
);

if (!$conn) {
    die("Koneksi gagal: " . mysqli_connect_error());
}
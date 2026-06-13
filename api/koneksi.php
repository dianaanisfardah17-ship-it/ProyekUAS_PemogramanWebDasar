<?php

$conn = mysqli_connect(
    "localhost",
    "root",
    "",
    "siasih"
);

if (!$conn) {
    die("Koneksi gagal: " . mysqli_connect_error());
}
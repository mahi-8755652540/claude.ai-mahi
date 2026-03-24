<?php
session_start();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request']);
    exit;
}

$email = filter_var($_POST['email'] ?? '', FILTER_VALIDATE_EMAIL);

if (!$email) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid email address']);
    exit;
}

$otp = random_int(100000, 999999);

$_SESSION['email_otp'] = $otp;
$_SESSION['email_otp_for'] = $email;
$_SESSION['email_otp_time'] = time();

$subject = "Vendor Registration Verification Code";
$message = "Dear Supplier,\n\nYour verification code is: {$otp}\n\nPlease enter this code on the registration form.\n\nRegards,\nShree Spaace Solution";
$headers = "From: Shree Spaace Solution <no-reply@shreespaacesolution.com>\r\n";

if (@mail($email, $subject, $message, $headers)) {
    echo json_encode(['status' => 'ok']);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Could not send email from server']);
}

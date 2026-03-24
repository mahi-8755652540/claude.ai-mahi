<?php
session_start();

// --- DATABASE CONFIGURATION ---
define('DB_HOST', 'localhost');
define('DB_USER', 'your_db_username'); // <-- Replace with your database username
define('DB_PASS', 'your_db_password'); // <-- Replace with your database password
define('DB_NAME', 'your_db_name');     // <-- Replace with your database name

$upload_folder = "vendor_documents/";

// Simple server-side checks (extra safety)
$companyName = trim($_POST['companyName'] ?? '');
$contactPerson = trim($_POST['contactPerson'] ?? '');
$mobile = trim($_POST['mobile'] ?? '');
$email = trim($_POST['email'] ?? '');
$emailOtp = trim($_POST['emailOtp'] ?? '');
$captchaInput = trim($_POST['captchaInput'] ?? '');
$gstin = trim($_POST['gstin'] ?? '');
$pan = trim($_POST['pan'] ?? '');
$address = trim($_POST['address'] ?? '');
$materialCategory = isset($_POST['materialCategory']) ? implode(', ', $_POST['materialCategory']) : '';
$accountName = trim($_POST['accountName'] ?? '');
$accountNumber = trim($_POST['accountNumber'] ?? '');
$bankName = trim($_POST['bankName'] ?? '');
$ifsc = trim($_POST['ifsc'] ?? '');
$branch = trim($_POST['branch'] ?? '');

$errors = [];

// Required fields
if ($companyName === '') $errors[] = "Company Name is required.";
if ($contactPerson === '') $errors[] = "Contact Person is required.";
if (!preg_match('/^[6-9][0-9]{9}$/', $mobile)) $errors[] = "Invalid mobile number.";
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = "Invalid email.";
if ($captchaInput === '') $errors[] = "Captcha is required.";

// Email OTP check
if (!isset($_SESSION['email_otp'], $_SESSION['email_otp_for'])) {
    $errors[] = "OTP not generated. Please click 'Send Code' again.";
} else {
    if ($_SESSION['email_otp_for'] !== $email) {
        $errors[] = "Email does not match with OTP email.";
    }
    if (!preg_match('/^[0-9]{6}$/', $emailOtp) || $emailOtp != $_SESSION['email_otp']) {
        $errors[] = "Incorrect email verification code.";
    }
    // optional: expiry 10 minutes
    if (isset($_SESSION['email_otp_time']) && time() - $_SESSION['email_otp_time'] > 600) {
        $errors[] = "Verification code has expired. Please request a new one.";
    }
}

// Captcha check
if (!isset($_SESSION['captcha_answer']) || $captchaInput != $_SESSION['captcha_answer']) {
    $errors[] = "Incorrect captcha answer.";
}



if (!empty($errors)) {
    echo "<h2>Form Submission Failed</h2>";
    echo "<ul>";
    foreach ($errors as $e) {
        echo "<li>" . htmlspecialchars($e) . "</li>";
    }
    echo "</ul>";
    echo "<p><a href='javascript:history.back()'>Go Back</a></p>";
    exit;
}

// --- FILE UPLOAD HANDLING ---
if (!file_exists($upload_folder)) {
    mkdir($upload_folder, 0777, true);
}

function handle_upload($file_key, $upload_folder) {
    if (isset($_FILES[$file_key]) && $_FILES[$file_key]['error'] == UPLOAD_ERR_OK) {
        $file_tmp_path = $_FILES[$file_key]['tmp_name'];
        $file_name = $_FILES[$file_key]['name'];
        $file_ext = strtolower(pathinfo($file_name, PATHINFO_EXTENSION));
        $allowed = ['pdf', 'jpg', 'jpeg', 'png'];

        if (in_array($file_ext, $allowed)) {
            $new_file_name = time() . '_' . uniqid() . '_' . basename($file_name);
            $dest_path = $upload_folder . $new_file_name;

            if (move_uploaded_file($file_tmp_path, $dest_path)) {
                return $dest_path;
            }
        }
    }
    return null;
}

$gstCertPath = handle_upload('gstCert', $upload_folder);
$panCardPath = handle_upload('panCard', $upload_folder);
$cancelledChequePath = handle_upload('cancelledCheque', $upload_folder);
$cataloguePath = handle_upload('catalogue', $upload_folder);


// --- DATABASE INSERTION ---
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($conn->connect_error) {
    // In production, you might want to log this error instead of showing it.
    die("<h2>Database Connection Failed</h2><p>Could not connect to the database. Please contact the administrator.</p>");
}

$stmt = $conn->prepare(
    "INSERT INTO vendors (company_name, contact_person, gstin, pan, mobile, email, address, material_category, gst_cert_path, pan_card_path, cancelled_cheque_path, catalogue_path, account_name, account_number, bank_name, ifsc_code, branch) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
);

if ($stmt === false) {
    die("<h2>Database Error</h2><p>Failed to prepare the SQL statement: " . htmlspecialchars($conn->error) . "</p>");
}

$stmt->bind_param(
    "sssssssssssssssss",
    $companyName,
    $contactPerson,
    $gstin,
    $pan,
    $mobile,
    $email,
    $address,
    $materialCategory,
    $gstCertPath,
    $panCardPath,
    $cancelledChequePath,
    $cataloguePath,
    $accountName,
    $accountNumber,
    $bankName,
    $ifsc,
    $branch
);

if ($stmt->execute()) {
    // On success, redirect to the thank-you page
    header("Location: thank-you.php");
    exit();
} else {
    echo "<h2>Form Submission Failed</h2>";
    echo "<p>There was an error saving your registration. Please try again. Error: " . htmlspecialchars($stmt->error) . "</p>";
}

$stmt->close();
$conn->close();

// OTP clear
unset($_SESSION['email_otp'], $_SESSION['email_otp_for'], $_SESSION['email_otp_time'], $_SESSION['captcha_answer']);

<?php

// ==== CONFIGURATION ====
$hr_email = "hello@shreespaacesolution.com";   // <-- YOUR EMAIL ID PUT HERE
$upload_folder = "resumes/";                   // Folder where resumes will be saved


// ==== CREATE FOLDER IF NOT EXISTS ====
if (!file_exists($upload_folder)) {
    mkdir($upload_folder, 0777, true);
}


// ==== RECEIVE FORM DATA ====
$position   = $_POST['position'];
$name       = $_POST['name'];
$email      = $_POST['email'];
$phone      = $_POST['phone'];
$experience = $_POST['experience'];
$message    = $_POST['message'];


// ==== RESUME FILE DETAILS ====
$file_name     = $_FILES["resume"]["name"];
$file_tmp_path = $_FILES["resume"]["tmp_name"];
$file_size     = $_FILES["resume"]["size"];


// ==== NEW UNIQUE FILE NAME ====
$new_file_name = time() . "_" . $file_name;
$dest_path = $upload_folder . $new_file_name;


// ==== ALLOWED FILE TYPES ====
$allowed = array("pdf", "doc", "docx");
$file_ext = strtolower(pathinfo($file_name, PATHINFO_EXTENSION));

if (!in_array($file_ext, $allowed)) {
    die("<h2>Invalid file format. Only PDF, DOC, DOCX allowed.</h2>");
}


// ==== MOVE FILE TO SERVER ====
if (!move_uploaded_file($file_tmp_path, $dest_path)) {
    die("<h2>Resume upload failed. Try again.</h2>");
}


// ==== EMAIL WITH ATTACHMENT ====

$to = $hr_email;
$subject = "New Job Application — $position";


// Build the email message
$htmlContent = "
<h2>New Job Application</h2>
<p><strong>Position:</strong> $position</p>
<p><strong>Name:</strong> $name</p>
<p><strong>Email:</strong> $email</p>
<p><strong>Phone:</strong> $phone</p>
<p><strong>Experience:</strong> $experience Years</p>
<p><strong>Message:</strong><br>$message</p>
<p><strong>Resume File:</strong> $new_file_name</p>
";


// Boundary
$boundary = md5("career" . time());

// Headers
$headers  = "MIME-Version: 1.0\r\n";
$headers .= "From: Careers <no-reply@yourdomain.com>\r\n";
$headers .= "Content-Type: multipart/mixed; boundary=\"".$boundary."\"\r\n";


// Body
$body  = "--$boundary\r\n";
$body .= "Content-Type: text/html; charset=UTF-8\r\n";
$body .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
$body .= $htmlContent . "\r\n\r\n";


// Attach file
$file_content = file_get_contents($dest_path);
$file_encoded = chunk_split(base64_encode($file_content));

$body .= "--$boundary\r\n";
$body .= "Content-Type: application/octet-stream; name=\"".$new_file_name."\"\r\n";
$body .= "Content-Disposition: attachment; filename=\"".$new_file_name."\"\r\n";
$body .= "Content-Transfer-Encoding: base64\r\n\r\n";
$body .= $file_encoded . "\r\n\r\n";

$body .= "--$boundary--";


// ==== SEND EMAIL ====
if (mail($to, $subject, $body, $headers)) {
    echo "<h2 style='color:green; font-family:Arial;'>Application submitted successfully!<br>Our HR team will contact you.</h2>";
} else {
    echo "<h2 style='color:red;'>Error sending email. Try again.</h2>";
}

?>

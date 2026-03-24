<?php

if($_SERVER['REQUEST_METHOD'] == 'POST') {

    $to = "sss@shreespaacesolution.com";   // <-- Yaha apna email daalo
    $subject = "New Contact Enquiry - Shree Spaace Solution";

    $fullName     = $_POST['fullName'];
    $company      = $_POST['company'];
    $email        = $_POST['email'];
    $phone        = $_POST['phone'];
    $city         = $_POST['city'];
    $projectType  = $_POST['projectType'];
    $projectArea  = $_POST['projectArea'];
    $projectBrief = nl2br(htmlspecialchars($_POST['projectBrief']));

    $message = "
    <h2>New Project Enquiry</h2>
    <p><strong>Name:</strong> $fullName</p>
    <p><strong>Company:</strong> $company</p>
    <p><strong>Email:</strong> $email</p>
    <p><strong>Phone:</strong> $phone</p>
    <p><strong>City:</strong> $city</p>
    <p><strong>Project Type:</strong> $projectType</p>
    <p><strong>Project Area:</strong> $projectArea</p>
    <p><strong>Project Brief:</strong><br> $projectBrief</p>
    ";

    $headers  = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= "From: Shree Spaace Website <no-reply@shreespaacesolution.com>" . "\r\n";

    if(mail($to, $subject, $message, $headers)) {
        echo "<h2>Thank you! Your enquiry has been sent successfully.</h2>";
    } else {
        echo "<h2>Message failed to send. Please try again later.</h2>";
    }

} else {
    echo "Invalid Request!";
}

?>

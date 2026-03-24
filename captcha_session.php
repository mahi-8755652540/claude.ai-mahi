<?php
session_start();

if (isset($_POST['answer'])) {
    $_SESSION['captcha_answer'] = $_POST['answer'];
}

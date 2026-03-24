<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Responsive Navbar • Shree Spaace Solution</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<!-- Icons -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">

<style>
/* COLORS */
:root {
  --gold: #b8860b;
  --text: #7c693c;
}

/* NAVBAR WRAPPER */
.sss-navbar {
  width: 95%;
  padding: 14px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border-bottom: 2px solid #e7e1d2;
  position: sticky;
  top: 0;
  z-index: 200;
  font-family: "Inter", sans-serif;
}

/* LEFT & RIGHT MENUS */
.nav-left,
.nav-right {
  display: flex;
  align-items: center;
  gap: 30px;
}

.sss-navbar a {
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: 0.5px;
  transition: 0.2s;
}

.sss-navbar a:hover {
  color: var(--gold);
}

/* LOGO */
.nav-logo {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.nav-logo img {
  width: 48px;
  height: 48px;
}

.nav-logo span {
  font-size: 14px;
  font-weight: 700;
  color: var(--gold);
  margin-top: 4px;
}

/* SOCIAL ICONS */
.nav-social {
  display: flex;
  gap: 14px;
}

.nav-social i {
  font-size: 15px;
  color: var(--text);
  transition: 0.2s;
}

.nav-social i:hover {
  color: var(--gold);
}

/* HAMBURGER ICON (Mobile) */
.hamburger {
  display: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text);
}

/* MOBILE MENU PANEL */
.mobile-menu {
  display: none;
  flex-direction: column;
  background: #ffffff;
  border-top: 2px solid #e7e1d2;
  padding: 20px;
  gap: 20px;
  width: 100%;
  position: absolute;
  left: 0;
  top: 78px;
  z-index: 150;
}

.mobile-menu a {
  color: var(--text);
  font-size: 15px;
  font-weight: 600;
}

.mobile-menu a:hover {
  color: var(--gold);
}

/* RESPONSIVE */
@media (max-width: 980px) {
  .nav-left,
  .nav-right {
    display: none;
  }

  .hamburger {
    display: block;
  }
}
</style>
</head>

<body>

<header class="sss-navbar">

  <!-- LEFT MENU -->
  <div class="nav-left">
    <a href="#">HOME</a>
    <a href="#">ABOUT US</a>
    <a href="#">SERVICES</a>
  </div>

  <!-- LOGO CENTER -->
  <div class="nav-logo">
    <img src="asset/sss logo.png" alt="SSS Logo">
    <span>SHREE SPAACE SOLUTION</span>
  </div>

  <!-- RIGHT MENU -->
  <div class="nav-right">
    <a href="#">PROCESS</a>
    <a href="#">PROJECTS</a>
    <a href="#">CONTACT US</a>

    <div class="nav-social">
      <a href="#"><i class="fa-brands fa-instagram"></i></a>
      <a href="#"><i class="fa-brands fa-linkedin"></i></a>
      <a href="#"><i class="fa-solid fa-envelope"></i></a>
    </div>
  </div>

  <!-- HAMBURGER ICON -->
  <div class="hamburger" onclick="toggleMenu()">
    <i class="fa-solid fa-bars"></i>
  </div>

</header>

<!-- MOBILE MENU DROPDOWN -->
<div id="mobileMenu" class="mobile-menu">
  <a href="#">HOME</a>
  <a href="#">ABOUT US</a>
  <a href="#">SERVICES</a>
  <a href="#">PROCESS</a>
  <a href="#">PROJECTS</a>
  <a href="#">CONTACT US</a>

  <div style="display:flex; gap:15px; margin-top:10px;">
    <a href="#"><i class="fa-brands fa-instagram"></i></a>
    <a href="#"><i class="fa-brands fa-linkedin"></i></a>
    <a href="#"><i class="fa-solid fa-envelope"></i></a>
  </div>
</div>

<script>
function toggleMenu() {
  const menu = document.getElementById("mobileMenu");
  menu.style.display = menu.style.display === "flex" ? "none" : "flex";
}
</script>

</body>
</html>

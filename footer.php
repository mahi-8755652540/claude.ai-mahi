<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>SSS Footer</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<!-- Correct font -->
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">

<style>
:root {
  --gold: #d4a53b;
  --teal: #0a9c9c;
  --dark: #0c0f16;
  --white: #ffffff;
}

body {
  font-family: "Poppins", sans-serif !important;
}

/* MAIN FOOTER */
.sss-footer {
  background: linear-gradient(135deg, #0b0f16, #0d1520, #004d4d);
  color: var(--white);
  padding: 70px 40px 20px;
  font-family: "Poppins", sans-serif !important;
}

/* GOLD LINE */
.sss-gold-line {
  height: 3px;
  width: 120px;
  background: var(--gold);
  margin-bottom: 30px;
}

/* GRID */
.sss-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr 1fr;
  gap: 40px;
}
@media(max-width: 900px) {
  .sss-grid { grid-template-columns: 1fr; text-align: center; }
}

/* LOGO */
.sss-footer-logo img {
  width: 120px;
  filter: drop-shadow(0px 0px 12px rgba(212,165,59,0.5));
}

.sss-footer-desc {
  margin-top: 15px;
  line-height: 1.6;
  opacity: 0.85;
  font-size: 14px;
}

/* HEADINGS */
.sss-footer h3 {
  font-size: 20px;
  color: var(--gold);
  margin-bottom: 12px;
  font-weight: 600;
}

/* LISTS */
.sss-footer ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.sss-footer ul li {
  margin-bottom: 10px;
}

.sss-footer a {
  color: #e0e0e0;
  text-decoration: none;
  font-size: 14px;
  transition: 0.3s ease;
  font-weight: 400;
}

.sss-footer a:hover {
  color: var(--gold);
}

/* CONTACT ICONS */
.sss-footer i {
  margin-right: 8px;
  color: var(--gold);
}

/* COPYRIGHT */
.sss-copy {
  margin-top: 45px;
  padding-top: 18px;
  border-top: 1px solid rgba(255,255,255,0.15);
  text-align: center;
  font-size: 14px;
  opacity: 0.75;
}

/* GOLD LINKS */
.sss-footer-link {
  color: var(--gold) !important;
  font-weight: 500;
}
</style>
</head>

<body>

<footer class="sss-footer">

  <div class="sss-gold-line"></div>

  <div class="sss-grid">

    <!-- LOGO + ABOUT -->
    <div class="sss-footer-logo">
      <img src="asset/sss logo.png" alt="SSS Logo">
      <p class="sss-footer-desc">
        Shree Spaace Solution is a premium Interior Turnkey & Construction company 
        delivering corporate, commercial & industrial spaces with quality and precision.
      </p>
    </div>

    <!-- QUICK LINKS -->
    <div>
      <h3>Quick Links</h3>
      <ul>
        <li><a href="#">Home</a></li>
        <li><a href="#">About Company</a></li>
        <li><a href="#">Our Services</a></li>
        <li><a href="#">Projects</a></li>
        <li><a href="#">Contact Us</a></li>
      </ul>
    </div>

    <!-- WHAT WE DO -->
    <div>
      <h3>What We Do</h3>
      <ul>
        <li><a href="#">Design & Build</a></li>
        <li><a href="#">General Contracting</a></li>
        <li><a href="#">Refurbishment</a></li>
        <li><a href="#">Retail & Office Fitouts</a></li>
        <li><a href="#">Industrial Spaces</a></li>
      </ul>
    </div>

    <!-- CONTACT -->
    <div>
      <h3>Contact</h3>
      <ul>
        <li><i>📍</i> Gurgaon, Haryana</li>
        <li><i>📞</i> +91-9871548224</li>
        <li><i>✉️</i> info@shreespaacesolution.com</li>
        <br>

        <li><a class="sss-footer-link" href="#">Vendor Registration →</a></li>
        <li><a class="sss-footer-link" href="#">Careers →</a></li>
        <li><a class="sss-footer-link" href="#">Material Supplier • Vendor Registration →</a></li>
      </ul>
    </div>

  </div>

  <div class="sss-copy">
    © 2025 Shree Spaace Solution Pvt. Ltd. All Rights Reserved.
  </div>

</footer>

</body>
</html>

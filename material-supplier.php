<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Material Supplier • Vendor Registration Form</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">

  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: "Inter", sans-serif; }
    body { background: #f3f4f6; padding: 24px; display: flex; justify-content: center; }
    .wrapper { max-width: 900px; width: 100%; background: #fff; border-radius: 16px; padding: 28px 24px 32px;
      box-shadow: 0 18px 38px rgba(15,23,42,0.16); border-top: 6px solid #c9a456; }
    .title { font-size: 24px; font-weight: 600; margin-bottom: 4px; }
    .subtitle { font-size: 14px; color: #6b7280; margin-bottom: 22px; }
    .section { margin-bottom: 22px; padding-bottom: 16px; border-bottom: 1px dashed #e5e7eb; }
    .section:last-of-type { border-bottom: none; }
    .section-title { font-size: 16px; font-weight: 600; color: #0f766e; margin-bottom: 12px; }
    .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px 18px; }
    label { font-size: 13px; font-weight: 500; margin-bottom: 4px; display: block; }
    input[type="text"], input[type="email"], input[type="tel"], input[type="file"], textarea {
      width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid #d1d5db; background: #f9fafb; font-size: 13px;
    }
    textarea { min-height: 70px; resize: vertical; }
    .checkbox-group { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px 16px; }
    .checkbox-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
    .error { font-size: 12px; color: red; margin-top: 4px; display: none; }
    .info { font-size: 12px; margin-top: 4px; }
    .info.success { color: #16a34a; }
    .info.error { color: #dc2626; }
    .submit-row { margin-top: 18px; display: flex; justify-content: flex-end; gap: 10px; }
    button { border: none; padding: 9px 20px; border-radius: 999px; cursor: pointer; font-size: 13px; }
    .btn-secondary { background: #e5e7eb; }
    .btn-primary { background: linear-gradient(135deg, #c9a456, #0f766e); color: #fff; }
    .input-inline { display: flex; gap: 8px; align-items: center; }
    .input-inline input[type="email"] { flex: 1; }
    .small-btn {
      padding: 8px 12px;
      border-radius: 999px;
      font-size: 12px;
      background: #0f766e;
      color: #fff;
      cursor: pointer;
      white-space: nowrap;
    }
    .captcha-row {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }
    .captcha-box {
      padding: 8px 12px;
      border-radius: 8px;
      background: #111827;
      color: #f9fafb;
      font-weight: 600;
      letter-spacing: 1px;
    }
  </style>
</head>

<body>
  <div class="wrapper">
    <h1 class="title">Material Supplier • Vendor Registration Form</h1>
    <p class="subtitle">Please fill the details correctly.</p>

    <form id="vendorForm" action="submit_vendor.php" method="post" enctype="multipart/form-data">

      <!-- Company Details -->
      <div class="section">
        <div class="section-title">Company Details</div>

        <div class="grid-2">
          <div>
            <label>Company Name *</label>
            <input type="text" id="companyName" name="companyName" required />
            <p class="error">Enter a valid company name</p>
          </div>

          <div>
            <label>Contact Person *</label>
            <input type="text" id="contactPerson" name="contactPerson" required />
            <p class="error">Enter a valid name</p>
          </div>

          <div>
            <label>GSTIN</label>
            <input type="text" id="gstin" name="gstin" placeholder="07ABCDE1234F1Z5" />
            <p class="error">Invalid GST format</p>
          </div>

          <div>
            <label>PAN</label>
            <input type="text" id="pan" name="pan" placeholder="ABCDE1234F" />
            <p class="error">Invalid PAN number</p>
          </div>

          <div>
            <label>Mobile Number *</label>
            <input type="tel" id="mobile" name="mobile" required />
            <p class="error">Mobile must start with 6,7,8,9 and be 10 digits</p>
          </div>

          <div>
            <label>Email *</label>
            <div class="input-inline">
              <input type="email" id="email" name="email" required />
              <button type="button" class="small-btn" id="sendOtpBtn">Send Code</button>
            </div>
            <p class="error">Enter valid email address</p>
            <p class="info" id="otpInfo"></p>
          </div>

          <div>
            <label>Email Verification Code *</label>
            <input type="text" id="emailOtp" name="emailOtp" />
            <p class="error">Enter the 6-digit code sent to your email</p>
          </div>

          <div style="grid-column: 1/-1;">
            <label>Address *</label>
            <textarea id="address" name="address" required></textarea>
            <p class="error">Address cannot be empty</p>
          </div>
        </div>
      </div>

      <!-- Material Category -->
      <div class="section">
        <div class="section-title">Material Category</div>
        <div class="checkbox-group">
          <label class="checkbox-item"><input type="checkbox" name="materialCategory[]" value="Electrical Material"> Electrical Material</label>
          <label class="checkbox-item"><input type="checkbox" name="materialCategory[]" value="Hardware & Fasteners"> Hardware & Fasteners</label>
          <label class="checkbox-item"><input type="checkbox" name="materialCategory[]" value="Civil Material"> Civil Material</label>
          <label class="checkbox-item"><input type="checkbox" name="materialCategory[]" value="Interior/Carpentry Material"> Interior/Carpentry Material</label>
          <label class="checkbox-item"><input type="checkbox" name="materialCategory[]" value="Paint & Putty Material"> Paint & Putty Material</label>
          <label class="checkbox-item"><input type="checkbox" name="materialCategory[]" value="Plumbing Material"> Plumbing Material</label>
          <label class="checkbox-item"><input type="checkbox" name="materialCategory[]" value="Glass & Aluminium Material"> Glass & Aluminium Material</label>
          <label class="checkbox-item"><input type="checkbox" name="materialCategory[]" value="HVAC Material"> HVAC Material</label>
          <label class="checkbox-item"><input type="checkbox" name="materialCategory[]" value="Steel / Fabrication Material"> Steel / Fabrication Material</label>
          <label class="checkbox-item"><input type="checkbox" name="materialCategory[]" value="Misc. Material Purchase"> Misc. Material Purchase</label>
        </div>
      </div>

      <!-- Documents -->
      <div class="section">
        <div class="section-title">Upload Documents</div>
        <div class="grid-2">
          <div>
            <label>GST Certificate</label>
            <input type="file" name="gstCert" accept=".pdf,.jpg,.jpeg,.png" />
          </div>
          <div>
            <label>PAN Card</label>
            <input type="file" name="panCard" accept=".pdf,.jpg,.jpeg,.png" />
          </div>
          <div>
            <label>Cancelled Cheque</label>
            <input type="file" name="cancelledCheque" accept=".pdf,.jpg,.jpeg,.png" />
          </div>
          <div>
            <label>Product Catalogue</label>
            <input type="file" name="catalogue" accept=".pdf,.jpg,.jpeg,.png" />
          </div>
        </div>
      </div>

      <!-- Bank -->
      <div class="section">
        <div class="section-title">Bank Details</div>

        <div class="grid-2">
          <div>
            <label>Account Name</label>
            <input type="text" id="accountName" name="accountName" />
          </div>
          <div>
            <label>Account Number</label>
            <input type="text" id="accountNumber" name="accountNumber" />
          </div>
          <div>
            <label>Bank Name</label>
            <input type="text" id="bankName" name="bankName" />
          </div>
          <div>
            <label>IFSC Code</label>
            <input type="text" id="ifsc" name="ifsc" placeholder="SBIN0001234" />
            <p class="error">Invalid IFSC code</p>
          </div>
          <div style="grid-column:1/-1;">
            <label>Branch</label>
            <input type="text" id="branch" name="branch" />
          </div>
        </div>
      </div>

      <!-- CAPTCHA -->
      <div class="section">
        <div class="section-title">Security Check (Captcha)</div>
        <div class="captcha-row">
          <div class="captcha-box" id="captchaQuestion">--</div>
          <div style="flex:1; min-width:160px;">
            <label>Enter the above code *</label>
            <input type="text" id="captchaInput" name="captchaInput" />
            <p class="error">Captcha does not match</p>
          </div>
          <button type="button" class="small-btn" id="refreshCaptcha">Refresh</button>
        </div>
      </div>

      <!-- Submit -->
      <div class="submit-row">
        <button type="reset" class="btn-secondary">Reset</button>
        <button type="submit" class="btn-primary">Submit</button>
      </div>

    </form>
  </div>

<script>
let captchaAnswer = null;
let otpSent = false;

function generateCaptcha() {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  captchaAnswer = a + b;

  const fd = new FormData();
  fd.append('answer', captchaAnswer);
  // We don't need to wait for this, so no 'await' needed.
  fetch('captcha_session.php', { method: 'POST', body: fd });

  document.getElementById("captchaQuestion").textContent = a + " + " + b + " = ?";
  document.getElementById("captchaInput").value = "";
}

document.addEventListener("DOMContentLoaded", function () {
  generateCaptcha();

  document.getElementById("refreshCaptcha").addEventListener("click", generateCaptcha);

  const sendOtpBtn = document.getElementById("sendOtpBtn");
  const otpInfo = document.getElementById("otpInfo");

  sendOtpBtn.addEventListener("click", function () {
    const emailInput = document.getElementById("email");
    const email = emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      alert("Please enter a valid email before requesting code.");
      emailInput.focus();
      return;
    }

    otpInfo.className = "info";
    otpInfo.textContent = "Sending code...";

    const fd = new FormData();
    fd.append("email", email);

    fetch("send_otp.php", { method: "POST", body: fd })
      .then(r => r.json())
      .then(data => {
        if (data.status === "ok") {
          otpSent = true;
          otpInfo.className = "info success";
          otpInfo.textContent = "Verification code has been sent to your email.";
        } else {
          otpInfo.className = "info error";
          otpInfo.textContent = data.message || "Unable to send code. Please try again.";
        }
      })
      .catch(() => {
        otpInfo.className = "info error";
        otpInfo.textContent = "Error sending code. Please contact admin.";
      });
  });

  document.getElementById("vendorForm").addEventListener("submit", function(e) {
    let valid = true;

    function showError(inputId, condition) {
      const input = document.getElementById(inputId);
      if (!input) return;
      const container = input.closest("div");
      const errorEl = container.querySelector(".error");
      if (!errorEl) return;
      if (!condition) {
        errorEl.style.display = "block";
        valid = false;
      } else {
        errorEl.style.display = "none";
      }
    }

    showError("companyName", document.getElementById("companyName").value.trim() !== "");
    showError("contactPerson", document.getElementById("contactPerson").value.trim() !== "");
    showError("address", document.getElementById("address").value.trim() !== "");

    const mobileVal = document.getElementById("mobile").value.trim();
    showError("mobile", /^[6-9][0-9]{9}$/.test(mobileVal));

    const emailVal = document.getElementById("email").value.trim();
    showError("email", /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal));

    const gstVal = document.getElementById("gstin").value.trim();
    if (gstVal !== "") {
      showError("gstin", /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]([1-9A-Z])Z[0-9A-Z]$/.test(gstVal));
    }

    const panVal = document.getElementById("pan").value.trim();
    if (panVal !== "") {
      showError("pan", /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panVal));
    }

    const ifscVal = document.getElementById("ifsc").value.trim();
    if (ifscVal !== "") {
      showError("ifsc", /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscVal));
    }

    const otpVal = document.getElementById("emailOtp").value.trim();
    showError("emailOtp", otpSent && /^[0-9]{6}$/.test(otpVal));

    const captchaVal = document.getElementById("captchaInput").value.trim();
    showError("captchaInput", parseInt(captchaVal, 10) === captchaAnswer);

    if (!otpSent) {
      alert("Please click 'Send Code' and verify your email before submitting.");
      valid = false;
    }

    if (!valid) {
      e.preventDefault();
    }
  });
});
</script>

</body>
</html>

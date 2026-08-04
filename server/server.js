const express = require("express");
const cors    = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

/* ──────────────────────────────────────────────────────────────────
   STORAGE
   ────────────────────────────────────────────────────────────────── */
const otpStore      = {};           // { email: { otp, expiresAt } }
const otpCooldown   = {};           // { email: timestamp }
const verifiedEmails = new Set();

/* ──────────────────────────────────────────────────────────────────
   MAIL TRANSPORT
   ────────────────────────────────────────────────────────────────── */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/* ──────────────────────────────────────────────────────────────────
   EMAIL VALIDATION
   ────────────────────────────────────────────────────────────────── */
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/* ──────────────────────────────────────────────────────────────────
   MEETING SCHEDULING HELPER
   Generates all booking metadata server-side.
   Scheduled date = booking date + 2 business days (Mon–Fri only).
   ────────────────────────────────────────────────────────────────── */
const generateBookingMeta = (consultationType) => {
  /* ── Advance by 2 business days ── */
  const scheduled = new Date();
  let added = 0;
  while (added < 2) {
    scheduled.setDate(scheduled.getDate() + 1);
    const day = scheduled.getDay();
    if (day !== 0 && day !== 6) added++;   // skip Sat (6) and Sun (0)
  }

  /* ── Random time slot ── */
  const slots = ["10:00 AM", "11:00 AM", "2:00 PM", "3:00 PM", "4:00 PM"];
  const scheduledTime = slots[Math.floor(Math.random() * slots.length)];

  /* ── Random designer ── */
  const designers = [
    "Priya Sharma",
    "Arjun Mehta",
    "Kavitha Nair",
    "Rahul Verma",
    "Sneha Reddy",
    "Vikram Iyer",
  ];
  const designerName = designers[Math.floor(Math.random() * designers.length)];

  /* ── Booking ID: ARCA-YYYYMMDD-XXXX ── */
  const dateStr   = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand4     = Math.floor(1000 + Math.random() * 9000);
  const bookingId = `ARCA-${dateStr}-${rand4}`;

  /* ── Google Meet placeholder URL ── */
  const chars     = "abcdefghijklmnopqrstuvwxyz";
  const seg       = (n) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const meetingUrl = `https://meet.google.com/${seg(3)}-${seg(4)}-${seg(3)}`;

  /* ── Formatted date string ── */
  const scheduledDateISO     = scheduled.toISOString().slice(0, 10);
  const scheduledDateDisplay = scheduled.toLocaleDateString("en-IN", {
    weekday: "long",
    year:    "numeric",
    month:   "long",
    day:     "numeric",
  });

  return {
    bookingId,
    scheduledDate:        scheduledDateISO,
    scheduledDateDisplay,
    scheduledTime,
    designerName,
    meetingUrl,
    duration:           "60 minutes",
    meetingType:        "Google Meet (Virtual)",
    consultationType:   consultationType || "Interior Design",
    status:             "Confirmed",
  };
};

/* ──────────────────────────────────────────────────────────────────
   PREMIUM EMAIL TEMPLATE (user confirmation)
   ────────────────────────────────────────────────────────────────── */
const buildUserEmail = (data) => {
  const {
    name, bookingId, scheduledDateDisplay, scheduledTime,
    designerName, meetingUrl, consultationType,
  } = data;

  return /* html */`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ARCA Consultation Confirmed</title>
</head>
<body style="margin:0;padding:0;background:#f0eded;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0eded;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0"
      style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 30px rgba(71,6,6,0.10);">

      <!-- ── HEADER ── -->
      <tr>
        <td style="background:#470606;padding:44px 40px;text-align:center;">
          <p style="margin:0 0 6px 0;color:rgba(255,255,255,0.5);font-size:10px;
            letter-spacing:5px;text-transform:uppercase;font-family:Arial,sans-serif;">
            PREMIUM INTERIORS
          </p>
          <h1 style="margin:0 0 6px 0;color:#ffffff;font-family:Georgia,serif;
            font-size:38px;font-weight:normal;letter-spacing:8px;">
            ARCA
          </h1>
          <p style="margin:0;color:rgba(255,255,255,0.6);font-size:12px;
            letter-spacing:3px;font-family:Arial,sans-serif;text-transform:uppercase;">
            Interior Design
          </p>
        </td>
      </tr>

      <!-- ── CONFIRMATION BANNER ── -->
      <tr>
        <td style="background:#f9f4f4;border-bottom:1px solid #ecdcdc;
          padding:28px 40px;text-align:center;">
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 14px auto;">
            <tr><td style="width:50px;height:50px;background:#2e7d32;border-radius:50%;
              text-align:center;vertical-align:middle;font-size:24px;color:#fff;">
              ✓
            </td></tr>
          </table>
          <h2 style="margin:0 0 8px 0;color:#1a0505;font-size:22px;font-family:Georgia,serif;
            font-weight:normal;letter-spacing:1px;">
            Your Consultation is Confirmed!
          </h2>
          <p style="margin:0;color:#888;font-size:13px;font-family:Arial,sans-serif;">
            Booking Reference:&nbsp;
            <strong style="color:#470606;letter-spacing:1px;">${bookingId}</strong>
          </p>
        </td>
      </tr>

      <!-- ── GREETING ── -->
      <tr>
        <td style="padding:32px 40px 20px;">
          <p style="margin:0 0 14px 0;color:#333;font-size:16px;line-height:1.6;">
            Dear ${name},
          </p>
          <p style="margin:0;color:#555;font-size:14px;line-height:1.9;
            font-family:Arial,sans-serif;">
            Thank you for choosing <strong>ARCA Interior Design</strong>. Your consultation
            has been successfully scheduled. We are thrilled to help you create a space
            that reflects your unique lifestyle and vision.
          </p>
        </td>
      </tr>

      <!-- ── BOOKING DETAILS TABLE ── -->
      <tr>
        <td style="padding:0 40px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0"
            style="border:1px solid #ecdcdc;border-radius:8px;overflow:hidden;">

            <tr>
              <td colspan="2" style="background:#470606;padding:14px 20px;">
                <p style="margin:0;color:#fff;font-size:11px;letter-spacing:2px;
                  text-transform:uppercase;font-family:Arial,sans-serif;">
                  Booking Details
                </p>
              </td>
            </tr>

            <tr style="border-bottom:1px solid #f5eaea;">
              <td style="padding:13px 20px;color:#999;font-size:13px;
                font-family:Arial,sans-serif;width:45%;border-bottom:1px solid #f5eaea;">
                Consultation Type
              </td>
              <td style="padding:13px 20px;color:#222;font-size:13px;font-weight:bold;
                font-family:Arial,sans-serif;border-bottom:1px solid #f5eaea;">
                ${consultationType} Consultation
              </td>
            </tr>

            <tr style="border-bottom:1px solid #f5eaea;">
              <td style="padding:13px 20px;color:#999;font-size:13px;
                font-family:Arial,sans-serif;border-bottom:1px solid #f5eaea;">
                Scheduled Date
              </td>
              <td style="padding:13px 20px;color:#222;font-size:13px;font-weight:bold;
                font-family:Arial,sans-serif;border-bottom:1px solid #f5eaea;">
                ${scheduledDateDisplay}
              </td>
            </tr>

            <tr style="border-bottom:1px solid #f5eaea;">
              <td style="padding:13px 20px;color:#999;font-size:13px;
                font-family:Arial,sans-serif;border-bottom:1px solid #f5eaea;">
                Scheduled Time
              </td>
              <td style="padding:13px 20px;color:#222;font-size:13px;font-weight:bold;
                font-family:Arial,sans-serif;border-bottom:1px solid #f5eaea;">
                ${scheduledTime} IST
              </td>
            </tr>

            <tr style="border-bottom:1px solid #f5eaea;">
              <td style="padding:13px 20px;color:#999;font-size:13px;
                font-family:Arial,sans-serif;border-bottom:1px solid #f5eaea;">
                Duration
              </td>
              <td style="padding:13px 20px;color:#222;font-size:13px;
                font-family:Arial,sans-serif;border-bottom:1px solid #f5eaea;">
                60 Minutes
              </td>
            </tr>

            <tr style="border-bottom:1px solid #f5eaea;">
              <td style="padding:13px 20px;color:#999;font-size:13px;
                font-family:Arial,sans-serif;border-bottom:1px solid #f5eaea;">
                Meeting Type
              </td>
              <td style="padding:13px 20px;color:#222;font-size:13px;
                font-family:Arial,sans-serif;border-bottom:1px solid #f5eaea;">
                Google Meet (Virtual)
              </td>
            </tr>

            <tr style="border-bottom:1px solid #f5eaea;">
              <td style="padding:13px 20px;color:#999;font-size:13px;
                font-family:Arial,sans-serif;border-bottom:1px solid #f5eaea;">
                Assigned Designer
              </td>
              <td style="padding:13px 20px;color:#222;font-size:13px;font-weight:bold;
                font-family:Arial,sans-serif;border-bottom:1px solid #f5eaea;">
                ${designerName}
              </td>
            </tr>

            <tr>
              <td style="padding:13px 20px;color:#999;font-size:13px;
                font-family:Arial,sans-serif;">
                Google Meet Link
              </td>
              <td style="padding:13px 20px;font-size:13px;font-family:Arial,sans-serif;">
                <a href="${meetingUrl}" style="color:#470606;text-decoration:underline;">
                  ${meetingUrl}
                </a>
              </td>
            </tr>

          </table>
        </td>
      </tr>

      <!-- ── JOIN BUTTON ── -->
      <tr>
        <td style="padding:0 40px 36px;text-align:center;">
          <a href="${meetingUrl}"
            style="display:inline-block;background:#470606;color:#ffffff;
            text-decoration:none;padding:15px 42px;border-radius:6px;
            font-family:Arial,sans-serif;font-size:14px;letter-spacing:1.5px;">
            JOIN MEETING →
          </a>
        </td>
      </tr>

      <!-- ── PREPARATION CHECKLIST ── -->
      <tr>
        <td style="padding:0 40px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:#fdf8f5;border:1px solid #f0e0d0;border-radius:8px;
            overflow:hidden;">
            <tr>
              <td style="padding:16px 20px;border-bottom:1px solid #f0e0d0;">
                <p style="margin:0;color:#470606;font-size:14px;font-weight:bold;
                  font-family:Arial,sans-serif;letter-spacing:0.5px;">
                  📋 Preparation Checklist
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 20px;">
                <p style="margin:0 0 10px 0;color:#555;font-size:13px;
                  font-family:Arial,sans-serif;line-height:1.6;">
                  Please have the following ready before your consultation:
                </p>
                <table cellpadding="0" cellspacing="0">
                  <tr><td style="padding:4px 0;color:#555;font-size:13px;
                    font-family:Arial,sans-serif;">
                    &nbsp;✦&nbsp; Room dimensions (length × width × height)
                  </td></tr>
                  <tr><td style="padding:4px 0;color:#555;font-size:13px;
                    font-family:Arial,sans-serif;">
                    &nbsp;✦&nbsp; Reference images or inspiration boards
                  </td></tr>
                  <tr><td style="padding:4px 0;color:#555;font-size:13px;
                    font-family:Arial,sans-serif;">
                    &nbsp;✦&nbsp; Your approximate budget range
                  </td></tr>
                  <tr><td style="padding:4px 0;color:#555;font-size:13px;
                    font-family:Arial,sans-serif;">
                    &nbsp;✦&nbsp; List of specific requirements or preferences
                  </td></tr>
                  <tr><td style="padding:4px 0;color:#555;font-size:13px;
                    font-family:Arial,sans-serif;">
                    &nbsp;✦&nbsp; Questions for your designer
                  </td></tr>
                  <tr><td style="padding:4px 0;color:#555;font-size:13px;
                    font-family:Arial,sans-serif;">
                    &nbsp;✦&nbsp; Photos of the current space (if renovation)
                  </td></tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- ── RESCHEDULE NOTE ── -->
      <tr>
        <td style="padding:0 40px 36px;">
          <table width="100%" cellpadding="0" cellspacing="0"
            style="border-left:3px solid #470606;background:#fafafa;border-radius:0 6px 6px 0;">
            <tr>
              <td style="padding:16px 18px;">
                <p style="margin:0;color:#555;font-size:13px;font-family:Arial,sans-serif;
                  line-height:1.8;">
                  <strong style="color:#333;">Need to reschedule?</strong>
                  Please contact us at least <strong>24 hours in advance</strong> at
                  <a href="mailto:support@arca.in" style="color:#470606;">support@arca.in</a>
                  or call <strong>+91 98765 43210</strong>.
                  We will be happy to find a suitable time for you.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- ── FOOTER ── -->
      <tr>
        <td style="background:#1a0505;padding:36px 40px;text-align:center;">
          <p style="margin:0 0 6px 0;color:#ffffff;font-size:15px;
            font-family:Georgia,serif;letter-spacing:1px;">
            Thank you for choosing <strong>ARCA</strong>.
          </p>
          <p style="margin:0 0 24px 0;color:rgba(255,255,255,0.55);font-size:13px;
            font-family:Arial,sans-serif;line-height:1.7;">
            We look forward to helping you create a space that reflects<br/>
            your lifestyle and vision.
          </p>
          <p style="margin:0;color:#666;font-size:11px;font-family:Arial,sans-serif;
            border-top:1px solid #330000;padding-top:20px;line-height:1.8;">
            © ${new Date().getFullYear()} ARCA Interior Design &nbsp;·&nbsp;
            Chennai, Tamil Nadu<br/>
            <a href="mailto:support@arca.in" style="color:#666;">support@arca.in</a>
            &nbsp;·&nbsp; +91 98765 43210
          </p>
        </td>
      </tr>

      <!-- ── DISCLAIMER ── -->
      <tr>
        <td style="background:#0d0303;padding:20px 40px;">
          <p style="margin:0;color:#555;font-size:10px;line-height:1.8;
            font-family:Arial,sans-serif;text-align:center;">
            <strong style="color:#666;">Disclaimer:</strong>
            This platform has been developed as a portfolio and educational project to demonstrate
            modern web application development, UI/UX design, authentication, booking workflows
            and full-stack integration. The consultation scheduling and meeting information are
            part of this demonstration environment and may not represent commercial interior
            design services.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
};

/* ──────────────────────────────────────────────────────────────────
   HEALTH CHECK
   ────────────────────────────────────────────────────────────────── */
app.get("/", (req, res) => {
  res.send("ARCA Server Running");
});

/* ──────────────────────────────────────────────────────────────────
   SEND OTP
   ────────────────────────────────────────────────────────────────── */
app.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  if (!validateEmail(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  const lastSent = otpCooldown[email];
  if (lastSent && Date.now() - lastSent < 60 * 1000) {
    return res.status(429).json({
      message: "Please wait 60 seconds before requesting another OTP",
    });
  }

  const otp       = Math.floor(100000 + Math.random() * 900000);
  const expiresAt = Date.now() + 5 * 60 * 1000;

  otpStore[email]    = { otp, expiresAt };
  otpCooldown[email] = Date.now();

  try {
    await transporter.sendMail({
      from:    process.env.EMAIL_USER,
      to:      email,
      subject: "Your OTP for ARCA Consultancy",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;
          padding:32px;background:#fff;border:1px solid #f0e0e0;border-radius:8px;">
          <h2 style="color:#470606;font-size:22px;margin-bottom:8px;">OTP Verification</h2>
          <p style="color:#555;font-size:14px;margin-bottom:20px;">
            Your one-time password for ARCA consultancy booking:
          </p>
          <div style="background:#f9f4f4;border:2px dashed #ecdcdc;border-radius:8px;
            padding:20px;text-align:center;font-size:32px;font-weight:bold;
            color:#470606;letter-spacing:8px;margin-bottom:20px;">
            ${otp}
          </div>
          <p style="color:#888;font-size:12px;">
            This OTP is valid for <strong>5 minutes</strong>. Do not share it with anyone.
          </p>
        </div>
      `,
    });

    res.json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

/* ──────────────────────────────────────────────────────────────────
   VERIFY OTP
   ────────────────────────────────────────────────────────────────── */
app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore[email];

  if (!record) {
    return res.status(400).json({ verified: false, message: "OTP not found" });
  }

  if (Date.now() > record.expiresAt) {
    delete otpStore[email];
    return res.status(400).json({ verified: false, message: "OTP expired" });
  }

  if (record.otp == otp) {                  // loose equality: string "123456" == number
    delete otpStore[email];
    verifiedEmails.add(email);
    return res.json({ verified: true });
  }

  res.status(400).json({ verified: false, message: "Invalid OTP" });
});

/* ──────────────────────────────────────────────────────────────────
   BOOK CONSULTANCY
   Now returns all scheduling metadata so the client can save it
   to Firestore and display it on the Bookings page.
   ────────────────────────────────────────────────────────────────── */
app.post("/book-consultancy", async (req, res) => {
  try {
    const { name, email, mobile, city, consultationType, firebaseAuthenticated } = req.body;

    /*
     * OTP gate:
     *   - Guest users   → must have a verified email in the verifiedEmails store
     *   - Firebase auth → trusted; skip the OTP gate entirely
     */
    if (!firebaseAuthenticated && !verifiedEmails.has(email)) {
      return res.status(400).json({ message: "Email not verified with OTP" });
    }

    /* ── Generate scheduling metadata ── */
    const meta = generateBookingMeta(consultationType || "Interior Design");

    /* ── Admin notification email ── */
    const adminMail = {
      from:    process.env.EMAIL_USER,
      to:      process.env.EMAIL_USER,
      subject: `New ARCA Booking — ${meta.bookingId}`,
      html: `
        <div style="font-family:Arial,sans-serif;padding:24px;">
          <h2 style="color:#470606;">New Consultancy Booking</h2>
          <table>
            <tr><td style="padding:6px 16px 6px 0;color:#888;">Booking ID</td>
                <td><strong>${meta.bookingId}</strong></td></tr>
            <tr><td style="padding:6px 16px 6px 0;color:#888;">Name</td>
                <td>${name}</td></tr>
            <tr><td style="padding:6px 16px 6px 0;color:#888;">Email</td>
                <td>${email}</td></tr>
            <tr><td style="padding:6px 16px 6px 0;color:#888;">Mobile</td>
                <td>+91 ${mobile}</td></tr>
            <tr><td style="padding:6px 16px 6px 0;color:#888;">City</td>
                <td>${city}</td></tr>
            <tr><td style="padding:6px 16px 6px 0;color:#888;">Consultation</td>
                <td>${meta.consultationType}</td></tr>
            <tr><td style="padding:6px 16px 6px 0;color:#888;">Scheduled</td>
                <td>${meta.scheduledDateDisplay} at ${meta.scheduledTime}</td></tr>
            <tr><td style="padding:6px 16px 6px 0;color:#888;">Designer</td>
                <td>${meta.designerName}</td></tr>
          </table>
        </div>
      `,
    };

    /* ── User confirmation email ── */
    const userMail = {
      from:    process.env.EMAIL_USER,
      to:      email,
      subject: `Your ARCA Interior Design Consultation Has Been Scheduled — ${meta.bookingId}`,
      html:    buildUserEmail({ name, ...meta }),
    };

    /* ── Send both emails ── */
    const [adminResult, userResult] = await Promise.allSettled([
      transporter.sendMail(adminMail),
      transporter.sendMail(userMail),
    ]);

    console.log("Admin email:", adminResult.status);
    console.log("User email:", userResult.status);

    /* ── Cleanup verified email (guests only) ── */
    if (!firebaseAuthenticated) {
      verifiedEmails.delete(email);
    }

    /* ── Return metadata to client for Firestore storage ── */
    res.status(200).json({
      message: "Consultancy booked successfully",
      booking: meta,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to process booking" });
  }
});

/* ──────────────────────────────────────────────────────────────────
   START SERVER
   ────────────────────────────────────────────────────────────────── */
app.listen(5000, () => {
  console.log("ARCA Server running on port 5000");
});
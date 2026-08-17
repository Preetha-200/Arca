const express = require("express");
const cors    = require("cors");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const path = require("path");
require("dotenv").config();
const { initializeApp, getApps } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();


const ALLOWED_ORIGINS = [
  "https://arca-seven-coral.vercel.app",  // Production Vercel frontend
  "http://localhost:5173",                 // Vite dev server (default port)
  "http://localhost:3000",                 // alternate local port
  /^https:\/\/arca.*\.vercel\.app$/,       // Any Vercel preview deploy
];

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server / curl / Postman (no origin)
      if (!origin) return callback(null, true);
      const allowed = ALLOWED_ORIGINS.some((o) =>
        typeof o === "string" ? o === origin : o.test(origin)
      );
      if (allowed) return callback(null, true);
      callback(new Error(`CORS: origin not allowed — ${origin}`));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
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

            ${meetingUrl ? `<tr>
              <td style="padding:13px 20px;color:#999;font-size:13px;
                font-family:Arial,sans-serif;">
                Google Meet Link
              </td>
              <td style="padding:13px 20px;font-size:13px;font-family:Arial,sans-serif;">
                <a href="${meetingUrl}" style="color:#470606;text-decoration:underline;">
                  ${meetingUrl}
                </a>
              </td>
            </tr>` : `<tr>
              <td style="padding:13px 20px;color:#999;font-size:13px;
                font-family:Arial,sans-serif;">
                Meeting Link
              </td>
              <td style="padding:13px 20px;font-size:13px;font-family:Arial,sans-serif;color:#555">
                To be provided by your designer
              </td>
            </tr>`}

          </table>
        </td>
      </tr>

      <!-- ── JOIN BUTTON ── -->
      ${meetingUrl ? `<tr>
        <td style="padding:0 40px 36px;text-align:center;">
          <a href="${meetingUrl}"
            style="display:inline-block;background:#470606;color:#ffffff;
            text-decoration:none;padding:15px 42px;border-radius:6px;
            font-family:Arial,sans-serif;font-size:14px;letter-spacing:1.5px;">
            JOIN MEETING →
          </a>
        </td>
      </tr>` : ''}

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
            This platform is a demonstration environment created to showcase modern web technologies and interior design concepts. Please note that ARCA is a portfolio project and this booking does not represent a commercial interior design agreement.
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
   PENDING EMAIL TEMPLATE (customer initial booking)
   ────────────────────────────────────────────────────────────────── */
const buildCustomerPendingEmail = (data) => {
  const { name, bookingId, consultationType, city } = data;
  return /* html */`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Your ARCA Consultation Request is Received</title>
</head>
<body style="margin:0;padding:0;background:#f0eded;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0eded;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0"
      style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 30px rgba(71,6,6,0.10);">
      <!-- HEADER -->
      <tr>
        <td style="background:#470606;padding:30px 40px;text-align:center;">
          <img src="cid:arcalogo" alt="ARCA" width="140" style="display:block;margin:0 auto;" />
        </td>
      </tr>
      
      <!-- CONTENT -->
      <tr>
        <td style="padding:32px 40px;">
          <p style="margin:0 0 20px 0;color:#333;font-size:16px;line-height:1.6;">
            Dear ${name},<br><br>
            Thank you for reaching out to <strong>ARCA</strong>. We have received your consultation request.
          </p>
          
          <table width="100%" cellpadding="0" cellspacing="0"
            style="border:1px solid #ecdcdc;border-radius:8px;overflow:hidden;margin-bottom:20px;">
            <tr>
              <td colspan="2" style="background:#f9f4f4;padding:12px 20px;
                border-bottom:1px solid #ecdcdc;font-family:Arial,sans-serif;font-weight:bold;color:#470606;">
                Booking Details
              </td>
            </tr>
            <tr>
              <td style="padding:12px 20px;color:#888;font-size:13px;font-family:Arial,sans-serif;width:40%;border-bottom:1px solid #f5eaea;">Booking ID</td>
              <td style="padding:12px 20px;color:#222;font-size:13px;font-family:Arial,sans-serif;font-weight:bold;border-bottom:1px solid #f5eaea;">${bookingId}</td>
            </tr>
            <tr>
              <td style="padding:12px 20px;color:#888;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f5eaea;">Consultation</td>
              <td style="padding:12px 20px;color:#222;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f5eaea;">${consultationType}</td>
            </tr>
            ${city ? `<tr>
              <td style="padding:12px 20px;color:#888;font-size:13px;font-family:Arial,sans-serif;">City</td>
              <td style="padding:12px 20px;color:#222;font-size:13px;font-family:Arial,sans-serif;">${city}</td>
            </tr>` : ''}
          </table>
          
          <p style="margin:0;color:#666;font-size:14px;line-height:1.6;">
            Our team is currently reviewing your details. We will contact you shortly to confirm 
            the date, time, and assign a designer for your consultation.
          </p>
        </td>
      </tr>
      
      <!-- FOOTER -->
      <tr>
        <td style="padding:20px 40px;text-align:center;border-top:1px solid #eeeeee;">
          <p style="margin:0;color:#999999;font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">
            © ${new Date().getFullYear()} ARCA Interior Design<br>
            <a href="mailto:support@arca.in" style="color:#666666;text-decoration:none;">support@arca.in</a>
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
   CUSTOMER CONFIRMATION TEMPLATE
   ────────────────────────────────────────────────────────────────── */
const buildCustomerConfirmedEmail = (data) => {
  const { name, bookingId, consultationType, scheduledDate, scheduledTime, meetingUrl } = data;
  return /* html */`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Your ARCA Consultation is Confirmed</title>
</head>
<body style="margin:0;padding:0;background:#f0eded;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0eded;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0"
      style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 30px rgba(71,6,6,0.10);">
      <!-- HEADER -->
      <tr>
        <td style="background:#470606;padding:30px 40px;text-align:center;">
          <img src="cid:arcalogo" alt="ARCA" width="140" style="display:block;margin:0 auto;" />
        </td>
      </tr>
      
      <!-- CONTENT -->
      <tr>
        <td style="padding:32px 40px;">
          <p style="margin:0 0 20px 0;color:#333;font-size:16px;line-height:1.6;">
            Dear ${name},<br><br>
            Your ${consultationType} consultation has been officially scheduled. Please find your meeting details below.
          </p>
          
          <table width="100%" cellpadding="0" cellspacing="0"
            style="border:1px solid #ecdcdc;border-radius:8px;overflow:hidden;margin-bottom:30px;">
            <tr>
              <td colspan="2" style="background:#f9f4f4;padding:12px 20px;
                border-bottom:1px solid #ecdcdc;font-family:Arial,sans-serif;font-weight:bold;color:#470606;">
                Meeting Details
              </td>
            </tr>
            <tr>
              <td style="padding:12px 20px;color:#888;font-size:13px;font-family:Arial,sans-serif;width:40%;border-bottom:1px solid #f5eaea;">Booking ID</td>
              <td style="padding:12px 20px;color:#222;font-size:13px;font-family:Arial,sans-serif;font-weight:bold;border-bottom:1px solid #f5eaea;">${bookingId}</td>
            </tr>
            <tr>
              <td style="padding:12px 20px;color:#888;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f5eaea;">Date</td>
              <td style="padding:12px 20px;color:#222;font-size:13px;font-family:Arial,sans-serif;font-weight:bold;border-bottom:1px solid #f5eaea;">${scheduledDate}</td>
            </tr>
            <tr>
              <td style="padding:12px 20px;color:#888;font-size:13px;font-family:Arial,sans-serif;">Time</td>
              <td style="padding:12px 20px;color:#222;font-size:13px;font-family:Arial,sans-serif;font-weight:bold;">${scheduledTime}</td>
            </tr>
          </table>
          
          <div style="text-align:center;margin-bottom:30px;">
            <a href="${meetingUrl}" style="display:inline-block;background:#470606;color:#ffffff;
              text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:bold;
              font-family:Arial,sans-serif;letter-spacing:1px;">
              Join Google Meet
            </a>
          </div>

          <p style="margin:0;color:#666;font-size:14px;line-height:1.6;">
            We look forward to discussing your project.<br>
            If you need to reschedule, please reply directly to this email.
          </p>
        </td>
      </tr>
      
      <!-- FOOTER -->
      <tr>
        <td style="padding:20px 40px;text-align:center;border-top:1px solid #eeeeee;">
          <p style="margin:0;color:#999999;font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">
            © ${new Date().getFullYear()} ARCA Interior Design<br>
            <a href="mailto:support@arca.in" style="color:#666666;text-decoration:none;">support@arca.in</a>
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
   ADMIN NOTIFICATION TEMPLATE
   ────────────────────────────────────────────────────────────────── */
const buildAdminNotificationEmail = (data) => {
  const { 
    bookingId, name, email, mobile, city, consultationType, 
    projectType, propertyType, spaceType, dimensions, 
    budget, productName, confirmUrl
  } = data;
  
  return /* html */`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>New ARCA Booking</title>
</head>
<body style="margin:0;padding:0;background:#f0eded;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0eded;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0"
      style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 30px rgba(71,6,6,0.10);">
      <!-- HEADER -->
      <tr>
        <td style="background:#470606;padding:30px 40px;text-align:center;">
          <img src="cid:arcalogo" alt="ARCA" width="140" style="display:block;margin:0 auto;" />
        </td>
      </tr>
      
      <!-- DETAILS -->
      <tr>
        <td style="padding:32px 40px;">
          <p style="margin:0 0 20px 0;color:#333;font-size:16px;line-height:1.6;">
            A new consultation request has been submitted.
          </p>
          
          <table width="100%" cellpadding="0" cellspacing="0"
            style="border:1px solid #ecdcdc;border-radius:8px;overflow:hidden;">
            <tr>
              <td colspan="2" style="background:#f9f4f4;padding:12px 20px;
                border-bottom:1px solid #ecdcdc;font-family:Arial,sans-serif;font-weight:bold;color:#470606;">
                Customer Details
              </td>
            </tr>
            <tr>
              <td style="padding:12px 20px;color:#888;font-size:13px;font-family:Arial,sans-serif;width:40%;border-bottom:1px solid #f5eaea;">Booking ID</td>
              <td style="padding:12px 20px;color:#222;font-size:13px;font-family:Arial,sans-serif;font-weight:bold;border-bottom:1px solid #f5eaea;">${bookingId}</td>
            </tr>
            <tr>
              <td style="padding:12px 20px;color:#888;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f5eaea;">Name</td>
              <td style="padding:12px 20px;color:#222;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f5eaea;">${name}</td>
            </tr>
            <tr>
              <td style="padding:12px 20px;color:#888;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f5eaea;">Email</td>
              <td style="padding:12px 20px;color:#222;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f5eaea;">${email}</td>
            </tr>
            <tr>
              <td style="padding:12px 20px;color:#888;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f5eaea;">Mobile</td>
              <td style="padding:12px 20px;color:#222;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f5eaea;">+91 ${mobile}</td>
            </tr>
            <tr>
              <td style="padding:12px 20px;color:#888;font-size:13px;font-family:Arial,sans-serif;">City</td>
              <td style="padding:12px 20px;color:#222;font-size:13px;font-family:Arial,sans-serif;">${city}</td>
            </tr>
          </table>
          
          <table width="100%" cellpadding="0" cellspacing="0"
            style="border:1px solid #ecdcdc;border-radius:8px;overflow:hidden;margin-top:20px;">
            <tr>
              <td colspan="2" style="background:#f9f4f4;padding:12px 20px;
                border-bottom:1px solid #ecdcdc;font-family:Arial,sans-serif;font-weight:bold;color:#470606;">
                Project Details
              </td>
            </tr>
            <tr>
              <td style="padding:12px 20px;color:#888;font-size:13px;font-family:Arial,sans-serif;width:40%;border-bottom:1px solid #f5eaea;">Consultation</td>
              <td style="padding:12px 20px;color:#222;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f5eaea;">${consultationType}</td>
            </tr>
            ${projectType ? `<tr>
              <td style="padding:12px 20px;color:#888;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f5eaea;">Project Type</td>
              <td style="padding:12px 20px;color:#222;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f5eaea;">${projectType} - ${propertyType || 'N/A'}</td>
            </tr>` : ''}
            ${spaceType ? `<tr>
              <td style="padding:12px 20px;color:#888;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f5eaea;">Space</td>
              <td style="padding:12px 20px;color:#222;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f5eaea;">${spaceType} ${dimensions ? `(${dimensions})` : ''}</td>
            </tr>` : ''}
            ${budget ? `<tr>
              <td style="padding:12px 20px;color:#888;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f5eaea;">Budget</td>
              <td style="padding:12px 20px;color:#222;font-size:13px;font-family:Arial,sans-serif;border-bottom:1px solid #f5eaea;">${budget}</td>
            </tr>` : ''}
            ${productName ? `<tr>
              <td style="padding:12px 20px;color:#888;font-size:13px;font-family:Arial,sans-serif;">Product</td>
              <td style="padding:12px 20px;color:#222;font-size:13px;font-family:Arial,sans-serif;">${productName}</td>
            </tr>` : ''}
          </table>
          
          <div style="text-align:center;margin-top:30px;">
            <a href="${confirmUrl}" style="display:inline-block;background:#470606;color:#ffffff;
              text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:bold;
              font-family:Arial,sans-serif;letter-spacing:1px;">
              Confirm Booking
            </a>
          </div>
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
    const { 
      name, email, mobile, city, consultationType, firebaseAuthenticated, userId,
      projectType, propertyType, spaceType, dimensions, ceilingHeight,
      budget, interiorStyle, preferredTheme, description, preferredDate,
      preferredTime, productId, productName, referenceImages
    } = req.body;

    /*
     * OTP gate:
     *   - Guest users   → must have a verified email in the verifiedEmails store
     *   - Firebase auth → trusted; skip the OTP gate entirely
     */
    if (!firebaseAuthenticated && !verifiedEmails.has(email)) {
      return res.status(400).json({ message: "Email not verified with OTP" });
    }

    if (userId) {
      const activeSnapshot = await db.collection("bookings")
        .where("userId", "==", userId)
        .where("status", "in", ["pending", "Pending", "Confirmed", "confirmed", "Rescheduled"])
        .get();
      
      let hasActive = false;
      const parseTime = (timeStr) => {
        if (!timeStr) return { hours: 10, minutes: 0 };
        const [timePart, ampm] = timeStr.split(" ");
        let [hours, minutes]   = timePart.split(":").map(Number);
        if (ampm === "PM" && hours !== 12) hours += 12;
        if (ampm === "AM" && hours === 12) hours = 0;
        return { hours, minutes };
      };

      activeSnapshot.forEach(doc => {
        const b = doc.data();
        let isMissed = false;
        if (b.scheduledDate && b.scheduledTime && (b.status === "Confirmed" || b.status === "confirmed")) {
          const { hours, minutes } = parseTime(b.scheduledTime);
          const [y, m, d] = b.scheduledDate.split("-").map(Number);
          const mTime = new Date(y, m - 1, d, hours, minutes, 0).getTime();
          if (Date.now() > mTime) isMissed = true;
        }
        if (!isMissed) hasActive = true;
      });

      if (hasActive) {
        return res.status(400).json({ code: "ACTIVE_BOOKING_EXISTS", message: "You already have a consultation scheduled." });
      }
    }

    /* ── Generate scheduling metadata ── */
    const bookingData = {
      name,
      email,
      mobile: mobile || "",
      city: city || "",
      consultationType: consultationType || "Interior Design",
      projectType: projectType || "",
      propertyType: propertyType || "",
      spaceType: spaceType || "",
      dimensions: dimensions || "",
      ceilingHeight: ceilingHeight || "",
      budget: budget || "",
      interiorStyle: interiorStyle || "",
      preferredTheme: preferredTheme || "",
      description: description || "",
      preferredDate: preferredDate || "",
      preferredTime: preferredTime || "",
      productId: productId || "",
      productName: productName || "",
      referenceImages: referenceImages || [],
      status: "pending",
      userId: userId || "",
      confirmationToken: crypto.randomBytes(32).toString("hex"),
      createdAt: FieldValue.serverTimestamp(),
    };
    
    const bookingRef = await db.collection("bookings").add(bookingData);
    const bookingId = bookingRef.id;
    bookingData.bookingId = bookingId;

    const baseUrl = process.env.BACKEND_URL || "http://localhost:5000";
    const confirmUrl = `${baseUrl}/api/admin/confirm-booking-test/${bookingId}?token=${bookingData.confirmationToken}`;

    /* ── Admin notification email ── */
    const adminMail = {
      from:    process.env.EMAIL_USER,
      to:      process.env.EMAIL_USER,
      subject: `New ARCA Booking — ${bookingId}`,
      attachments: [{
        filename: 'logo.png',
        path: path.join(__dirname, '../client/public/logo.png'),
        cid: 'arcalogo'
      }],
      html: buildAdminNotificationEmail({
        bookingId,
        name,
        email,
        mobile: mobile || "",
        city: city || "",
        consultationType: bookingData.consultationType,
        projectType: bookingData.projectType,
        propertyType: bookingData.propertyType,
        spaceType: bookingData.spaceType,
        dimensions: bookingData.dimensions,
        budget: bookingData.budget,
        productName: bookingData.productName,
        confirmUrl
      }),
    };

    try {
      console.log(`[OWNER EMAIL] Sending to ${process.env.EMAIL_USER}...`);
      await transporter.sendMail(adminMail);
      console.log("[OWNER EMAIL] Successfully sent.");
    } catch (err) {
      console.error("[OWNER EMAIL] Failed to send:", err.message || err);
    }
    
    /* ── Customer confirmation email ── */
    const customerMail = {
      from:    process.env.EMAIL_USER,
      to:      email,
      subject: `Your ARCA Consultation Request — ${bookingId}`,
      attachments: [{
        filename: 'logo.png',
        path: path.join(__dirname, '../client/public/logo.png'),
        cid: 'arcalogo'
      }],
      html: buildCustomerPendingEmail({
        bookingId,
        name,
        consultationType: bookingData.consultationType,
        city: city || ""
      }),
    };

    try {
      console.log(`[CUSTOMER EMAIL] Sending to ${email}...`);
      await transporter.sendMail(customerMail);
      console.log("[CUSTOMER EMAIL] Successfully sent.");
    } catch (err) {
      console.error("[CUSTOMER EMAIL] Failed to send:", err.message || err);
    }
    
    await db.collection("notifications").add({
      type: "new_booking",
      title: "New Consultation Booking",
      message: `New booking from ${name} for ${bookingData.consultationType}.`,
      bookingId: bookingId,
      read: false,
      createdAt: FieldValue.serverTimestamp()
    });


    /* ── Cleanup verified email (guests only) ── */
    if (!firebaseAuthenticated) {
      verifiedEmails.delete(email);
    }

    /* ── Return metadata to client for Firestore storage ── */
    res.status(200).json({
      message: "Consultancy booked successfully",
      booking: bookingData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to process booking" });
  }
});

/* ──────────────────────────────────────────────────────────────────
   TESTING: AUTOMATED CONFIRM BOOKING VIA EMAIL LINK
   ────────────────────────────────────────────────────────────────── */
app.get("/api/admin/confirm-booking-test/:id", async (req, res) => {
  try {
    const bookingId = req.params.id;
    const token = req.query.token;

    if (!bookingId || !token) {
      return res.status(400).send("<h1>Invalid Request</h1><p>Missing booking ID or token.</p>");
    }

    const bookingRef = db.collection("bookings").doc(bookingId);
    const bookingDoc = await bookingRef.get();

    if (!bookingDoc.exists) {
      return res.status(404).send("<h1>Not Found</h1><p>Booking not found.</p>");
    }

    const booking = bookingDoc.data();

    // Check token
    if (booking.confirmationToken !== token) {
      return res.status(403).send("<h1>Forbidden</h1><p>Invalid confirmation token.</p>");
    }

    // Ensure it's still pending
    if (booking.status !== "pending" && booking.status !== "Pending") {
      return res.status(400).send(`<h1>Already Processed</h1><p>This booking is currently marked as ${booking.status}.</p>`);
    }

    // Set time to exactly 5 minutes from now
    const now = new Date();
    const meetTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 mins
    
    const yyyy = meetTime.getFullYear();
    const mm = String(meetTime.getMonth() + 1).padStart(2, '0');
    const dd = String(meetTime.getDate()).padStart(2, '0');
    const scheduledDate = `${yyyy}-${mm}-${dd}`;
    
    let hours = meetTime.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    const minutes = String(meetTime.getMinutes()).padStart(2, '0');
    const scheduledTime = `${hours}:${minutes} ${ampm}`;

    const dummyMeetUrl = "https://meet.google.com/abc-defg-hij";

    await bookingRef.update({
      status: "Confirmed",
      scheduledDate,
      scheduledTime,
      meetingUrl: dummyMeetUrl,
      confirmedAt: FieldValue.serverTimestamp()
    });

    // Send customer confirmation email
    const customerMail = {
      from:    process.env.EMAIL_USER,
      to:      booking.email,
      subject: `Your ARCA Consultation is Confirmed — ${bookingId}`,
      attachments: [{
        filename: 'logo.png',
        path: path.join(__dirname, '../client/public/logo.png'),
        cid: 'arcalogo'
      }],
      html: buildCustomerConfirmedEmail({
        name: booking.name,
        bookingId,
        consultationType: booking.consultationType,
        scheduledDate,
        scheduledTime,
        meetingUrl: dummyMeetUrl
      }),
    };

    try {
      console.log(`[CUSTOMER CONFIRMED EMAIL] Sending to ${booking.email}...`);
      await transporter.sendMail(customerMail);
      console.log("[CUSTOMER CONFIRMED EMAIL] Successfully sent.");
    } catch (err) {
      console.error("[CUSTOMER CONFIRMED EMAIL] Failed to send:", err.message || err);
    }

    // Simple success response page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Booking Confirmed</title>
        <style>
          body { font-family: Arial, sans-serif; background: #f9f9f9; padding: 40px; text-align: center; }
          .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); max-width: 500px; margin: 0 auto; }
          h1 { color: #470606; margin-top: 0; }
          p { color: #555; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Booking Confirmed</h1>
          <p>The consultation request for <strong>${booking.name}</strong> has been confirmed.</p>
          <p>A confirmation email with the Google Meet link has been sent to the customer.</p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("Error confirming booking:", error);
    res.status(500).send("<h1>Server Error</h1><p>An error occurred while confirming the booking.</p>");
  }
});



/* ──────────────────────────────────────────────────────────────────
   ADMIN: CONFIRM BOOKING
   ────────────────────────────────────────────────────────────────── */
app.post("/admin/confirm-booking", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing or invalid authorization header" });
    }
    const idToken = authHeader.split("Bearer ")[1];
    
    let decodedToken;
    try {
      decodedToken = await getAuth().verifyIdToken(idToken);
    } catch (err) {
      return res.status(401).json({ message: "Invalid token" });
    }
    
    const uid = decodedToken.uid;
    const userDoc = await db.collection("users").doc(uid).get();
    
    if (!userDoc.exists || userDoc.data().role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    
    const { bookingId, scheduledDate, scheduledTime, assignedDesigner } = req.body;
    
    if (!bookingId || !scheduledDate || !scheduledTime || !assignedDesigner) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    
    const bookingRef = db.collection("bookings").doc(bookingId);
    const bookingDoc = await bookingRef.get();
    
    if (!bookingDoc.exists) {
      return res.status(404).json({ message: "Booking not found" });
    }
    
    const booking = bookingDoc.data();
    
    if (booking.status === "completed" || booking.status === "cancelled") {
      return res.status(400).json({ message: `Cannot confirm a ${booking.status} booking.` });
    }
    
    const timeRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i;
    const match = scheduledTime.match(timeRegex);
    if (!match) {
      return res.status(400).json({ message: "Invalid time format. Use HH:MM AM/PM or HH:MM" });
    }
    
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const ampm = match[3];
    
    if (ampm) {
      if (ampm.toUpperCase() === "PM" && hours < 12) hours += 12;
      if (ampm.toUpperCase() === "AM" && hours === 12) hours = 0;
    }
    
    const scheduleDateObj = new Date(`${scheduledDate}T00:00:00`);
    scheduleDateObj.setHours(hours, minutes, 0, 0);
    
    if (isNaN(scheduleDateObj.getTime())) {
      return res.status(400).json({ message: "Invalid date or time." });
    }
    
    if (scheduleDateObj.getTime() - Date.now() < 60 * 60 * 1000) {
      return res.status(400).json({ message: "Scheduled time must be at least 1 hour in the future." });
    }
    
    await bookingRef.update({
      status: "confirmed",
      scheduledDate,
      scheduledTime,
      designerName: assignedDesigner,
      confirmedAt: FieldValue.serverTimestamp(),
      confirmedBy: uid
    });
    
    const emailData = {
      name: booking.name,
      bookingId: bookingId,
      scheduledDateDisplay: scheduleDateObj.toLocaleDateString("en-IN", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
      }),
      scheduledTime,
      designerName: assignedDesigner,
      meetingUrl: "",
      consultationType: booking.consultationType
    };
    
    const userMail = {
      from: process.env.EMAIL_USER,
      to: booking.email,
      subject: `Your ARCA Interior Design Consultation is Confirmed — ${bookingId}`,
      html: buildUserEmail(emailData)
    };
    
    try {
      await transporter.sendMail(userMail);
    } catch(err) {
      console.error("Failed to send confirmation email:", err);
    }
    
    return res.status(200).json({
      success: true,
      bookingId,
      status: "confirmed",
      scheduledDate,
      scheduledTime,
      assignedDesigner
    });
    
  } catch (error) {
    console.error("Confirm booking error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/* ──────────────────────────────────────────────────────────────────
   CUSTOMER ACTIONS
   ────────────────────────────────────────────────────────────────── */

app.post("/complete-booking", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await getAuth().verifyIdToken(token);
    } catch (e) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const uid = decodedToken.uid;
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ message: "bookingId is required" });
    }

    // Since the booking belongs to the user, we verify ownership later
    const bookingRef = db.collection("bookings").doc(bookingId);
    const bookingDoc = await bookingRef.get();

    if (!bookingDoc.exists) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const booking = bookingDoc.data();

    // Verify ownership
    if (booking.userId !== uid) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Must be confirmed or rescheduled to be marked completed
    if (booking.status !== "Confirmed" && booking.status !== "Rescheduled") {
      return res.status(400).json({ message: "Booking must be confirmed before it can be completed." });
    }

    // Check if the scheduled time has passed
    if (booking.scheduledDate && booking.scheduledTime) {
      const parseTime = (timeStr) => {
        if (!timeStr) return { hours: 10, minutes: 0 };
        const [timePart, ampm] = timeStr.split(" ");
        let [hours, minutes]   = timePart.split(":").map(Number);
        if (ampm === "PM" && hours !== 12) hours += 12;
        if (ampm === "AM" && hours === 12) hours = 0;
        return { hours, minutes };
      };

      const [y, m, d] = booking.scheduledDate.split("-").map(Number);
      const { hours, minutes } = parseTime(booking.scheduledTime);
      const meetingTime = new Date(y, m - 1, d, hours, minutes, 0).getTime();
      
      // Allow completing up to 10 minutes early to match the frontend join window
      if (Date.now() < meetingTime - 10 * 60 * 1000) {
        return res.status(400).json({ message: "Cannot complete booking before the scheduled meeting time." });
      }
    } else {
      return res.status(400).json({ message: "Booking does not have a scheduled time." });
    }

    await bookingRef.update({
      status: "Completed",
      completedAt: FieldValue.serverTimestamp()
    });

    res.status(200).json({ message: "Booking marked as completed." });
  } catch (error) {
    console.error("Error completing booking:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/* ──────────────────────────────────────────────────────────────────
   START SERVER
   ────────────────────────────────────────────────────────────────── */
app.listen(5000, () => {
  console.log("ARCA Server running on port 5000");
});
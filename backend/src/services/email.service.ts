import nodemailer, { Transporter } from 'nodemailer';

const HOST = process.env.SMTP_HOST || '';
const PORT = Number(process.env.SMTP_PORT || 587);
const USER = process.env.SMTP_USER || '';
const PASS = process.env.SMTP_PASS || '';
const FROM = process.env.SMTP_FROM || USER;
const TO = process.env.NOTIFY_EMAIL || '';

let transporter: Transporter | null = null;

if (HOST && USER && PASS && TO) {
  transporter = nodemailer.createTransport({
    host: HOST,
    port: PORT,
    // Port 465 is implicit TLS; 587 upgrades via STARTTLS after connecting.
    secure: PORT === 465,
    auth: { user: USER, pass: PASS },
  });
} else {
  console.log('[Email] SMTP not fully configured — email notifications disabled.');
}

export function isEmailConfigured(): boolean {
  return transporter !== null;
}

export async function sendEmail(subject: string, text: string): Promise<void> {
  if (!transporter) return;

  try {
    await transporter.sendMail({ from: FROM, to: TO, subject, text });
    console.log(`[Email] Sent: ${subject}`);
  } catch (error) {
    console.error('[Email] Failed to send:', error);
  }
}

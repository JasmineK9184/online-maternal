import dns from "node:dns";
import nodemailer from "nodemailer";

/** Prefer A records over AAAA so SMTP does not hit broken/blocked IPv6 paths (common on Windows / some ISPs). */
dns.setDefaultResultOrder("ipv4first");

function mustEnv(name: string, value: string | undefined) {
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

/** Default true. Set GMAIL_TLS_REJECT_UNAUTHORIZED=0 only when antivirus/proxy MITM causes "self-signed certificate in certificate chain". Never on public production without fixing the root CA. */
function tlsRejectUnauthorized(): boolean {
  const v = process.env.GMAIL_TLS_REJECT_UNAUTHORIZED?.trim().toLowerCase();
  if (v === "0" || v === "false" || v === "no") return false;
  return true;
}

/**
 * Nodemailer transport for Gmail using an app password (2FA).
 *
 * Uses explicit host + `family: 4` to avoid ECONNREFUSED to Gmail’s IPv6 (e.g. 2404:6800:…:465).
 * If 465 is blocked on your network, set `GMAIL_SMTP_PORT=587` in `.env` (STARTTLS).
 */
export function createMailTransporter() {
  const user = mustEnv("GMAIL_USER", process.env.GMAIL_USER);
  // Google shows app passwords as "xxxx xxxx xxxx xxxx" — SMTP expects 16 chars, no spaces.
  const pass = mustEnv("GMAIL_APP_PASSWORD", process.env.GMAIL_APP_PASSWORD).replace(/\s+/g, "");
  const portRaw = process.env.GMAIL_SMTP_PORT?.trim() || "465";
  const port = parseInt(portRaw, 10);
  const useStarttls = port === 587;

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: useStarttls ? 587 : 465,
    secure: !useStarttls,
    requireTLS: useStarttls,
    auth: { user, pass },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 40_000,
    tls: {
      rejectUnauthorized: tlsRejectUnauthorized(),
    },
    // @ts-expect-error Nodemailer passes this through to Node net/tls (prefer IPv4)
    family: 4,
  });
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const from = mustEnv("GMAIL_USER", process.env.GMAIL_USER);
  const transporter = createMailTransporter();
  await transporter.sendMail({
    from: `"MaternalCare" <${from}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    ...(opts.html ? { html: opts.html } : {}),
  });
}

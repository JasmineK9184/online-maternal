import { google } from "googleapis";

/** Send email as the authenticated Google user (requires gmail.send scope). */
export async function sendEmailAsUser(opts: {
  refreshToken: string;
  to: string;
  subject: string;
  bodyText: string;
}): Promise<void> {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
  );
  oauth2.setCredentials({ refresh_token: opts.refreshToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2 });
  const lines = [
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    opts.bodyText,
  ];
  const raw = Buffer.from(lines.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });
}

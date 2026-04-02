type SendEmailJSArgs = {
  toEmail: string;
  templateId: string;
  templateParams: Record<string, string>;
};

function mustEnv(name: string, value: string | undefined) {
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

/**
 * Minimal EmailJS sender using their REST API.
 *
 * Docs (send): https://www.emailjs.com/docs/sdk/send-email/
 */
export async function sendEmailJS({
  toEmail,
  templateId,
  templateParams,
}: SendEmailJSArgs) {
  const serviceId = mustEnv("EMAILJS_SERVICE_ID", process.env.EMAILJS_SERVICE_ID);
  const userId = mustEnv("EMAILJS_PUBLIC_KEY", process.env.EMAILJS_PUBLIC_KEY);

  const endpoint = "https://api.emailjs.com/api/v1.0/email/send";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: userId,
      template_params: {
        to_email: toEmail,
        ...templateParams,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`EmailJS send failed (${res.status}): ${text}`);
  }
}


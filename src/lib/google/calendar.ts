import { google } from "googleapis";

export type CreateEventInput = {
  refreshToken: string;
  summary: string;
  description?: string;
  startIso: string;
  endIso: string;
  /** Patient Gmail — receives invite + Calendar reminder emails */
  patientEmail: string;
  /** Clinic / provider Gmail — receives the same event (optional) */
  clinicEmail?: string | null;
  telehealth: boolean;
};

export async function createCalendarEventWithMeet(
  input: CreateEventInput
): Promise<{ eventId: string; meetLink?: string }> {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
  );
  oauth2.setCredentials({ refresh_token: input.refreshToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2 });

  const attendees: { email: string }[] = [{ email: input.patientEmail }];
  const clinic = input.clinicEmail?.trim();
  if (
    clinic &&
    clinic.toLowerCase() !== input.patientEmail.toLowerCase()
  ) {
    attendees.push({ email: clinic });
  }

  const event: Record<string, unknown> = {
    summary: input.summary,
    description: input.description,
    start: { dateTime: input.startIso, timeZone: "UTC" },
    end: { dateTime: input.endIso, timeZone: "UTC" },
    attendees,
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 24 * 60 },
        { method: "popup", minutes: 60 },
      ],
    },
  };

  if (input.telehealth) {
    event.conferenceData = {
      createRequest: { requestId: `maternal-${Date.now()}`, conferenceSolutionKey: { type: "hangoutsMeet" } },
    };
  }

  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: event as never,
    conferenceDataVersion: input.telehealth ? 1 : 0,
    sendUpdates: "all",
  });

  const meetLink =
    res.data.hangoutLink ||
    res.data.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri;

  return { eventId: res.data.id ?? "", meetLink: meetLink ?? undefined };
}

export async function deleteCalendarEvent(
  refreshToken: string,
  eventId: string
): Promise<void> {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
  );
  oauth2.setCredentials({ refresh_token: refreshToken });
  const calendar = google.calendar({ version: "v3", auth: oauth2 });
  await calendar.events.delete({ calendarId: "primary", eventId, sendUpdates: "all" });
}

/**
 * Legacy entry — prefer `@/lib/mail` for new code.
 * @deprecated Use `sendMail` / `createMailTransporter` from `@/lib/mail`.
 */
export {
  createMailTransporter as createGmailTransporter,
  sendMail as sendGmailAppPasswordEmail,
} from "@/lib/mail";

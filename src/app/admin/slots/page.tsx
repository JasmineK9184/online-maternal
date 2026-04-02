import { redirect } from "next/navigation";

/** @deprecated Use `/dashboard/availability` */
export default function AdminSlotsRedirectPage() {
  redirect("/dashboard/availability");
}

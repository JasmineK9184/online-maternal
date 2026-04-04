"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

/** Shows Sonner toast when `?saved=1` is present, then clears the query. */
export function HealthProfileSavedToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    if (searchParams.get("saved") !== "1") return;
    handled.current = true;
    toast.success("Profile updated successfully");
    router.replace("/dashboard/health-profile", { scroll: false });
  }, [searchParams, router]);

  return null;
}

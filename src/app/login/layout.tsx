import { Suspense } from "react";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen bg-[#FBF9F6]" aria-hidden />}>{children}</Suspense>;
}

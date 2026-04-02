"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  Settings,
  UserCircle,
  X,
} from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

const SIDEBAR_BG = "#FBF9F6";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  match: "exact" | "prefix";
};

const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, match: "exact" },
  {
    href: "/dashboard/appointments",
    label: "Appointments",
    icon: CalendarDays,
    match: "prefix",
  },
  {
    href: "/dashboard/health-profile",
    label: "Health Profile",
    icon: UserCircle,
    match: "prefix",
  },
];

function navActive(pathname: string, item: NavItem) {
  if (item.match === "exact") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

type Props = {
  children: React.ReactNode;
  isAdmin: boolean | null;
};

export function DashboardShell({ children, isAdmin }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function NavLink({ item }: { item: NavItem }) {
    const Icon = item.icon;
    const active = navActive(pathname, item);
    return (
      <Link
        href={item.href}
        onClick={() => setOpen(false)}
        className={cn(
          "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
          active
            ? "bg-teal-50 text-teal-700 shadow-sm"
            : "text-muted-foreground hover:bg-black/[0.03] hover:text-foreground"
        )}
      >
        <Icon className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
        {item.label}
      </Link>
    );
  }

  const sidebarInner = (
    <>
      <div className="px-5 pt-8 pb-6">
        <Link
          href="/"
          className="block font-serif text-xl font-semibold tracking-tight text-foreground"
          onClick={() => setOpen(false)}
        >
          MaternalCare
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">Sync</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Main">
        {mainNav
          .filter((item) => {
            // Admins get a lighter sidebar (no health-profile link).
            if (isAdmin === true && item.href === "/dashboard/health-profile") {
              return false;
            }
            return true;
          })
          .map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        {isAdmin && (
          <Link
            href="/dashboard/availability"
            onClick={() => setOpen(false)}
            className={cn(
              "mt-2 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
              pathname.startsWith("/dashboard/availability")
                ? "bg-teal-50 text-teal-700 shadow-sm"
                : "text-muted-foreground hover:bg-black/[0.03] hover:text-foreground"
            )}
          >
            <Settings2 className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
            Availability
          </Link>
        )}
      </nav>

      <div className="mt-auto border-t border-border/30 px-3 py-5">
        <Link
          href="/dashboard/profile-settings"
          onClick={() => setOpen(false)}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-black/[0.03] hover:text-foreground"
        >
          <Settings className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
          Profile Settings
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-5 w-5 shrink-0" aria-hidden />
            Sign out
          </button>
        </form>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream via-background to-eucalyptus-muted/25">
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/25 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-border/40 shadow-sm transition-transform duration-200 ease-out",
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{ backgroundColor: SIDEBAR_BG }}
      >
        <div className="flex items-center justify-end border-b border-border/30 px-3 py-3 lg:hidden">
          <button
            type="button"
            className="rounded-2xl p-2 text-muted-foreground hover:bg-black/[0.04]"
            aria-label="Close sidebar"
            onClick={() => setOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {sidebarInner}
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-64">
        <header
          className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border/40 px-4 lg:hidden"
          style={{ backgroundColor: SIDEBAR_BG }}
        >
          <button
            type="button"
            className="rounded-2xl p-2 text-foreground hover:bg-black/[0.04]"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-serif text-lg font-semibold text-foreground">
            MaternalCare
          </span>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl px-4 py-8 pb-16 sm:px-6 lg:px-8 lg:py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

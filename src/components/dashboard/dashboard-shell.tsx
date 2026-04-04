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
  Users,
  X,
} from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

const SIDEBAR_BG = "#FBF9F6";
const ICON = { strokeWidth: 1.5 as const };

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
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

  const adminAppointmentsWide =
    isAdmin === true &&
    (pathname === "/dashboard/appointments" ||
      pathname.startsWith("/dashboard/appointments/"));

  const navItemsForRole: NavItem[] =
    isAdmin === true
      ? mainNav
      : mainNav
          .filter((item) => item.href === "/dashboard")
          .map((item) =>
            item.href === "/dashboard" ? { ...item, label: "Your Journey" } : item
          )
          .concat(mainNav.filter((item) => item.href !== "/dashboard"));

  function NavLink({ item }: { item: NavItem }) {
    const Icon = item.icon;
    const active = navActive(pathname, item);
    return (
      <Link
        href={item.href}
        onClick={() => setOpen(false)}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
          active
            ? "bg-teal-50 text-teal-800 shadow-sm"
            : "text-muted-foreground hover:bg-black/[0.03] hover:text-foreground"
        )}
      >
        <Icon className="h-5 w-5 shrink-0 opacity-90" {...ICON} aria-hidden />
        {item.label}
      </Link>
    );
  }

  const sidebarInner = (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="px-6 pt-10 pb-6">
        <Link
          href="/"
          className="block font-serif text-xl font-semibold tracking-tight text-foreground"
          onClick={() => setOpen(false)}
        >
          MaternalCare
        </Link>
        <p className="mt-1 text-xs font-medium text-muted-foreground">Sync</p>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-4 pb-4" aria-label="Main">
        {navItemsForRole
          .filter((item) => {
            if (isAdmin === true && item.href === "/dashboard/health-profile") {
              return false;
            }
            return true;
          })
          .map((item) => (
            <NavLink key={`${item.href}-${item.label}`} item={item} />
          ))}
        {isAdmin && (
          <>
            <Link
              href="/dashboard/users"
              onClick={() => setOpen(false)}
              aria-current={pathname.startsWith("/dashboard/users") ? "page" : undefined}
              className={cn(
                "mt-1 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                pathname.startsWith("/dashboard/users")
                  ? "bg-teal-50 text-teal-800 shadow-sm"
                  : "text-muted-foreground hover:bg-black/[0.03] hover:text-foreground"
              )}
            >
              <Users className="h-5 w-5 shrink-0 opacity-90" {...ICON} aria-hidden />
              Users
            </Link>
            <Link
              href="/dashboard/availability"
              onClick={() => setOpen(false)}
              aria-current={pathname.startsWith("/dashboard/availability") ? "page" : undefined}
              className={cn(
                "mt-1 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                pathname.startsWith("/dashboard/availability")
                  ? "bg-teal-50 text-teal-800 shadow-sm"
                  : "text-muted-foreground hover:bg-black/[0.03] hover:text-foreground"
              )}
            >
              <Settings2 className="h-5 w-5 shrink-0 opacity-90" {...ICON} aria-hidden />
              Availability
            </Link>
          </>
        )}
      </nav>

      <div className="mt-auto border-t border-gray-200/80 px-4 py-5">
        <Link
          href="/dashboard/profile-settings"
          onClick={() => setOpen(false)}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-black/[0.03] hover:text-foreground"
        >
          <Settings className="h-5 w-5 shrink-0 opacity-90" {...ICON} aria-hidden />
          Profile Settings
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-5 w-5 shrink-0" {...ICON} aria-hidden />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas">
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
          "fixed left-0 top-0 z-50 flex h-screen w-72 flex-col overflow-hidden rounded-r-3xl border border-gray-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-transform duration-200 ease-out",
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{ backgroundColor: SIDEBAR_BG }}
      >
        <div className="flex items-center justify-end border-b border-gray-200/60 px-3 py-3 lg:hidden">
          <button
            type="button"
            className="rounded-2xl p-2 text-muted-foreground hover:bg-black/[0.04]"
            aria-label="Close sidebar"
            onClick={() => setOpen(false)}
          >
            <X className="h-5 w-5" {...ICON} />
          </button>
        </div>
        {sidebarInner}
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-72">
        <header
          className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-gray-100 px-4 lg:hidden"
          style={{ backgroundColor: SIDEBAR_BG }}
        >
          <button
            type="button"
            className="rounded-2xl p-2 text-foreground hover:bg-black/[0.04]"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" {...ICON} />
          </button>
          <span className="font-serif text-lg font-semibold text-foreground">MaternalCare</span>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div
            className={cn(
              "mx-auto w-full px-4 py-8 pb-16 sm:px-6 lg:px-8 lg:py-10",
              adminAppointmentsWide ? "max-w-none" : "max-w-6xl"
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

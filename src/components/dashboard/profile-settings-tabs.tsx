"use client";

import type { ReactNode } from "react";
import {
  AdminArchivedAppointmentsTable,
  type ArchivedAppointmentRow,
} from "@/components/dashboard/admin-archived-appointments-table";
import { ArchivedUsersTable, type ArchivedUserRow } from "@/components/dashboard/archived-users-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ProfileSettingsTabs({
  isAdmin,
  children,
  archivedRows,
  archivedAppointmentRows,
}: {
  isAdmin: boolean;
  children: ReactNode;
  archivedRows: ArchivedUserRow[];
  archivedAppointmentRows: ArchivedAppointmentRow[];
}) {
  if (!isAdmin) return <>{children}</>;

  return (
    <Tabs defaultValue="account" className="space-y-6">
      <TabsList className="h-auto flex-wrap rounded-xl bg-muted/60 p-1">
        <TabsTrigger value="account" className="rounded-lg px-4 py-2">
          Account
        </TabsTrigger>
        <TabsTrigger value="archive" className="rounded-lg px-4 py-2">
          Archived users
        </TabsTrigger>
        <TabsTrigger value="archived-appointments" className="rounded-lg px-4 py-2">
          Archived appointments
        </TabsTrigger>
      </TabsList>
      <TabsContent value="account" className="mt-0 space-y-8 focus-visible:outline-none">
        {children}
      </TabsContent>
      <TabsContent value="archive" className="mt-0 focus-visible:outline-none">
        <div className="rounded-2xl border border-border/40 bg-card p-6 shadow-card">
          <h2 className="font-serif text-xl font-semibold text-foreground">Archived users</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Restore to let them sign in again. Accounts are not permanently deleted from here.
          </p>
          <div className="mt-6">
            <ArchivedUsersTable rows={archivedRows} isAdmin={isAdmin} />
          </div>
        </div>
      </TabsContent>
      <TabsContent value="archived-appointments" className="mt-0 focus-visible:outline-none">
        <div className="rounded-2xl border border-border/40 bg-card p-6 shadow-card">
          <h2 className="font-serif text-xl font-semibold text-foreground">Archived appointments</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Visits hidden from Manage Appointments and patient dashboards. Restore to bring them back to
            active lists.
          </p>
          <div className="mt-6">
            <AdminArchivedAppointmentsTable rows={archivedAppointmentRows} />
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}

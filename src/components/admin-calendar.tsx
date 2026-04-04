import { approveAppointment } from "@/app/actions/admin-appointments";

type Row = {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  appointment_type: string;
  patient_id: string;
};

export function AdminCalendar({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-primary/20 bg-card">
      <table className="w-full text-left text-sm">
        <thead className="bg-secondary/80">
          <tr>
            <th className="p-3 font-medium">Start</th>
            <th className="p-3 font-medium">End</th>
            <th className="p-3 font-medium">Type</th>
            <th className="p-3 font-medium">Status</th>
            <th className="p-3 font-medium">Patient</th>
            <th className="p-3 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="p-6 text-center text-muted-foreground">
                No bookings yet.
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border/60">
              <td className="p-3 whitespace-nowrap">
                {new Date(r.start_time).toLocaleString()}
              </td>
              <td className="p-3 whitespace-nowrap">
                {new Date(r.end_time).toLocaleString()}
              </td>
              <td className="p-3">{r.appointment_type}</td>
              <td className="p-3">{r.status}</td>
              <td className="p-3 font-mono text-xs">{r.patient_id.slice(0, 8)}…</td>
              <td className="p-3">
                {r.status === "pending" ? (
                  <form action={approveAppointment} method="post">
                    <input type="hidden" name="appointmentId" value={r.id} />
                    <button
                      type="submit"
                      className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 hover:bg-teal-100"
                    >
                      Approve
                    </button>
                  </form>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

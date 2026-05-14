import { redirect } from "next/navigation";

export default function RtDashboardRedirect() {
  redirect("/dashboard/rt/overview");
}

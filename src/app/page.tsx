import { redirect } from "next/navigation";

export default function RootPage() {
  // The tactics briefing coach is the live product and needs no backend, so it
  // is the landing page. The Supabase-backed trim log lives under /races.
  redirect("/briefing");
}

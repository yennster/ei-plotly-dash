import { Dashboard } from "@/components/dashboard";

// The dashboard is fully client-driven (URL params, Edge Impulse session, Plotly
// runtime), so the page is just a thin host for the client root.
export default function Page() {
  return <Dashboard />;
}

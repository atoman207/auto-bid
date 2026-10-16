import { SiteHeader } from "@/components/brand";
import { NotFoundView } from "@/components/status-views";

/** Unknown URLs (outside the site layout, so the header is added here). */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <NotFoundView />
    </>
  );
}

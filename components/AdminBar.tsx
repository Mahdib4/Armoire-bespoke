"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Floating bar shown on the live site when an admin is logged in, bridging the
// public view to the matching editor in the dashboard.
export default function AdminBar() {
  const pathname = usePathname();
  let editHref: string | null = null;
  let editLabel = "";

  const pm = pathname.match(/^\/p\/([^/]+)/);
  const cm = pathname.match(/^\/c\/([^/]+)/);
  if (pm) {
    editHref = `/admin/products/by-slug/${pm[1]}`;
    editLabel = "Edit this product";
  } else if (cm) {
    editHref = `/admin/categories`;
    editLabel = "Edit collection";
  } else if (pathname === "/") {
    editHref = `/admin/sections`;
    editLabel = "Edit homepage";
  }

  return (
    <div className="adminbar">
      <span className="adminbar-dot" /> Admin mode
      {editHref && (
        <Link href={editHref} className="adminbar-link">
          {editLabel}
        </Link>
      )}
      <Link href="/admin" className="adminbar-link">
        Dashboard
      </Link>
    </div>
  );
}

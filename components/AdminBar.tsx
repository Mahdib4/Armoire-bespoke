"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Floating bar shown on the live site when an admin is logged in. It self-checks
// the session via /api/admin/session so the public pages don't read cookies
// server-side (which would make them uncacheable).
export default function AdminBar() {
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/session", { cache: "no-store" })
      .then((r) => (r.ok ? setAuthed(true) : null))
      .catch(() => {})
      .finally(() => void alive);
    return () => {
      alive = false;
    };
  }, []);

  if (!authed) return null;

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

"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories & Banners" },
  { href: "/admin/sections", label: "Sections" },
  { href: "/admin/quotes", label: "Quotes" },
  { href: "/admin/settings", label: "Site Settings" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/enquiries", label: "Enquiries", badgeKey: "enquiries" },
  { href: "/admin/media", label: "Media Library" },
];

export default function AdminSidebar({ email, unread = 0 }: { email: string; unread?: number }) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <aside className="adm-side">
      <div className="adm-brand">
        <span className="font-display">ARMOIRE</span>
        <em>Atelier Admin</em>
      </div>
      <nav className="adm-nav">
        {NAV.map((n) => {
          const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href} className={active ? "active" : ""}>
              {n.label}
              {n.badgeKey === "enquiries" && unread > 0 && <em className="adm-nav-badge">{unread}</em>}
            </Link>
          );
        })}
      </nav>
      <div className="adm-side-foot">
        <Link href="/" target="_blank" className="adm-viewsite">
          ↗ View live site
        </Link>
        <div className="adm-user">{email}</div>
        <button onClick={logout} className="adm-logout">
          Sign out
        </button>
      </div>
    </aside>
  );
}

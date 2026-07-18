"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import PushToggle from "./PushToggle";
import BrandLockup from "../BrandLockup";

const NAV = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories & Banners" },
  { href: "/admin/sections", label: "Sections" },
  { href: "/admin/reviews", label: "Customer's Words" },
  { href: "/admin/quotes", label: "Quotes" },
  { href: "/admin/settings", label: "Site Settings" },
  { href: "/admin/orders", label: "Orders", badgeKey: "orders" },
  { href: "/admin/enquiries", label: "Enquiries", badgeKey: "enquiries" },
  { href: "/admin/media", label: "Media Library" },
];

export default function AdminSidebar({
  email,
  unread = 0,
  pendingOrders = 0,
  logo = "/media/brand/logo-dark.png",
  slogan = "Tailored to Define You",
  brand = "Armoire Bespoke",
}: {
  email: string;
  unread?: number;
  pendingOrders?: number;
  logo?: string;
  slogan?: string;
  brand?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  const badgeFor = (key?: string) =>
    key === "enquiries" ? unread : key === "orders" ? pendingOrders : 0;

  return (
    <aside className="adm-side">
      <Link href="/admin" className="adm-brand">
        <BrandLockup logo={logo} brand={brand} slogan={slogan} logoClassName="adm-brand-logo" sloganClassName="adm-brand-tagline" />
        <em>Atelier Admin</em>
      </Link>
      <nav className="adm-nav">
        {NAV.map((n) => {
          const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
          const badge = badgeFor(n.badgeKey);
          return (
            <Link key={n.href} href={n.href} className={active ? "active" : ""}>
              {n.label}
              {badge > 0 && <em className="adm-nav-badge">{badge}</em>}
            </Link>
          );
        })}
      </nav>
      <div className="adm-side-foot">
        <PushToggle />
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

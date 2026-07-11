import { getSessionUser } from "@/lib/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";
import "./admin.css";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  // Not authenticated → bare shell (the login page renders here).
  if (!user) {
    return <div className="adm-bare">{children}</div>;
  }

  return (
    <div className="adm-root">
      <AdminSidebar email={user.email} />
      <div className="adm-main">{children}</div>
    </div>
  );
}

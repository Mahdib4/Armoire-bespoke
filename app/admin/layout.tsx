import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  const [unread, pendingOrders] = await Promise.all([
    prisma.enquiry.count({ where: { read: false } }).catch(() => 0),
    prisma.order.count({ where: { status: "PENDING" } }).catch(() => 0),
  ]);

  return (
    <div className="adm-root">
      <AdminSidebar email={user.email} unread={unread} pendingOrders={pendingOrders} />
      <div className="adm-main">{children}</div>
    </div>
  );
}

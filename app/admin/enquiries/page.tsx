import { prisma } from "@/lib/prisma";
import EnquiriesManager from "@/components/admin/EnquiriesManager";

export const dynamic = "force-dynamic";

export default async function AdminEnquiries() {
  const enquiries = await prisma.enquiry.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  const unread = enquiries.filter((e) => !e.read).length;
  return (
    <div>
      <div className="adm-head">
        <div>
          <h1>Enquiries</h1>
          <p>{enquiries.length} enquiries{unread ? ` · ${unread} unread` : ""}. Contact &amp; appointment requests from the website.</p>
        </div>
      </div>
      <EnquiriesManager
        enquiries={enquiries.map((e) => ({
          id: e.id,
          name: e.name,
          phone: e.phone,
          email: e.email,
          subject: e.subject,
          message: e.message,
          type: e.type,
          appointment: e.appointment,
          read: e.read,
          createdAt: e.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}

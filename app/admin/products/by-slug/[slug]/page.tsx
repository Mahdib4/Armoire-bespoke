import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Resolves a public product slug to its admin editor (used by the live-site Admin bar).
export default async function BySlug({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
  if (!product) notFound();
  redirect(`/admin/products/${product.id}`);
}

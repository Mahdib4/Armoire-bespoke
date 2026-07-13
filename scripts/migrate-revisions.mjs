// Targeted, idempotent migration for the client revision round. Does NOT wipe
// data or touch image URLs. Run: node --env-file=.env scripts/migrate-revisions.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Nicer names for existing groups + the new ones.
const GROUP_NAMES = {
  fabric: "Fabric Selection",
  lapel: "Lapel Style",
  collar: "Collar Style",
  cuff: "Cuff Style",
  pocket: "Pocket Style",
  vent: "Vent Style",
};
const NEW_GROUPS = [
  { kind: "pleat", name: "Pleat Style", order: 6, choices: ["Flat Front", "Single Pleat", "Double Pleat"] },
  { kind: "waistband", name: "Waistband Style", order: 7, choices: ["Standard", "Extended Tab", "Side Adjusters"] },
  { kind: "fit", name: "Fit", order: 8, choices: ["Slim", "Tailored", "Classic"] },
  { kind: "style", name: "Style", order: 9, choices: ["Classic", "Contemporary", "Regal"] },
];

// Tailor-Made customization options per category (in display order).
const CAT_KINDS = {
  blazer: ["fabric", "lapel", "cuff", "pocket", "vent"],
  shirt: ["fabric", "collar", "cuff", "pocket"],
  trouser: ["fabric", "pleat", "waistband", "fit"],
  kurta: ["fabric", "style"],
  jacket: ["fabric", "style"],
};
const CHARGE = { blazer: 4000, jacket: 3000, shirt: 1500, trouser: 1500, kurta: 2000 };
const DEFAULT_COLORS = ["Black", "Navy", "Charcoal", "Off-White"];
const DEFAULT_SIZES = ["38", "40", "42", "44", "46"].map((label) => ({ label, stock: 5 }));

const SETTINGS = {
  slogan: "Tailored to Define You",
  facebook: "https://www.facebook.com/profile.php?id=61583944840199",
  instagram: "https://www.instagram.com/armoirebespoke",
  homeServiceMsg:
    "We provide home service for all our clients. On special request, we also welcome clients to our office, strictly by appointment only.",
  tailoringNote: "Final price may vary depending on the selected fabric and customization options.",
};

async function main() {
  // 1. Rename existing groups + create the new ones (idempotent).
  for (const [kind, name] of Object.entries(GROUP_NAMES)) {
    await prisma.customizationGroup.updateMany({ where: { kind }, data: { name } });
  }
  for (const g of NEW_GROUPS) {
    const existing = await prisma.customizationGroup.findUnique({ where: { kind: g.kind } });
    if (!existing) {
      await prisma.customizationGroup.create({
        data: {
          kind: g.kind,
          name: g.name,
          order: g.order,
          choices: { create: g.choices.map((label, i) => ({ label, order: i })) },
        },
      });
    } else {
      await prisma.customizationGroup.update({ where: { kind: g.kind }, data: { name: g.name } });
    }
  }

  const groups = await prisma.customizationGroup.findMany();
  const idByKind = Object.fromEntries(groups.map((g) => [g.kind, g.id]));

  // 2. Re-map each product's customizations per its category + set defaults.
  const cats = await prisma.category.findMany({ include: { products: true } });
  let remapped = 0;
  for (const cat of cats) {
    const kinds = CAT_KINDS[cat.slug];
    if (!kinds) continue;
    for (const p of cat.products) {
      // customizations
      await prisma.productCustomization.deleteMany({ where: { productId: p.id } });
      await prisma.productCustomization.createMany({
        data: kinds
          .map((k, i) => ({ productId: p.id, groupId: idByKind[k], order: i }))
          .filter((r) => r.groupId),
      });
      // defaults for pricing + ready-made options (only fill if empty)
      await prisma.product.update({
        where: { id: p.id },
        data: {
          tailoringCharge: p.tailoringCharge || CHARGE[cat.slug] || 2000,
          colors: p.colors || JSON.stringify(DEFAULT_COLORS),
          sizeOptions: p.sizeOptions || JSON.stringify(DEFAULT_SIZES),
        },
      });
      // featured image = first by order
      const imgs = await prisma.productImage.findMany({
        where: { productId: p.id },
        orderBy: { order: "asc" },
      });
      if (imgs.length) {
        await prisma.productImage.updateMany({ where: { productId: p.id }, data: { featured: false } });
        await prisma.productImage.update({ where: { id: imgs[0].id }, data: { featured: true } });
      }
      remapped++;
    }
  }

  // 3. Site settings (social + messages).
  for (const [key, value] of Object.entries(SETTINGS)) {
    await prisma.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }

  console.log(`Migration done: ${NEW_GROUPS.length} new groups, ${remapped} products remapped, settings updated.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

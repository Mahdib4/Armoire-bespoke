// One-off, IDEMPOTENT content updates for the client revision round.
// Safe to re-run: it updates/upserts specific rows only — it never wipes tables
// (unlike prisma/seed.ts). Run: node --env-file=.env scripts/apply-content-updates.mjs
//
// Applies:
//   1. Fabric Collection → the 8 house fabrics with price/yard (keeps any photos already set).
//   2. Blazer "Cuff Style" → Functional / Non-Functional / Sleeve Buttons (new group; shirts keep theirs).
//   3. Blazer & Trouser measurement fields → the reference set (English labels only).
//   4. New "Discover Something New" category (empty, admin-managed) after Kurta.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FABRICS = [
  { name: "Bentley Hilton (95101)", price: 1300 },
  { name: "Bentley Alzera (14401)", price: 1350 },
  { name: "Focus Blue", price: 1250 },
  { name: "Lord & Taylor Xtra Comfort (3716) Jacketing", price: 3000 },
  { name: "Clissold (England) (SM003)", price: 3500 },
  { name: "Vitale Barberis Canonico (Italy) (SM002)", price: 6500 },
  { name: "Raymond Colorado", price: 1600 },
  { name: "Enrico Zenoni Classic (Volume 1 & 2)", price: 7500 },
];

const CUFF_STYLE_CHOICES = ["Functional Buttons", "Non-Functional Buttons", "Sleeve Buttons"];

const MEASUREMENTS = {
  blazer: ["Chest", "Waist", "Hip / Seat", "Shoulder Width", "Sleeve Length", "Wrist Opening", "Jacket Length", "Neck"],
  trouser: ["Waist", "Hip", "Thigh", "Knee", "Leg Opening", "Full Length", "Rise"],
};

async function updateFabrics() {
  const section = await prisma.section.findUnique({ where: { key: "fabric" } });
  // Preserve any photo an admin already attached, matched by fabric name.
  const imgByName = {};
  try {
    for (const s of JSON.parse(section?.config || "{}").swatches || []) {
      if (s && typeof s === "object" && s.image) imgByName[s.name] = s.image;
    }
  } catch {}
  const swatches = FABRICS.map((f) => ({ name: f.name, image: imgByName[f.name] || "", price: f.price }));
  await prisma.section.upsert({
    where: { key: "fabric" },
    update: { config: JSON.stringify({ swatches }) },
    create: {
      key: "fabric",
      order: 2,
      title: "The Fabric Collection",
      subtitle: "Cloth chosen with intent",
      config: JSON.stringify({ swatches }),
    },
  });
  console.log(`✓ Fabrics → ${swatches.length} fabrics with price/yard`);
}

async function updateCuffStyle() {
  // New blazer-specific group (kind "cuff-style"); the shared "cuff" group stays for shirts.
  const existing = await prisma.customizationGroup.findUnique({ where: { kind: "cuff-style" } });
  let cuffStyle;
  if (existing) {
    await prisma.customizationChoice.deleteMany({ where: { groupId: existing.id } });
    cuffStyle = await prisma.customizationGroup.update({
      where: { id: existing.id },
      data: {
        name: "Cuff Style",
        choices: { create: CUFF_STYLE_CHOICES.map((label, order) => ({ label, order })) },
      },
    });
  } else {
    cuffStyle = await prisma.customizationGroup.create({
      data: {
        kind: "cuff-style",
        name: "Cuff Style",
        order: 3,
        choices: { create: CUFF_STYLE_CHOICES.map((label, order) => ({ label, order })) },
      },
    });
  }

  const cuff = await prisma.customizationGroup.findUnique({ where: { kind: "cuff" } });
  const blazer = await prisma.category.findUnique({
    where: { slug: "blazer" },
    include: { products: { where: { type: "CUSTOM" }, include: { customizations: true } } },
  });
  let touched = 0;
  for (const p of blazer?.products ?? []) {
    const oldLink = cuff ? p.customizations.find((c) => c.groupId === cuff.id) : null;
    const hasNew = p.customizations.find((c) => c.groupId === cuffStyle.id);
    if (oldLink && !hasNew) {
      await prisma.productCustomization.update({ where: { id: oldLink.id }, data: { groupId: cuffStyle.id } });
      touched++;
    } else if (oldLink && hasNew) {
      await prisma.productCustomization.delete({ where: { id: oldLink.id } }); // drop duplicate old cuff
    } else if (!oldLink && !hasNew) {
      await prisma.productCustomization.create({ data: { productId: p.id, groupId: cuffStyle.id, order: 3 } });
      touched++;
    }
  }
  console.log(`✓ Cuff Style → group ready; ${touched} blazer product(s) now use Functional/Non-Functional/Sleeve Buttons`);
}

async function setMeasurements(slug, labels) {
  const cat = await prisma.category.findUnique({ where: { slug } });
  if (!cat) return console.log(`! ${slug} category not found — skipped measurements`);
  await prisma.$transaction([
    prisma.measurementField.deleteMany({ where: { categoryId: cat.id } }),
    prisma.measurementField.createMany({
      data: labels.map((label, order) => ({ categoryId: cat.id, label, unit: "in", order })),
    }),
  ]);
  console.log(`✓ ${slug} measurements → ${labels.join(", ")}`);
}

async function createDiscoverCategory() {
  await prisma.category.upsert({
    where: { slug: "discover-something-new" },
    update: {}, // don't clobber later admin edits on re-run
    create: {
      slug: "discover-something-new",
      name: "Discover Something New",
      order: 6,
      active: true,
      tagline: "Seasonal collections, special events & exclusive launches — coming soon",
      description:
        "A space for what's next at Armoire — future seasonal collections, special events and exclusive launches. New pieces will appear here soon.",
      bannerType: "image",
      bannerUrl: null,
      posterUrl: null,
    },
  });
  console.log(`✓ "Discover Something New" category ready (order 6, after Kurta)`);
}

async function main() {
  await updateFabrics();
  await updateCuffStyle();
  await setMeasurements("blazer", MEASUREMENTS.blazer);
  await setMeasurements("trouser", MEASUREMENTS.trouser);
  await createDiscoverCategory();
  console.log("\nAll content updates applied.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

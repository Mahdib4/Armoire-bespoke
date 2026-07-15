// One-off, IDEMPOTENT content update — revision round 3.
// Replaces the "Fabric Selection" customization choices (shown on every
// Tailor-Made product page) with the 8 house fabrics from the Fabric
// Collection, so the PDP fabric selector matches the priced collection.
// Safe to re-run; never wipes unrelated data.
// Run: node --env-file=.env scripts/apply-content-updates-2.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Must match the Fabric Collection section swatch names exactly —
// PDP fabric pricing looks prices up by name.
const FABRICS = [
  "Bentley Hilton (95101)",
  "Bentley Alzera (14401)",
  "Focus Blue",
  "Lord & Taylor Xtra Comfort (3716) Jacketing",
  "Clissold (England) (SM003)",
  "Vitale Barberis Canonico (Italy) (SM002)",
  "Raymond Colorado",
  "Enrico Zenoni Classic (Volume 1 & 2)",
];

async function main() {
  const group = await prisma.customizationGroup.findUnique({
    where: { kind: "fabric" },
    include: { choices: true },
  });
  if (!group) {
    console.log("! fabric group not found — nothing to do");
    return;
  }
  const current = group.choices.map((c) => c.label).join("|");
  if (current === FABRICS.join("|")) {
    console.log("✓ fabric choices already up to date");
    return;
  }
  await prisma.$transaction([
    prisma.customizationChoice.deleteMany({ where: { groupId: group.id } }),
    prisma.customizationChoice.createMany({
      data: FABRICS.map((label, order) => ({ groupId: group.id, label, order })),
    }),
  ]);
  console.log(`✓ Fabric Selection choices → ${FABRICS.length} house fabrics (was ${group.choices.length})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

// Seeds the Armoire Bespoke catalog from public/media/manifest.json.
// Idempotent: wipes content tables then re-creates. Run: npm run db:seed
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

type MProduct = { slug: string; name: string; images: string[]; sizeChart: string | null };
type MCategory = { slug: string; name: string; src: string; products: MProduct[] };
type Manifest = {
  categories: MCategory[];
  styleOptions: { kind: string; name: string; url: string }[];
};

const manifest: Manifest = JSON.parse(
  readFileSync(path.resolve(__dirname, "..", "public", "media", "manifest.json"), "utf8")
);

// Nicer display names than the auto-slug titles.
const NAME: Record<string, string> = {
  "herringbonebrownstone-classic": "Herringbone Brownstone Classic",
  "houndstooth-harmony": "Houndstooth Harmony",
  "midnight-mobster": "Midnight Mobster",
  "off-white-signature": "Off-White Signature",
  "coffee-jungle": "Coffee Jungle",
  "denim-jungle": "Denim Jungle",
  "off-white-jungle": "Off-White Jungle",
  "baby-pink": "Baby Pink",
  "blue-strip-with-french-cuff": "Blue Stripe · French Cuff",
  "powder-blue": "Powder Blue",
  "bell-bottom": "Bell-Bottom",
  "full-cut-pajama": "Full-Cut Pajama",
  herringbone: "Herringbone",
  houndstooth: "Houndstooth",
  "low-waist": "Low-Waist",
  "midnight-blue": "Midnight Blue",
  "off-white": "Off-White",
  "classic-beige-sherwani-cut-kurta": "Classic Beige Sherwani-Cut Kurta",
  "lilac-mist-sherwani-cut-kurta": "Lilac Mist Sherwani-Cut Kurta",
  "majestic-grape-egyptian-kurta": "Majestic Grape Egyptian Kurta",
  "moonlight-white-regal-texture-kurta": "Moonlight White Regal Kurta",
  "rongin-mahogani-kurta": "Rongin Mahogani Kurta",
  "sahara-olive-egyptian-kurta": "Sahara Olive Egyptian Kurta",
  "shadow-black-regal-texture-kurta": "Shadow Black Regal Kurta",
  "shubho-shada-kurta": "Shubho Shada Kurta",
  pajama: "Signature Pajama",
};

// Per-category configuration.
const CAT: Record<
  string,
  {
    order: number;
    tagline: string;
    description: string;
    price: number;
    banner: "video" | "image";
    bannerUrl?: string;
    posterUrl?: string;
    measurements: { label: string; unit?: string; hint?: string }[];
    customization: string[]; // group kinds
    specs: { label: string; value: string }[];
    blurb: string;
  }
> = {
  blazer: {
    order: 1,
    tagline: "Structured elegance, shoulder to hem",
    description:
      "The blazer is where Armoire begins — a study in canvassed structure, hand-set shoulders and a lapel rolled to the exact break of your posture.",
    price: 15000,
    banner: "video",
    bannerUrl: "/media/videos/blazer.mp4",
    posterUrl: "/media/videos/posters/blazer.jpg",
    measurements: [
      { label: "Chest" },
      { label: "Shoulder" },
      { label: "Sleeve Length" },
      { label: "Jacket Length" },
      { label: "Waist" },
    ],
    customization: ["fabric", "lapel", "pocket", "vent", "cuff"],
    specs: [
      { label: "Construction", value: "Half-canvassed, structured shoulder" },
      { label: "Closure", value: "Single-breasted, two-button" },
      { label: "Lining", value: "Bemberg cupro" },
      { label: "Made", value: "Made-to-measure in Dhaka" },
    ],
    blurb:
      "Cut to your exact measurements for a clean, proportionate silhouette. Place your order and our atelier will call to schedule your fitting.",
  },
  jacket: {
    order: 2,
    tagline: "Rugged refinement, reimagined",
    description:
      "The jungle jacket — utility tempered by tailoring. Four pockets, a relaxed drape, and cloth chosen to weather the everyday with grace.",
    price: 12000,
    banner: "video",
    bannerUrl: "/media/videos/jacket.mp4",
    posterUrl: "/media/videos/posters/jacket.jpg",
    measurements: [
      { label: "Chest" },
      { label: "Shoulder" },
      { label: "Sleeve Length" },
      { label: "Jacket Length" },
    ],
    customization: ["fabric", "pocket"],
    specs: [
      { label: "Style", value: "Four-pocket safari / jungle jacket" },
      { label: "Fit", value: "Relaxed, unstructured" },
      { label: "Closure", value: "Concealed placket" },
      { label: "Made", value: "Made-to-measure in Dhaka" },
    ],
    blurb:
      "A tailored take on the field jacket, built to your measurements. Order now — we'll arrange your fitting appointment.",
  },
  shirt: {
    order: 3,
    tagline: "The quiet foundation of every ensemble",
    description:
      "A shirt is the closest cloth to the man. Ours is drafted collar-first, with a yoke that sits true and a cuff turned to your wrist.",
    price: 4500,
    banner: "video",
    bannerUrl: "/media/videos/shirt.mp4",
    posterUrl: "/media/videos/posters/shirt.jpg",
    measurements: [
      { label: "Neck" },
      { label: "Chest" },
      { label: "Sleeve Length" },
      { label: "Shirt Length" },
      { label: "Waist" },
    ],
    customization: ["fabric", "collar", "cuff"],
    specs: [
      { label: "Collar", value: "Fused, choice of profile" },
      { label: "Placket", value: "Standard front" },
      { label: "Cloth", value: "Two-ply cotton" },
      { label: "Made", value: "Made-to-measure in Dhaka" },
    ],
    blurb:
      "Tailored to your neck, chest and sleeve for a collar that sits and a cuff that closes. Order now and book your measurement.",
  },
  trouser: {
    order: 4,
    tagline: "Line and drape, perfected",
    description:
      "Trousers are an exercise in balance — the rise, the taper, the break at the shoe. We cut each pair to fall clean from waist to hem.",
    price: 5500,
    banner: "image",
    measurements: [
      { label: "Waist" },
      { label: "Hip" },
      { label: "Inseam" },
      { label: "Outseam" },
      { label: "Thigh" },
      { label: "Bottom (Hem)" },
    ],
    customization: ["fabric", "pocket"],
    specs: [
      { label: "Rise", value: "Mid, adjustable" },
      { label: "Waistband", value: "Extended tab / side adjusters" },
      { label: "Finish", value: "Unfinished hem for fitting" },
      { label: "Made", value: "Made-to-measure in Dhaka" },
    ],
    blurb:
      "Cut to your waist, hip and inseam for a clean line to the shoe. Order now — we'll finish the hem at your fitting.",
  },
  kurta: {
    order: 5,
    tagline: "Heritage silhouettes, contemporary finish",
    description:
      "The kurta collection honours occasion — regal textures, sherwani-cut lines and colours drawn from ceremony, tailored to sit and move as one.",
    price: 6500,
    banner: "image",
    measurements: [
      { label: "Chest" },
      { label: "Shoulder" },
      { label: "Sleeve Length" },
      { label: "Kurta Length" },
    ],
    customization: ["fabric", "collar"],
    specs: [
      { label: "Silhouette", value: "Sherwani / Egyptian / regal cut" },
      { label: "Placket", value: "Concealed or feature button" },
      { label: "Occasion", value: "Eid, wedding, ceremony" },
      { label: "Made", value: "Made-to-measure in Dhaka" },
    ],
    blurb:
      "A ceremonial kurta cut to your measurements. Order now and our team will arrange your fitting.",
  },
};

// Customization groups & their choices.
const GROUPS: {
  kind: string;
  name: string;
  refKind?: string; // matches manifest styleOptions kind
  choices: string[];
}[] = [
  {
    kind: "fabric",
    name: "Fabric",
    choices: [
      "Tropical Wool Blend",
      "English Herringbone",
      "Italian Flannel",
      "Egyptian Cotton",
      "Linen Blend",
      "Cotton Twill",
    ],
  },
  { kind: "lapel", name: "Lapel", refKind: "lapels", choices: ["Notch", "Peak", "Shawl"] },
  {
    kind: "collar",
    name: "Collar",
    refKind: "collars",
    choices: ["Classic Spread", "Cutaway", "Button-Down", "Mandarin"],
  },
  { kind: "cuff", name: "Cuff", refKind: "cuffs", choices: ["Barrel", "French (Double)", "Mitred"] },
  { kind: "pocket", name: "Pocket", refKind: "pockets", choices: ["Flap", "Jetted", "Patch"] },
  { kind: "vent", name: "Vent", refKind: "vents", choices: ["Single", "Double (Side)", "None"] },
];

const QUOTES: { slot: string; text: string; attribution?: string; order: number }[] = [
  {
    slot: "manifesto",
    text: "A garment is not merely worn — it is inhabited. At Armoire, we tailor not to the body alone, but to the character that commands it.",
    attribution: "Armoire Bespoke",
    order: 0,
  },
  { slot: "after-storytelling", text: "Elegance is refusal — of the loud, the hurried, the almost-right.", order: 1 },
  { slot: "after-lookbook", text: "The cloth remembers the hand that cut it.", order: 2 },
  { slot: "after-fabric", text: "First the fibre, then the fit — nothing beautiful skips a step.", order: 3 },
  { slot: "after-blazer", text: "A shoulder line, once seen, is never unseen.", order: 4 },
  { slot: "after-jacket", text: "Utility, when tailored, becomes character.", order: 5 },
  { slot: "after-shirt", text: "The finest luxuries sit closest to the skin.", order: 6 },
  { slot: "after-trouser", text: "A clean break at the shoe is a quiet kind of confidence.", order: 7 },
  { slot: "after-kurta", text: "Heritage is not worn to the past — it is carried forward.", order: 8 },
];

async function main() {
  // Wipe (order respects FKs)
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productCustomization.deleteMany();
  await prisma.customizationChoice.deleteMany();
  await prisma.customizationGroup.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.measurementField.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.section.deleteMany();
  await prisma.siteSetting.deleteMany();
  await prisma.media.deleteMany();

  // ----- Site settings -----
  const settings: Record<string, string> = {
    brandName: "Armoire Bespoke",
    brandShort: "Armoire",
    slogan: "Tailored to define you",
    logoDark: "/media/brand/logo-dark.png",
    logoLight: "/media/brand/logo-light.png",
    heroVideo: "/media/videos/hero.mp4",
    heroPoster: "",
    midVideo: "/media/videos/mid.mp4",
    currency: "Tk",
    contactEmail: process.env.OWNER_EMAIL || "hello@armoirebespoke.com",
    contactPhone: "+880 1XXX-XXXXXX",
    address: "Dhanmondi, Dhaka, Bangladesh",
    instagram: "https://instagram.com/",
    footerNote: "Where master craft meets timeless elegance. Every stitch — a signature of devotion.",
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.siteSetting.create({ data: { key, value } });
  }

  // ----- Customization groups -----
  const groupIdByKind: Record<string, string> = {};
  for (let gi = 0; gi < GROUPS.length; gi++) {
    const g = GROUPS[gi];
    const ref = g.refKind
      ? manifest.styleOptions.find((s) => s.kind === g.refKind)?.url ?? null
      : null;
    const group = await prisma.customizationGroup.create({
      data: {
        kind: g.kind,
        name: g.name,
        referenceUrl: ref,
        order: gi,
        choices: {
          create: g.choices.map((label, i) => ({ label, order: i })),
        },
      },
    });
    groupIdByKind[g.kind] = group.id;
  }

  // ----- Categories, products, measurements, customizations -----
  for (const mcat of manifest.categories) {
    const cfg = CAT[mcat.slug];
    if (!cfg) continue;

    // choose an image banner for image-type categories
    let bannerUrl = cfg.bannerUrl;
    let posterUrl = cfg.posterUrl;
    if (cfg.banner === "image") {
      const pick =
        mcat.products.find((p) => /midnight|majestic|shadow|herringbone/.test(p.slug)) ??
        mcat.products[0];
      bannerUrl = pick?.images[0];
    }

    const category = await prisma.category.create({
      data: {
        slug: mcat.slug,
        name: mcat.name,
        order: cfg.order,
        tagline: cfg.tagline,
        description: cfg.description,
        bannerType: cfg.banner,
        bannerUrl: bannerUrl ?? null,
        posterUrl: posterUrl ?? null,
        measurementFields: {
          create: cfg.measurements.map((m, i) => ({
            label: m.label,
            unit: m.unit ?? "in",
            hint: m.hint ?? null,
            order: i,
          })),
        },
      },
    });

    for (let pi = 0; pi < mcat.products.length; pi++) {
      const mp = mcat.products[pi];
      const displayName = NAME[mp.slug] ?? mp.name;
      const product = await prisma.product.create({
        data: {
          slug: mp.slug,
          name: displayName,
          categoryId: category.id,
          type: "CUSTOM",
          priceTk: cfg.price,
          description: `${displayName} — ${cfg.blurb}`,
          specs: JSON.stringify(cfg.specs),
          fabric: cfg.specs.find((s) => /cloth|fabric|construction/i.test(s.label))?.value ?? null,
          order: pi,
          featured: pi === 0,
          sizeChartUrl: mp.sizeChart ?? "/media/sizechart.jpg",
          images: {
            create: mp.images.map((url, i) => ({
              url,
              alt: `${displayName} — view ${i + 1}`,
              order: i,
            })),
          },
          customizations: {
            create: cfg.customization.map((kind, i) => ({
              groupId: groupIdByKind[kind],
              order: i,
            })),
          },
        },
      });
      void product;
    }
  }

  // ----- Quotes -----
  for (const q of QUOTES) {
    await prisma.quote.create({ data: q });
  }

  // ----- Sections -----
  await prisma.section.create({
    data: {
      key: "storytelling",
      order: 0,
      title: "The Armoire Story",
      subtitle: "Craft as devotion",
      body: "Armoire Bespoke began with a simple conviction: that a garment should be built, not bought. Every commission starts with conversation and measurement, and ends with a fitting where cloth finally meets character. We cut in Dhaka, by hand, for men who understand that the difference between dressed and well-dressed is measured in millimetres.",
      config: JSON.stringify({ accent: "gold" }),
    },
  });
  await prisma.section.create({
    data: {
      key: "lookbook",
      order: 1,
      title: "The Lookbook",
      subtitle: "A study in silhouette",
      body: "Selected looks across the house — blazers, jackets, shirting, trousers and ceremonial kurtas.",
    },
  });
  await prisma.section.create({
    data: {
      key: "fabric",
      order: 2,
      title: "The Fabric Collection",
      subtitle: "Cloth chosen with intent",
      body: "From English herringbone to Egyptian cotton, every bolt is selected for hand, drape and how it ages. Choose your cloth, and we build around it.",
      config: JSON.stringify({
        swatches: GROUPS.find((g) => g.kind === "fabric")?.choices ?? [],
      }),
    },
  });

  // ----- Admin user -----
  const email = process.env.ADMIN_EMAIL || "admin@armoirebespoke.com";
  const password = process.env.ADMIN_PASSWORD || "armoire2026";
  await prisma.adminUser.create({
    data: {
      email,
      name: "Atelier Admin",
      passwordHash: await bcrypt.hash(password, 10),
    },
  });

  const counts = {
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    images: await prisma.productImage.count(),
    groups: await prisma.customizationGroup.count(),
    quotes: await prisma.quote.count(),
  };
  console.log("Seed complete:", counts);
  console.log(`Admin login -> ${email} / ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

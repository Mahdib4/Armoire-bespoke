import "server-only";
import { prisma } from "./prisma";
import { getCategoryFabricPrices, getFabricPrices, getProductDiscounts, getSettings } from "./data";
import {
  categoryTailoringCharge,
  fabricFromSelections,
  garmentYards,
  tailorPrice,
} from "./pricing";
import { discountedPrice } from "./campaign";

/** A line as the browser sends it. Prices are never accepted from the client. */
export type CartInput = {
  productId: string;
  qty: number;
  size?: string;
  selections?: Record<string, string>;
  measurements?: Record<string, string>;
  fabric?: { name: string; yards: number; colorCode?: string; note?: string };
};

/** A line priced from the database, ready to store on the order. */
export type PricedLine = {
  productId: string | null;
  productName: string;
  type: string; // CUSTOM | READYMADE | FABRIC
  priceTk: number; // unit price, after any live campaign discount
  qty: number;
  selections: string | null;
  measurements: string | null;
  /** Which collection the line belongs to — used by coupon rules. */
  categoryId: string | null;
};

/**
 * The single source of truth for what a bag costs.
 *
 * - Ready-Made: the product's fixed price.
 * - Tailor-Made: the collection's tailoring charge + the chosen cloth's price
 *   per yard × the yards that garment needs.
 * - Fabric by the yard: price per yard × yards.
 *
 * Any live campaign discount is applied last, so a discounted piece is charged
 * at its discounted price even if the browser sent something else. Used both
 * when a coupon is previewed and when the order is actually placed, so the two
 * can never disagree.
 */
export async function priceCart(items: CartInput[]): Promise<PricedLine[]> {
  const products = await prisma.product.findMany({
    where: { id: { in: items.filter((i) => !i.fabric).map((i) => i.productId) }, active: true },
    include: { category: { select: { id: true, slug: true } } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const [fabricPrices, settings, discounts] = await Promise.all([
    getFabricPrices(),
    getSettings(),
    getProductDiscounts(),
  ]);

  const catSlugs = [...new Set(products.map((p) => p.category.slug))];
  const catPrices = new Map(
    await Promise.all(catSlugs.map(async (s) => [s, await getCategoryFabricPrices(s)] as const))
  );

  return items
    .map((it): PricedLine | null => {
      // Fabric by the yard — priced from the fabric list, never discounted.
      if (it.fabric) {
        const perYard = fabricPrices[it.fabric.name] ?? 0;
        if (perYard <= 0) return null;
        const yards = it.fabric.yards;
        const selections: Record<string, string> = { Yards: `${yards}` };
        if (it.fabric.colorCode) selections["Colour code"] = it.fabric.colorCode;
        return {
          productId: null,
          productName: `${it.fabric.name} — fabric (${yards} yd)`,
          type: "FABRIC",
          priceTk: Math.round(perYard * yards),
          qty: it.qty,
          selections: JSON.stringify(selections),
          measurements: it.fabric.note ? JSON.stringify({ Note: it.fabric.note }) : null,
          categoryId: null,
        };
      }

      const p = byId.get(it.productId);
      if (!p) return null;

      let unit: number;
      if (p.type === "READYMADE") {
        unit = p.priceTk;
      } else {
        const slug = p.category.slug;
        const prices = catPrices.get(slug) ?? {};
        const fabricName = fabricFromSelections(it.selections, prices);
        const perYard = fabricName ? prices[fabricName] : 0;
        unit = tailorPrice(
          categoryTailoringCharge(settings, slug),
          garmentYards(slug, settings),
          perYard
        );
      }

      return {
        productId: p.id,
        productName: p.name,
        type: p.type,
        priceTk: discountedPrice(unit, discounts.get(p.id)),
        qty: it.qty,
        selections: it.selections ? JSON.stringify(it.selections) : null,
        measurements: it.measurements ? JSON.stringify(it.measurements) : null,
        categoryId: p.category.id,
      };
    })
    .filter((l): l is PricedLine => l !== null);
}

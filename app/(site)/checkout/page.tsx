import { getSettings } from "@/lib/data";
import { deliveryCharge, type DeliveryZone } from "@/lib/pricing";
import CheckoutForm from "@/components/CheckoutForm";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  // Delivery charges come from Site Settings so the owner can change them
  // without a deploy. The order API recomputes them from the same source.
  const settings = await getSettings();
  const deliveryRates: Record<DeliveryZone, number> = {
    "inside-dhaka": deliveryCharge(settings, "inside-dhaka"),
    "outside-dhaka": deliveryCharge(settings, "outside-dhaka"),
  };

  return <CheckoutForm deliveryRates={deliveryRates} />;
}

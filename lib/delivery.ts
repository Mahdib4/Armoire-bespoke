// Delivery areas
// ---------------------------------------------------------------------------
// The delivery charge follows the customer's city, never their own choice: the
// checkout shows the zone the city implies, and the order API works it out
// again from the same list when the order is placed. That makes it impossible
// to pay the Dhaka rate for an address outside Dhaka.
//
// No server-only imports — shared by the checkout form and the order API.

import type { DeliveryZone } from "./pricing";

/** Cities charged the inside-Dhaka rate. */
const INSIDE_DHAKA = ["dhaka"];

/**
 * Every district, so the customer picks rather than types. Dhaka is first;
 * the rest are alphabetical and all take the outside-Dhaka rate.
 */
export const CITIES: string[] = [
  "Dhaka",
  "Bagerhat",
  "Bandarban",
  "Barguna",
  "Barishal",
  "Bhola",
  "Bogura",
  "Brahmanbaria",
  "Chandpur",
  "Chapainawabganj",
  "Chattogram",
  "Chuadanga",
  "Cox's Bazar",
  "Cumilla",
  "Dinajpur",
  "Faridpur",
  "Feni",
  "Gaibandha",
  "Gazipur",
  "Gopalganj",
  "Habiganj",
  "Jamalpur",
  "Jashore",
  "Jhalokati",
  "Jhenaidah",
  "Joypurhat",
  "Khagrachhari",
  "Khulna",
  "Kishoreganj",
  "Kurigram",
  "Kushtia",
  "Lakshmipur",
  "Lalmonirhat",
  "Madaripur",
  "Magura",
  "Manikganj",
  "Meherpur",
  "Moulvibazar",
  "Munshiganj",
  "Mymensingh",
  "Naogaon",
  "Narail",
  "Narayanganj",
  "Narsingdi",
  "Natore",
  "Netrokona",
  "Nilphamari",
  "Noakhali",
  "Pabna",
  "Panchagarh",
  "Patuakhali",
  "Pirojpur",
  "Rajbari",
  "Rajshahi",
  "Rangamati",
  "Rangpur",
  "Satkhira",
  "Shariatpur",
  "Sherpur",
  "Sirajganj",
  "Sunamganj",
  "Sylhet",
  "Tangail",
  "Thakurgaon",
];

/**
 * The zone a city falls in. Anything that isn't recognised as Dhaka is charged
 * the outside-Dhaka rate, so an unfamiliar or mistyped city can only ever err
 * towards the higher charge — never the cheaper one.
 */
export function zoneForCity(city: string | null | undefined): DeliveryZone {
  const c = (city ?? "").trim().toLowerCase();
  return INSIDE_DHAKA.includes(c) ? "inside-dhaka" : "outside-dhaka";
}

/** Is this one of the cities we offer? Used to require a real choice. */
export function isKnownCity(city: string | null | undefined): boolean {
  const c = (city ?? "").trim().toLowerCase();
  return CITIES.some((x) => x.toLowerCase() === c);
}

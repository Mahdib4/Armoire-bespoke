import { Suspense } from "react";
import type { Metadata } from "next";
import SearchResults from "@/components/SearchResults";
import { getSettings } from "@/lib/data";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Search",
  description: "Find a piece across every Armoire Bespoke collection.",
};

export default async function SearchPage() {
  const settings = await getSettings();
  return (
    <Suspense fallback={<div className="srchpage" />}>
      <SearchResults currency={settings.currency || "Tk"} />
    </Suspense>
  );
}

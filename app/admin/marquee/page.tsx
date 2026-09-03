import MarqueeEditor from "@/components/admin/MarqueeEditor";
import { getMarquee } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminMarquee() {
  const config = await getMarquee();

  return (
    <div>
      <div className="adm-head">
        <div>
          <h1>Marquee</h1>
          <p>
            The slim scrolling strip near the top of the homepage. Show a few short messages or a loop
            of images, and set exactly how it looks.
          </p>
        </div>
      </div>
      <MarqueeEditor config={config} />
    </div>
  );
}

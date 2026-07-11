import { getSettings } from "@/lib/data";
import SettingsEditor from "@/components/admin/SettingsEditor";

export const dynamic = "force-dynamic";

export default async function AdminSettings() {
  const settings = await getSettings();
  return (
    <div>
      <div className="adm-head">
        <div>
          <h1>Site Settings</h1>
          <p>Logo, slogan, hero video, brand name and contact details.</p>
        </div>
      </div>
      <SettingsEditor initial={settings} />
    </div>
  );
}

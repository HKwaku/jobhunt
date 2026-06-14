import { PageHeader } from "@/components/ui";
import ConfigBanner from "@/components/ConfigBanner";
import ProfileEditor from "./ProfileEditor";
import { getProfile } from "@/lib/profile";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { CvProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  let profile: CvProfile | null = null;
  let error: string | null = null;

  if (isSupabaseConfigured()) {
    try {
      profile = await getProfile();
    } catch (e) {
      error = (e as Error).message;
    }
  }

  return (
    <>
      <PageHeader
        title="CV Profile"
        subtitle="The brain of the matching system — your CV and what you're looking for."
      />
      <ConfigBanner />
      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {error}
        </div>
      )}
      <ProfileEditor initial={profile} />
    </>
  );
}

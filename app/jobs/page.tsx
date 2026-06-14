import { PageHeader } from "@/components/ui";
import ConfigBanner from "@/components/ConfigBanner";
import JobsBoard from "./JobsBoard";
import { listJobs } from "@/lib/jobs";
import { getProfile } from "@/lib/profile";
import { isSupabaseConfigured } from "@/lib/supabase";
import { DEFAULT_CV_FORMAT } from "@/lib/types";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  let jobs: Job[] = [];
  let cvFormat = DEFAULT_CV_FORMAT;
  let hasProfile = false;
  let error: string | null = null;

  if (isSupabaseConfigured()) {
    try {
      const [j, profile] = await Promise.all([
        listJobs({ sort: "score" }),
        getProfile(),
      ]);
      jobs = j;
      hasProfile = Boolean(profile && (profile.raw_text || profile.summary));
      if (profile?.cv_format) cvFormat = profile.cv_format;
    } catch (e) {
      error = (e as Error).message;
    }
  }

  return (
    <>
      <PageHeader
        title="Jobs"
        subtitle="Search Adzuna, scored against your CV and sorted by match."
      />
      <ConfigBanner />
      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {error}
        </div>
      )}
      <JobsBoard initial={jobs} cvFormat={cvFormat} hasProfile={hasProfile} />
    </>
  );
}

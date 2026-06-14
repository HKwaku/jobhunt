import { PageHeader } from "@/components/ui";
import ConfigBanner from "@/components/ConfigBanner";
import ContactsBoard, { type JobOption } from "./ContactsBoard";
import { listContacts } from "@/lib/contacts";
import { listJobs } from "@/lib/jobs";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { Contact } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: { job?: string };
}) {
  let contacts: Contact[] = [];
  let jobs: JobOption[] = [];
  let error: string | null = null;

  if (isSupabaseConfigured()) {
    try {
      const [c, j] = await Promise.all([listContacts(), listJobs({ sort: "date" })]);
      contacts = c;
      jobs = j.map((job) => ({
        id: job.id,
        title: job.title,
        company: job.company,
      }));
    } catch (e) {
      error = (e as Error).message;
    }
  }

  return (
    <>
      <PageHeader
        title="Contacts"
        subtitle="Track people to reach out to and generate tailored outreach."
      />
      <ConfigBanner />
      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {error}
        </div>
      )}
      <ContactsBoard
        initial={contacts}
        jobs={jobs}
        presetJobId={searchParams.job}
      />
    </>
  );
}

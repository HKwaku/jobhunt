// Server component: warns when required env vars are missing.
const CHECKS: { key: string; label: string; public?: boolean }[] = [
  { key: "NEXT_PUBLIC_SUPABASE_URL", label: "Supabase URL" },
  { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Supabase service key" },
  { key: "ANTHROPIC_API_KEY", label: "Anthropic key" },
  { key: "ADZUNA_APP_ID", label: "Adzuna app id" },
  { key: "ADZUNA_APP_KEY", label: "Adzuna app key" },
];

export default function ConfigBanner() {
  const missing = CHECKS.filter((c) => !process.env[c.key]);
  if (missing.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
      <p className="font-medium">Setup incomplete</p>
      <p className="mt-1 text-amber-200/80">
        Missing environment variables:{" "}
        <span className="font-mono">
          {missing.map((m) => m.key).join(", ")}
        </span>
        . Add them to{" "}
        <span className="font-mono">.env.local</span> and restart the dev server.
        Features that depend on them will fall back gracefully.
      </p>
    </div>
  );
}

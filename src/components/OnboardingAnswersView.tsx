import type { OnboardingAnswers } from "../lib/database.types";

const ANSWER_LABELS: Record<keyof OnboardingAnswers, string> = {
  business_name: "Business name",
  business_description: "What the business does",
  target_audience: "Target audience",
  brand_voice: "Brand voice",
  platforms: "Platforms",
  existing_handles: "Existing profiles",
  goals: "Goals",
  inspiration: "Inspiration accounts",
  content_guidelines: "Guidelines / avoid",
};

export default function OnboardingAnswersView({ answers }: { answers: OnboardingAnswers | null | undefined }) {
  const keys = (Object.keys(ANSWER_LABELS) as (keyof OnboardingAnswers)[]).filter((key) => {
    const value = answers?.[key];
    return value && !(Array.isArray(value) && value.length === 0);
  });

  if (keys.length === 0) {
    return <p className="text-sm text-on-surface-variant">No answers yet.</p>;
  }

  return (
    <div className="grid gap-4">
      {keys.map((key) => {
        const value = answers![key]!;
        return (
          <div key={key}>
            <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">{ANSWER_LABELS[key]}</div>
            <div className="text-white text-sm">{Array.isArray(value) ? value.join(", ") : value}</div>
          </div>
        );
      })}
    </div>
  );
}

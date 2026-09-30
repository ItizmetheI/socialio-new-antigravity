import type { RequestStage } from "../../lib/database.types";

// One colour per stage, used everywhere work appears (client lanes, the
// side panel, calendar chips, staff board) so a colour always means the
// same thing: grey queued, blue in progress, amber waiting on the client,
// green delivered. `light:` tones keep the text readable on the light theme.
export const STAGE_STYLE: Record<
  RequestStage,
  { clientLabel: string; dot: string; text: string; tint: string; border: string; underline: string; bar: string }
> = {
  requested: {
    clientLabel: "Queued",
    dot: "bg-slate-400",
    text: "text-slate-300 light:text-slate-600",
    tint: "bg-slate-400/10",
    border: "border-l-slate-400",
    underline: "border-b-slate-400",
    bar: "bg-slate-400",
  },
  in_progress: {
    clientLabel: "In progress",
    dot: "bg-blue-500",
    text: "text-blue-300 light:text-blue-700",
    tint: "bg-blue-500/10",
    border: "border-l-blue-500",
    underline: "border-b-blue-500",
    bar: "bg-blue-500",
  },
  review: {
    clientLabel: "Needs your review",
    dot: "bg-amber-400",
    text: "text-amber-300 light:text-amber-700",
    tint: "bg-amber-400/10",
    border: "border-l-amber-400",
    underline: "border-b-amber-400",
    bar: "bg-amber-400",
  },
  delivered: {
    clientLabel: "Delivered",
    dot: "bg-emerald-500",
    text: "text-emerald-300 light:text-emerald-700",
    tint: "bg-emerald-500/10",
    border: "border-l-emerald-500",
    underline: "border-b-emerald-500",
    bar: "bg-emerald-500",
  },
};

import { transform, useTransform, type MotionValue } from "motion/react";

// Same as useTransform(progress, input, output), but in function form. Motion
// hands the array form of scroll-linked *opacity* to a native ViewTimeline,
// and for sections taller than the viewport its range mapping is wrong — the
// phone showcase's wordmark faded back in at the end of the section (native
// timeline reported 70% while real progress was 98%). The function form
// always stays on Motion's JS path, which matches every other value here.
export function useScrollRange(progress: MotionValue<number>, input: number[], output: number[]) {
  return useTransform(progress, (v) => transform(v, input, output));
}

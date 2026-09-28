import { AlertCircle } from "lucide-react";

export default function ErrorBanner({ message }: { message: string }) {
  return (
    <div role="alert" className="border border-error/25 bg-error/5 rounded-2xl px-5 py-4 flex items-start gap-3 text-error text-sm">
      <AlertCircle className="w-5 h-5 shrink-0" />
      <span className="min-w-0 break-words">{message}</span>
    </div>
  );
}

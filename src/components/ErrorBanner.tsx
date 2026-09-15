import React from "react";
import { AlertCircle } from "lucide-react";

export default function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="border border-red-400/20 bg-red-400/5 rounded-2xl p-6 flex items-center gap-3 text-red-300">
      <AlertCircle className="w-5 h-5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

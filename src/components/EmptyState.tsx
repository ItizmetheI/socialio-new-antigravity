import React from "react";
import { Inbox } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
};

export default function EmptyState({ title, description, icon: Icon = Inbox }: EmptyStateProps) {
  return (
    <div className="border border-dashed border-white/15 rounded-3xl px-6 py-10 md:p-12 text-center">
      <Icon className="w-8 h-8 text-on-surface-variant mx-auto mb-4" />
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-on-surface-variant max-w-sm mx-auto">{description}</p>
    </div>
  );
}

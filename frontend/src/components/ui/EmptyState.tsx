import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
    icon?: LucideIcon;
    message: string;
};

export default function EmptyState({ icon: Icon, message }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
            {Icon && <Icon size={36} className="text-base-content/15" />}
            <p className="text-sm font-medium text-base-content/35">{message}</p>
        </div>
    );
}

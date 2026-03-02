import { type ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Props = {
    id: string;
    disabled?: boolean;
    children: ReactNode;
};

export default function SortableTableRow({
    id,
    disabled = false,
    children
}: Props) {
    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition
    } = useSortable({
        id
    });

    return (
        <tr
            ref={setNodeRef}
            className="bg-bg-soft rounded-md"
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
            }}
            {...(!disabled ? attributes : {})}
            {...(!disabled ? listeners : {})}
        >
            {children}
        </tr>

    );
}

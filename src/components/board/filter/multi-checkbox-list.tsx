import { TagBadge } from "@/components/tags/tag-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function MultiCheckboxList({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: string; label: string; color?: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="max-h-40 space-y-2 overflow-y-auto">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-2 text-sm"
          >
            <Checkbox
              checked={selected.includes(option.value)}
              onCheckedChange={() => onToggle(option.value)}
            />
            {option.color ? (
              <TagBadge name={option.label} color={option.color} />
            ) : (
              option.label
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

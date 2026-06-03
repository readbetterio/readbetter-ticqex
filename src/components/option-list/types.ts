export type OptionItem = {
  value: string;
  label: string;
  color?: string;
};

/** Switch select fields to searchable combobox above this option count. */
export const OPTION_COMBOBOX_THRESHOLD = 5;

export function optionValueKey(value: string): string {
  return value.trim().toLowerCase();
}

export function optionMatchesSearch(label: string, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return label.toLowerCase().includes(query);
}

export function sortOptions(
  options: OptionItem[],
  recentValues: string[],
  query: string,
  selectedKeys: Set<string>,
): OptionItem[] {
  const q = query.trim().toLowerCase();
  const filtered = options.filter((option) => {
    if (selectedKeys.has(optionValueKey(option.value))) return false;
    if (!q) return true;
    return option.label.toLowerCase().includes(q);
  });

  const recentRank = new Map(
    recentValues.map((value, index) => [optionValueKey(value), index]),
  );

  return [...filtered].sort((a, b) => {
    const aRank = recentRank.get(optionValueKey(a.value));
    const bRank = recentRank.get(optionValueKey(b.value));
    if (aRank !== undefined && bRank !== undefined) return aRank - bRank;
    if (aRank !== undefined) return -1;
    if (bRank !== undefined) return 1;
    return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
  });
}

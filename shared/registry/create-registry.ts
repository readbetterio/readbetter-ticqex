export function createRegistry<TKey extends string, TDefinition>(
  entries: Record<TKey, TDefinition>,
) {
  const keys = Object.keys(entries) as TKey[];

  return {
    registry: entries,
    keys,
    listKeys(): TKey[] {
      return keys;
    },
    get(key: string): TDefinition | null {
      return entries[key as TKey] ?? null;
    },
    list(): TDefinition[] {
      return Object.values(entries) as TDefinition[];
    },
  };
}

export type Registry<TKey extends string, TDefinition> = ReturnType<
  typeof createRegistry<TKey, TDefinition>
>;

import type { DataType } from './dataType';
import type { Accessor } from './materialized/accessor';
import type { Leaf, ValueOf } from './schema/leaf';

type LeafBinding<T extends DataType> = {
  readonly present: boolean;
  readonly value: ValueOf[T] | null;
  commit(v: ValueOf[T]): string | null;
};

export function bindLeaf<K extends string, T extends DataType>(
  accessor: () => Accessor<K> | null,
  leaf: Leaf<T, NoInfer<K>>,
): LeafBinding<T> {
  const present = $derived(accessor()?.has(leaf) === true);
  const value = $derived<ValueOf[T] | null>(present ? (accessor()!.get(leaf) as ValueOf[T]) : null);

  return {
    get present() {
      return present;
    },
    get value() {
      return value;
    },
    commit(v) {
      const acc = accessor();
      if (!acc) return null;
      try {
        acc.set(leaf, v);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
    },
  };
}

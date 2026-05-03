export type { SchemaLeaf } from './leaf';

export type SchemaPaths<T> = {
  [K in keyof T & string]: T[K] extends { readonly hash: number; readonly type: number }
    ? K extends '$self'
      ? ''
      : K
    : K extends '$self'
      ? never
      : SchemaPaths<T[K]> extends infer P extends string
        ? P extends ''
          ? K
          : `${K}.${P}`
        : never;
}[keyof T & string];

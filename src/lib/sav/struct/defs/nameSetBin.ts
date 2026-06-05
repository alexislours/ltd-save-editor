import { struct, wchar, type DecodedNode, type StructDef } from '../types';

function childText(node: DecodedNode, name: string): string {
  const child = node.children?.find((c) => c.name === name);
  if (!child || child.value.kind !== 'text') return '';
  return child.value.value;
}

function formatName(node: DecodedNode): string {
  const text = childText(node, 'text');
  const reading = childText(node, 'reading');
  if (!text && !reading) return '(unset)';
  return reading ? `${text} (${reading})` : text;
}

const NAME: StructDef = {
  name: 'Name',
  fields: [
    { name: 'text', type: wchar(32) },
    { name: 'reading', type: wchar(64) },
  ],
  format: formatName,
};

export const NAME_SET_BIN: StructDef = {
  name: 'NameSetBin',
  fields: [
    { name: 'secondPerson', type: struct(NAME) },
    { name: 'thirdPerson', type: struct(NAME) },
  ],
};

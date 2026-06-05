import { epochSeconds } from '../codecs';
import { array, bytes, char, prim, struct, type DecodedNode, type StructDef } from '../types';

function childNumber(node: DecodedNode, name: string): number {
  const child = node.children?.find((c) => c.name === name);
  if (!child) return 0;
  const v = child.value;
  if (v.kind === 'number') return v.value;
  if (v.kind === 'bigint') return Number(v.value);
  return 0;
}

function formatUuid(node: DecodedNode): string {
  if (node.value.kind !== 'bytes') return '';
  const raw = node.value.value;
  const hex = (i: number) => raw[i].toString(16).padStart(2, '0');
  const part = (a: number, b: number) => {
    let s = '';
    for (let i = a; i < b; i++) s += hex(i);
    return s;
  };
  return `${part(0, 4)}-${part(4, 6)}-${part(6, 8)}-${part(8, 10)}-${part(10, 16)}`;
}

function pad(n: number, width: number): string {
  return Math.trunc(n).toString().padStart(width, '0');
}

function formatCalendar(node: DecodedNode): string {
  const year = childNumber(node, 'year');
  const month = childNumber(node, 'month');
  const day = childNumber(node, 'day');
  const hour = childNumber(node, 'hour');
  const minute = childNumber(node, 'minute');
  const second = childNumber(node, 'second');
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)} ${pad(hour, 2)}:${pad(minute, 2)}:${pad(second, 2)}`;
}

const UUID: StructDef = {
  name: 'Uuid',
  fields: [{ name: 'raw', type: bytes(16), format: formatUuid }],
  format: (node) => formatUuid(node.children?.[0] ?? node),
};

const STEADY_CLOCK_TIME_POINT: StructDef = {
  name: 'SteadyClockTimePoint',
  fields: [
    { name: 'value', type: prim('s64') },
    { name: 'source_id', type: struct(UUID) },
  ],
};

const SYSTEM_CLOCK_CONTEXT: StructDef = {
  name: 'SystemClockContext',
  fields: [
    { name: 'offset', type: prim('s64') },
    { name: 'steady_time_point', type: struct(STEADY_CLOCK_TIME_POINT) },
  ],
};

const CALENDAR_TIME: StructDef = {
  name: 'CalendarTime',
  fields: [
    { name: 'year', type: prim('s16') },
    { name: 'month', type: prim('u8') },
    { name: 'day', type: prim('u8') },
    { name: 'hour', type: prim('u8') },
    { name: 'minute', type: prim('u8') },
    { name: 'second', type: prim('u8') },
    { name: 'pad', type: prim('u8') },
  ],
  format: formatCalendar,
};

const CALENDAR_ADDITIONAL_INFO: StructDef = {
  name: 'CalendarAdditionalInfo',
  fields: [
    { name: 'day_of_week', type: prim('u32') },
    { name: 'day_of_year', type: prim('u32') },
    { name: 'tz_abbr', type: char(8) },
    { name: 'is_dst', type: prim('u32') },
    { name: 'utc_offset_sec', type: prim('s32') },
  ],
};

export const CLOCK_SNAPSHOT: StructDef = {
  name: 'ClockSnapshot',
  fields: [
    { name: 'user_context', type: struct(SYSTEM_CLOCK_CONTEXT) },
    { name: 'network_context', type: struct(SYSTEM_CLOCK_CONTEXT) },
    { name: 'user_posix_time', type: prim('s64'), codec: epochSeconds },
    { name: 'network_posix_time', type: prim('s64'), codec: epochSeconds },
    { name: 'user_calendar_time', type: struct(CALENDAR_TIME) },
    { name: 'network_calendar_time', type: struct(CALENDAR_TIME) },
    { name: 'user_calendar_additional_info', type: struct(CALENDAR_ADDITIONAL_INFO) },
    { name: 'network_calendar_additional_info', type: struct(CALENDAR_ADDITIONAL_INFO) },
    { name: 'steady_clock_time_point', type: struct(STEADY_CLOCK_TIME_POINT) },
    { name: 'location_name', type: char(0x24) },
    { name: 'is_automatic_correction_enabled', type: prim('u8') },
    { name: 'type', type: prim('u8') },
    { name: 'reserved', type: array(prim('u8'), 2) },
  ],
};

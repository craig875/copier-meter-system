const COUNTERS = [
  {
    field: 'monoReading',
    reasonField: 'monoUnchangedReason',
    label: 'Mono',
    enabledKey: 'monoEnabled',
  },
  {
    field: 'colourReading',
    reasonField: 'colourUnchangedReason',
    label: 'Colour',
    enabledKey: 'colourEnabled',
  },
  {
    field: 'scanReading',
    reasonField: 'scanUnchangedReason',
    label: 'Scan',
    enabledKey: 'scanEnabled',
  },
];

export const MIN_BILL_REASON = 'Min Bill';

/**
 * Previous-month values for all enabled counters (Min Bill auto-fill).
 */
export function buildMinBillFieldUpdates(machine, previousReading) {
  if (!machine || !previousReading) return null;

  const updates = {};
  for (const counter of COUNTERS) {
    if (!machine[counter.enabledKey]) continue;
    const previous = previousReading[counter.field];
    if (previous != null) {
      updates[counter.field] = previous;
    }
  }

  return Object.keys(updates).length > 0 ? updates : null;
}

/**
 * Find counters on a reading that match the previous month (need unchanged reason).
 */
export function findUnchangedCounters(reading, previousReading, machine) {
  if (!reading || !previousReading || !machine) return [];

  return COUNTERS.flatMap((counter) => {
    if (!machine[counter.enabledKey]) return [];

    const current = reading[counter.field];
    const previous = previousReading[counter.field];
    if (current == null || previous == null) return [];
    if (current !== previous) return [];

    return [{
      key: `${reading.machineId}-${counter.field}`,
      machineId: reading.machineId,
      machineSerialNumber: machine.machineSerialNumber,
      field: counter.field,
      reasonField: counter.reasonField,
      label: counter.label,
      current,
      previous,
    }];
  });
}

/**
 * Find unchanged counters across multiple readings (batch save).
 */
export function findUnchangedCountersForReadings(readings, machinesById) {
  const items = [];
  for (const reading of readings) {
    if (reading?.unableToRead) continue;
    const entry = machinesById.get(reading.machineId);
    if (!entry) continue;
    items.push(
      ...findUnchangedCounters(reading, entry.previousReading, entry.machine)
    );
  }
  return items;
}

/**
 * Attach unchanged reasons from modal/form map onto reading payloads.
 */
export function applyUnchangedReasons(readings, reasonByKey) {
  return readings.map((reading) => {
    const next = { ...reading };
    for (const counter of COUNTERS) {
      const key = `${reading.machineId}-${counter.field}`;
      if (reasonByKey[key]) {
        next[counter.reasonField] = reasonByKey[key].trim();
      }
    }
    return next;
  });
}

export { COUNTERS };

/**
 * Report notification branch backfill status after migration 20260717190000.
 * Run: node scripts/_notification-branch-inventory.mjs
 */
import prisma from '../src/config/database.js';

const ENTITY_MACHINE_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}-[0-9]{4}-[0-9]{1,2}$/;

function summarize(rows) {
  const byType = {};
  for (const row of rows) {
    const key = row.type || '(no type)';
    if (!byType[key]) {
      byType[key] = { total: 0, withBranch: 0, nullBranch: 0, byBranch: { JHB: 0, CT: 0 } };
    }
    byType[key].total += 1;
    if (row.branch) {
      byType[key].withBranch += 1;
      byType[key].byBranch[row.branch] = (byType[key].byBranch[row.branch] || 0) + 1;
    } else {
      byType[key].nullBranch += 1;
    }
  }
  return byType;
}

async function main() {
  const rows = await prisma.notification.findMany({
    select: {
      id: true,
      type: true,
      entityType: true,
      entityId: true,
      linkUrl: true,
      branch: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const byType = summarize(rows);
  const stillNull = rows.filter((r) => r.branch == null);

  const nullByReason = {
    reading_note_missing_machine: [],
    reading_note_bad_entity_id: [],
    orphan_entity: [],
    unknown_type: [],
  };

  for (const n of stillNull) {
    if (n.type === 'reading_note_added' || n.entityType === 'reading') {
      if (!n.entityId || !ENTITY_MACHINE_RE.test(n.entityId)) {
        nullByReason.reading_note_bad_entity_id.push(n);
        continue;
      }
      const machineId = n.entityId.match(
        /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/,
      )?.[1];
      const machine = machineId
        ? await prisma.machine.findUnique({ where: { id: machineId }, select: { id: true, branch: true } })
        : null;
      if (!machine) nullByReason.reading_note_missing_machine.push(n);
      else nullByReason.orphan_entity.push(n); // unexpected if migration ran
      continue;
    }

    if (
      n.entityType === 'part_order' ||
      n.entityType === 'unable_to_obtain_override_request' ||
      n.entityType === 'fibre_order_update_request' ||
      n.entityType === 'connectivity_target'
    ) {
      nullByReason.orphan_entity.push(n);
      continue;
    }

    nullByReason.unknown_type.push(n);
  }

  const report = {
    total: rows.length,
    withBranch: rows.filter((r) => r.branch != null).length,
    nullBranch: stillNull.length,
    byType,
    undeterminable: {
      reading_note_bad_entity_id: nullByReason.reading_note_bad_entity_id.length,
      reading_note_missing_machine: nullByReason.reading_note_missing_machine.length,
      orphan_or_deleted_entity: nullByReason.orphan_entity.length,
      unknown_type: nullByReason.unknown_type.length,
      samples: {
        reading_note_bad_entity_id: nullByReason.reading_note_bad_entity_id.slice(0, 5).map((n) => ({
          id: n.id,
          entityId: n.entityId,
          linkUrl: n.linkUrl,
        })),
        reading_note_missing_machine: nullByReason.reading_note_missing_machine.slice(0, 5).map((n) => ({
          id: n.id,
          entityId: n.entityId,
        })),
        orphan_or_deleted_entity: nullByReason.orphan_entity.slice(0, 5).map((n) => ({
          id: n.id,
          type: n.type,
          entityType: n.entityType,
          entityId: n.entityId,
        })),
        unknown_type: nullByReason.unknown_type.slice(0, 5).map((n) => ({
          id: n.id,
          type: n.type,
          entityType: n.entityType,
        })),
      },
    },
  };

  console.log(JSON.stringify(report, null, 2));
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

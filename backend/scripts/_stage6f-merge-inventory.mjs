/**
 * Stage 6f: account consolidation DRY-RUN inventory (READ-ONLY).
 *
 * Reports, for each account pair, exactly what a merge would need to reassign
 * from the SOURCE (tag) account to the SURVIVOR account, plus any constraint
 * conflicts. It performs ZERO writes — safe to run against production.
 *
 * Compatible with production DBs that do NOT yet have Stage 6a UserBranchAccess:
 * only uses fields that exist on the current User model (id, email, name, role,
 * branch, modules) and the FK tables listed below.
 *
 * Usage (locally or via SSH on the server, from backend/):
 *   node scripts/_stage6f-merge-inventory.mjs
 *
 * Optionally emit machine-readable JSON as well:
 *   node scripts/_stage6f-merge-inventory.mjs --json
 */
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
const EMIT_JSON = process.argv.includes('--json');

/**
 * The three pairs. survivor = account we keep; source = tag account we merge in then delete.
 * Survivor is the one on the "real" (non-tagged) email.
 */
const PAIRS = [
  { label: 'craig',  survivorEmail: 'craig@pancom.co.za',  sourceEmail: 'craig+cpt@pancom.co.za' },
  { label: 'susana', survivorEmail: 'susana@pancom.co.za', sourceEmail: 'susana+cpt@pancom.co.za' },
  { label: 'wayne',  survivorEmail: 'wayne@pancom.co.za',  sourceEmail: 'wayne+jhb@pancom.co.za' },
];

/**
 * Every FK column that points at users.id, with the Prisma model accessor + field,
 * and the DB-level onDelete behaviour (why it matters for the merge order).
 */
const FK_TARGETS = [
  { table: 'readings',                          column: 'captured_by',                 onDelete: 'RESTRICT',  model: 'reading',                        field: 'capturedBy' },
  { table: 'readings',                          column: 'unable_to_read_override_by',  onDelete: 'SET NULL',  model: 'reading',                        field: 'unableToReadOverrideBy' },
  { table: 'submissions',                       column: 'submitted_by',                onDelete: 'RESTRICT',  model: 'submission',                     field: 'submittedBy' },
  { table: 'audit_logs',                        column: 'user_id',                     onDelete: 'CASCADE',   model: 'auditLog',                       field: 'userId' },
  { table: 'part_replacements',                 column: 'captured_by',                 onDelete: 'RESTRICT',  model: 'partReplacement',                field: 'capturedBy' },
  { table: 'notifications',                     column: 'user_id',                     onDelete: 'CASCADE',   model: 'notification',                   field: 'userId' },
  { table: 'installation_projects',             column: 'created_by',                  onDelete: 'RESTRICT',  model: 'installationProject',            field: 'createdById' },
  { table: 'installation_project_steps',        column: 'completed_by',                onDelete: 'SET NULL',  model: 'installationProjectStep',        field: 'completedById' },
  { table: 'installation_project_assignments',  column: 'user_id',                     onDelete: 'CASCADE',   model: 'installationProjectAssignment',  field: 'userId' },
  { table: 'fibre_orders',                      column: 'sales_agent_id',              onDelete: 'RESTRICT',  model: 'fibreOrder',                     field: 'salesAgentId' },
  { table: 'fibre_orders',                      column: 'created_by',                  onDelete: 'RESTRICT',  model: 'fibreOrder',                     field: 'createdById' },
  { table: 'order_updates',                     column: 'updated_by',                  onDelete: 'RESTRICT',  model: 'orderUpdate',                    field: 'updatedById' },
  { table: 'fibre_order_update_requests',       column: 'requested_by_id',             onDelete: 'CASCADE',   model: 'fibreOrderUpdateRequest',        field: 'requestedById' },
  { table: 'fibre_order_update_requests',       column: 'resolved_by_id',              onDelete: 'SET NULL',  model: 'fibreOrderUpdateRequest',        field: 'resolvedById' },
  { table: 'unable_to_obtain_override_requests', column: 'requested_by_id',            onDelete: 'CASCADE',   model: 'unableToObtainOverrideRequest',  field: 'requestedById' },
  { table: 'unable_to_obtain_override_requests', column: 'resolved_by_id',             onDelete: 'SET NULL',  model: 'unableToObtainOverrideRequest',  field: 'resolvedById' },
];

async function loadUser(email) {
  return p.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      branch: true,
      modules: true,
    },
  });
}

async function countFor(userId) {
  const rows = await Promise.all(
    FK_TARGETS.map(async (t) => ({
      ...t,
      count: await p[t.model].count({ where: { [t.field]: userId } }),
    })),
  );
  return rows;
}

/**
 * installation_project_assignments has @@unique([projectId, duty]).
 * If BOTH accounts are assigned to the same project+duty, reassigning source → survivor
 * would collide. Report those so they can be resolved manually before the merge.
 */
async function assignmentConflicts(sourceId, survivorId) {
  const [sourceRows, survivorRows] = await Promise.all([
    p.installationProjectAssignment.findMany({
      where: { userId: sourceId },
      select: { id: true, projectId: true, duty: true },
    }),
    p.installationProjectAssignment.findMany({
      where: { userId: survivorId },
      select: { id: true, projectId: true, duty: true },
    }),
  ]);
  const survivorKey = new Set(survivorRows.map((r) => `${r.projectId}::${r.duty}`));
  return sourceRows
    .filter((r) => survivorKey.has(`${r.projectId}::${r.duty}`))
    .map((r) => ({ projectId: r.projectId, duty: r.duty, sourceAssignmentId: r.id }));
}

function line(char = '─', n = 72) {
  return char.repeat(n);
}

async function reportPair(pair) {
  const survivor = await loadUser(pair.survivorEmail);
  const source = await loadUser(pair.sourceEmail);

  console.log('\n' + line('═'));
  console.log(`PAIR: ${pair.label}`);
  console.log(line('═'));

  if (!survivor || !source) {
    console.log('  ⚠️  MISSING ACCOUNT — cannot inventory this pair:');
    if (!survivor) console.log(`      survivor not found: ${pair.survivorEmail}`);
    if (!source) console.log(`      source not found:   ${pair.sourceEmail}`);
    return { pair: pair.label, error: 'missing_account', survivor: survivor ?? null, source: source ?? null };
  }

  console.log(`  SURVIVOR : ${survivor.name}  <${survivor.email}>`);
  console.log(`             id=${survivor.id}`);
  console.log(`             role=${survivor.role}  branch=${survivor.branch}  modules=[${(survivor.modules ?? []).join(', ')}]`);
  console.log(`  SOURCE   : ${source.name}  <${source.email}>`);
  console.log(`             id=${source.id}`);
  console.log(`             role=${source.role}  branch=${source.branch}  modules=[${(source.modules ?? []).join(', ')}]`);
  console.log('');

  const counts = await countFor(source.id);
  const total = counts.reduce((n, r) => n + r.count, 0);

  console.log('  Rows attributed to SOURCE that would move to SURVIVOR:');
  console.log('  ' + line('-', 70));
  console.log('  ' + 'table.column'.padEnd(46) + 'onDelete'.padEnd(10) + 'rows');
  console.log('  ' + line('-', 70));
  for (const r of counts) {
    const name = `${r.table}.${r.column}`;
    console.log('  ' + name.padEnd(46) + r.onDelete.padEnd(10) + String(r.count));
  }
  console.log('  ' + line('-', 70));
  console.log('  ' + 'TOTAL rows to reassign'.padEnd(56) + String(total));

  const conflicts = await assignmentConflicts(source.id, survivor.id);
  console.log('');
  if (conflicts.length === 0) {
    console.log('  ✅ No installation_project_assignments [projectId, duty] conflicts.');
  } else {
    console.log(`  ⛔ ${conflicts.length} installation_project_assignments CONFLICT(S) — same (project, duty) on both accounts:`);
    for (const c of conflicts) {
      console.log(`       project=${c.projectId}  duty=${c.duty}  (source assignment ${c.sourceAssignmentId} must be resolved/deleted, not blindly reassigned)`);
    }
  }

  // Derived only from users.branch (exists on prod today) — not UserBranchAccess.
  const unionBranches = [...new Set([survivor.branch, source.branch])].sort();
  console.log('');
  console.log(`  After merge, survivor should gain access to branches: [${unionBranches.join(', ')}] (from each account's home branch)`);
  console.log(`  RESTRICT columns are the ones that would BLOCK a source delete until reassigned.`);

  return {
    pair: pair.label,
    survivor: { id: survivor.id, email: survivor.email, branch: survivor.branch },
    source: { id: source.id, email: source.email, branch: source.branch },
    counts: counts.map(({ table, column, onDelete, count }) => ({ table, column, onDelete, count })),
    totalRowsToReassign: total,
    assignmentConflicts: conflicts,
    survivorBranchesAfterMerge: unionBranches,
  };
}

async function main() {
  console.log(line('═'));
  console.log('Stage 6f account consolidation — DRY RUN (read-only, no writes)');
  console.log(`Database URL host: ${(process.env.DATABASE_URL || '').replace(/\/\/[^@]*@/, '//***@')}`);
  console.log(line('═'));

  const results = [];
  for (const pair of PAIRS) {
    // sequential so console output stays grouped per pair
    // eslint-disable-next-line no-await-in-loop
    results.push(await reportPair(pair));
  }

  console.log('\n' + line('═'));
  console.log('GRAND SUMMARY');
  console.log(line('═'));
  for (const r of results) {
    if (r.error) {
      console.log(`  ${r.pair.padEnd(8)} ERROR: ${r.error}`);
      continue;
    }
    console.log(`  ${r.pair.padEnd(8)} rows=${String(r.totalRowsToReassign).padEnd(6)} conflicts=${r.assignmentConflicts.length}  → survivor branches [${r.survivorBranchesAfterMerge.join(', ')}]`);
  }
  console.log(line('═'));
  console.log('Reminder: this script made NO changes. Review counts before writing the merge migration.');

  if (EMIT_JSON) {
    console.log('\n--- JSON ---');
    console.log(JSON.stringify(results, null, 2));
  }

  await p.$disconnect();
}

main().catch(async (err) => {
  console.error('Dry-run failed:', err);
  await p.$disconnect();
  process.exit(1);
});

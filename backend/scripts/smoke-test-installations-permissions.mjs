/**
 * Installations permission-conversion smoke (manager CRUD, assignee status,
 * Owner catalog 68, module-filter proof with restore).
 *
 * Usage (from backend/, API on :3001):
 *   node scripts/smoke-test-installations-permissions.mjs
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const BASE = process.env.SMOKE_API_BASE || 'http://127.0.0.1:3001/api';
const prisma = new PrismaClient();

async function login(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`login ${email}: ${res.status} ${JSON.stringify(body)}`);
  return body;
}

async function api(token, method, path, body, branch = 'JHB') {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Active-Branch': branch,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  const pwd = 'localdev123';
  const hash = await bcrypt.hash(pwd, 12);
  await prisma.user.updateMany({
    where: { email: { in: ['manager@example.com', 'jessica@pancom.co.za', 'manager2@example.com'] } },
    data: { passwordHash: hash, twoFactorEnabled: false, twoFactorSecret: null },
  });

  // --- Manager full flow ---
  const mgr = await login('manager@example.com', pwd);
  assert(mgr.user.permissions.includes('installations.view'), 'manager missing view');
  assert(mgr.user.permissions.includes('installations.tasks.manage'), 'manager missing manage');
  console.log('manager perms install:', mgr.user.permissions.filter((p) => p.startsWith('installations.')));

  const types = await api(mgr.token, 'GET', '/installations/types');
  assert(types.status === 200, `types ${types.status}`);
  const typeId = types.data.types[0].id;

  const list = await api(mgr.token, 'GET', '/installations');
  assert(list.status === 200, `list ${list.status}`);

  const created = await api(mgr.token, 'POST', '/installations', {
    typeId,
    customerName: 'Perm Smoke Install',
    salesOrderNumber: '60569',
    status: 'active',
    progress: 'perm smoke',
  });
  assert(created.status === 201, `create ${created.status} ${JSON.stringify(created.data)}`);
  const installId = created.data.install.id;

  const upd = await api(mgr.token, 'PUT', `/installations/${installId}`, {
    progress: 'perm smoke edited',
    note: 'edit',
  });
  assert(upd.status === 200, `update ${upd.status}`);

  const task = await api(mgr.token, 'POST', `/installations/${installId}/tasks`, {
    title: 'Perm smoke task',
    assignedToId: mgr.user.id,
  });
  assert(task.status === 201, `task ${task.status}`);
  const taskId = task.data.task.id;

  // assign same task also to jessica for capturer test — create second task for jessica
  const jessica = await prisma.user.findUnique({ where: { email: 'jessica@pancom.co.za' } });
  const jTask = await api(mgr.token, 'POST', `/installations/${installId}/tasks`, {
    title: 'Jessica assignee task',
    assignedToId: jessica.id,
  });
  assert(jTask.status === 201, `jTask ${jTask.status}`);
  const jTaskId = jTask.data.task.id;

  const st = await api(mgr.token, 'PATCH', `/installations/${installId}/tasks/${taskId}/status`, {
    status: 'acknowledged',
  });
  assert(st.status === 200, `mgr status ${st.status}`);

  const roles = await api(mgr.token, 'GET', '/roles');
  assert(roles.status === 200, `roles ${roles.status}`);
  const owner = roles.data.roles.find((r) => r.key === 'owner');
  const ownerCount = owner?.permissionKeys?.length ?? owner?.permissionCount;
  console.log('owner permissionKeys length', ownerCount);
  assert(ownerCount === 68, `Owner permissionKeys ${ownerCount} !== 68`);

  const catalog = await api(mgr.token, 'GET', '/permissions/catalog');
  const flat = catalog.data.groups.flatMap((g) => g.keys);
  assert(flat.length === 68, `catalog keys ${flat.length}`);
  console.log('OK manager flow + catalog 68 + owner 68');

  // --- Capturer assignee ---
  const cap = await login('jessica@pancom.co.za', pwd);
  // Jessica home is CT — use CT branch
  const my = await api(cap.token, 'GET', '/installations/my-tasks', null, 'CT');
  // task was on JHB install — may be tenant filtered. Check branch of install
  const installBranch = created.data.install.branch;
  console.log('install branch', installBranch, 'jessica branches', cap.user.allowedBranches || cap.user.branch);
  const myJhb = await api(cap.token, 'GET', '/installations/my-tasks', null, 'JHB');
  console.log('jessica my-tasks JHB', myJhb.status, myJhb.data?.tasks?.length, 'CT', my.status, my.data?.tasks?.length);

  // If Jessica lacks JHB branch access, assign on a CT install or grant temp branch — check allowedBranches
  let assigneeToken = cap.token;
  let assigneeBranch = 'JHB';
  let assigneeTaskId = jTaskId;
  let assigneeInstallId = installId;

  if (myJhb.status === 403 || (myJhb.data?.tasks?.length ?? 0) === 0) {
    // create CT install + task for jessica using manager with CT if manager has CT
    const createdCt = await api(mgr.token, 'POST', '/installations', {
      typeId,
      customerName: 'Perm Smoke CT',
      salesOrderNumber: '60570',
      status: 'active',
      progress: 'ct smoke',
      branch: 'CT',
    }, 'CT');
    if (createdCt.status === 201) {
      assigneeInstallId = createdCt.data.install.id;
      const t = await api(mgr.token, 'POST', `/installations/${assigneeInstallId}/tasks`, {
        title: 'Jessica CT task',
        assignedToId: jessica.id,
      }, 'CT');
      assert(t.status === 201, `ct task ${t.status}`);
      assigneeTaskId = t.data.task.id;
      assigneeBranch = 'CT';
    } else {
      console.log('CT create failed', createdCt.status, createdCt.data);
    }
  }

  const my2 = await api(assigneeToken, 'GET', '/installations/my-tasks', null, assigneeBranch);
  assert(my2.status === 200, `my-tasks ${my2.status}`);
  assert((my2.data.tasks?.length ?? 0) >= 1, 'jessica should see assigned task');

  const denyList = await api(assigneeToken, 'GET', '/installations', null, assigneeBranch);
  assert(denyList.status === 403, `capturer list should 403 got ${denyList.status}`);

  const ack = await api(
    assigneeToken,
    'PATCH',
    `/installations/${assigneeInstallId}/tasks/${assigneeTaskId}/status`,
    { status: 'acknowledged' },
    assigneeBranch
  );
  assert(ack.status === 200, `jessica ack ${ack.status} ${JSON.stringify(ack.data)}`);
  console.log('OK capturer my-tasks + status + list denied');

  // --- Module filter proof on disposable manager2 ---
  const m2before = await prisma.user.findUnique({
    where: { email: 'manager2@example.com' },
    select: { id: true, modules: true },
  });
  console.log('manager2 BEFORE modules', m2before.modules);
  const stripped = (m2before.modules || []).filter((m) => m !== 'installations');
  await prisma.user.update({
    where: { id: m2before.id },
    data: { modules: stripped },
  });

  const m2 = await login('manager2@example.com', pwd);
  assert(!m2.user.permissions.includes('installations.view'), 'stripped manager2 should lack view');
  assert(m2.user.permissions.includes('installations.tasks.view_own'), 'assignee keys remain module-free');
  const denied = await api(m2.token, 'GET', '/installations');
  assert(denied.status === 403, `module-stripped list should 403 got ${denied.status}`);

  // restore
  await prisma.user.update({
    where: { id: m2before.id },
    data: { modules: m2before.modules },
  });
  const m2restored = await login('manager2@example.com', pwd);
  assert(m2restored.user.permissions.includes('installations.view'), 'restored manager2 should have view');
  const allowed = await api(m2restored.token, 'GET', '/installations');
  assert(allowed.status === 200, `restored list ${allowed.status}`);
  const m2after = await prisma.user.findUnique({
    where: { email: 'manager2@example.com' },
    select: { modules: true },
  });
  console.log('manager2 AFTER restore modules', m2after.modules);
  assert(JSON.stringify(m2after.modules) === JSON.stringify(m2before.modules), 'modules not fully restored');
  console.log('OK module-filter proof + restore');

  // cleanup smoke installs
  for (const id of [installId, assigneeInstallId].filter(Boolean)) {
    await api(mgr.token, 'PUT', `/installations/${id}`, { status: 'cancelled', progress: 'cleanup' }, 
      id === assigneeInstallId ? assigneeBranch : 'JHB');
  }

  console.log('SMOKE_ALL_OK');
}

main()
  .catch((e) => {
    console.error('SMOKE_FAIL', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

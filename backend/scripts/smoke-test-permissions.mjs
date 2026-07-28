/**
 * Stage D permission smoke harness.
 * Mints JWTs for real DB users (prod-like accounts have 2FA — password login alone can't finish).
 *
 * Prefer no durable writes where possible (e.g. invalid POST body → 400 not 403;
 * PATCH note rewrites the same note). Some allow routes may still create check results.
 *
 * Usage:
 *   node scripts/smoke-test-permissions.mjs
 *   SMOKE_DOMAIN=connectivity node scripts/smoke-test-permissions.mjs
 *   SMOKE_DOMAIN=fibre_orders node scripts/smoke-test-permissions.mjs
 */

import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

// =============================================================================
// Domain configs — add fibre_orders / copiers / readings here for later Stage D
// =============================================================================

/** @typedef {{ name: string, method?: string, path?: string, body?: unknown, expect?: number[], skip?: string }} SmokeCase */

const DOMAIN_CONFIGS = {
  connectivity: {
    title: 'Connectivity permission smoke',
    /** Module grant that identifies ALLOW users */
    allowModule: 'connectivity',
    /**
     * Load shared fixtures once (first allow user + branch).
     * @param {{ request: Function, mintToken: Function, probe: object, branch: string }} ctx
     */
    async loadFixtures(ctx) {
      const { request, mintToken, probe, branch } = ctx;
      const token0 = mintToken(probe);

      const targetsRes = await request('GET', '/connectivity/targets', {
        token: token0,
        branch,
      });
      const targets = targetsRes.data?.targets ?? targetsRes.data ?? [];
      const targetList = Array.isArray(targets) ? targets : [];
      const targetId = targetList[0]?.id ?? null;

      const outagesRes = await request('GET', '/connectivity/outages', {
        token: token0,
        branch,
      });
      const outages = outagesRes.data?.outages ?? [];
      const openOutage = outages.find((o) => o.endedAt == null) ?? null;

      const today = new Date();
      const end = today.toISOString().slice(0, 10);
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 7);
      const start = startDate.toISOString().slice(0, 10);

      return { targetId, openOutage, start, end };
    },
    /**
     * @param {{ user: object, branch: string, fixtures: object }} ctx
     * @returns {SmokeCase[]}
     */
    buildAllowCases({ user, branch, fixtures }) {
      const b = user.branchAccess?.[0]?.branch || user.branch || branch;
      const tid = b === branch ? fixtures.targetId : null;
      const oid = b === branch ? fixtures.openOutage : null;
      const { start, end } = fixtures;

      return [
        { name: 'GET /dashboard', method: 'GET', path: '/connectivity/dashboard', expect: [200] },
        { name: 'GET /summary', method: 'GET', path: '/connectivity/summary', expect: [200] },
        { name: 'GET /targets', method: 'GET', path: '/connectivity/targets', expect: [200] },
        tid
          ? {
              name: 'GET /targets/:id',
              method: 'GET',
              path: `/connectivity/targets/${tid}`,
              expect: [200],
            }
          : { name: 'GET /targets/:id', skip: 'no target in branch' },
        tid
          ? {
              name: 'POST /targets/:id/check',
              method: 'POST',
              path: `/connectivity/targets/${tid}/check`,
              expect: [200],
            }
          : { name: 'POST /targets/:id/check', skip: 'no target in branch' },
        {
          name: 'GET /time-windows',
          method: 'GET',
          path: '/connectivity/time-windows',
          expect: [200],
        },
        {
          name: 'POST /time-windows (invalid body → 400 not 403)',
          method: 'POST',
          path: '/connectivity/time-windows',
          body: {},
          expect: [400],
        },
        {
          name: 'GET /reports/uptime',
          method: 'GET',
          path: `/connectivity/reports/uptime?startDate=${start}&endDate=${end}`,
          expect: [200],
        },
        {
          name: 'GET /reports/sla',
          method: 'GET',
          path: `/connectivity/reports/sla?startDate=${start}&endDate=${end}`,
          expect: [200],
        },
        {
          name: 'GET /reports/export',
          method: 'GET',
          path: `/connectivity/reports/export?startDate=${start}&endDate=${end}&format=csv`,
          expect: [200],
        },
        { name: 'GET /outages', method: 'GET', path: '/connectivity/outages', expect: [200] },
        oid
          ? {
              name: 'PATCH /outages/:id/note (same note)',
              method: 'PATCH',
              path: `/connectivity/outages/${oid.id}/note`,
              body: { note: oid.note ?? '' },
              expect: [200],
            }
          : { name: 'PATCH /outages/:id/note', skip: 'no open outage' },
      ];
    },
    /** @returns {SmokeCase[]} */
    buildDenyCases() {
      return [
        {
          name: 'GET /dashboard (expect 403)',
          method: 'GET',
          path: '/connectivity/dashboard',
          expect: [403],
        },
        {
          name: 'GET /targets (expect 403)',
          method: 'GET',
          path: '/connectivity/targets',
          expect: [403],
        },
        {
          name: 'GET /outages (expect 403)',
          method: 'GET',
          path: '/connectivity/outages',
          expect: [403],
        },
      ];
    },
    formatFixtures(fixtures) {
      return `targetId=${fixtures.targetId || '(none)'} openOutage=${fixtures.openOutage?.id || '(none)'}`;
    },
  },

  fibre_orders: {
    title: 'Fibre orders permission smoke',
    allowModule: 'fibre-orders',
    /**
     * Elevated = admin|manager (matches requireAdmin). Module-only = fibre-orders
     * without elevated role (e.g. sales_agent).
     */
    async loadFixtures(ctx) {
      const { request, mintToken, probe, branch } = ctx;
      const token0 = mintToken(probe);

      const ordersRes = await request('GET', '/fibre-orders', { token: token0, branch });
      const orders = ordersRes.data?.orders ?? [];
      const orderId = Array.isArray(orders) && orders[0]?.id ? orders[0].id : null;

      const productsRes = await request('GET', '/fibre-products', { token: token0, branch });
      const products = productsRes.data?.products ?? [];
      const productId = Array.isArray(products) && products[0]?.id ? products[0].id : null;

      // Per sales-agent order so module-only GET /:id is 200 (not agent-scope 404)
      const db = new PrismaClient();
      let orderIdByEmail = {};
      try {
        const agents = await db.user.findMany({
          where: { role: 'sales_agent', modules: { has: 'fibre-orders' } },
          select: { id: true, email: true },
        });
        for (const a of agents) {
          const own = await db.fibreOrder.findFirst({
            where: { salesAgentId: a.id, branch },
            select: { id: true },
            orderBy: { updatedAt: 'desc' },
          });
          orderIdByEmail[a.email] = own?.id ?? null;
        }
      } finally {
        await db.$disconnect();
      }

      return { orderId, productId, orderIdByEmail };
    },
    buildAllowCases({ user, branch, fixtures }) {
      const elevated = user.role === 'admin' || user.role === 'manager';
      const orderId = elevated
        ? fixtures.orderId
        : fixtures.orderIdByEmail?.[user.email] || null;
      const productId = fixtures.productId;

      /** Elevated write: invalid body → 400 (auth passed). Module-only → 403. */
      const elevatedWrite = (name, method, path, body) => ({
        name: elevated
          ? `${name} (elevated → 400 not 403, no durable write)`
          : `${name} (module-only → 403)`,
        method,
        path,
        body,
        expect: elevated ? [400] : [403],
      });

      const cases = [
        {
          name: 'GET /fibre-orders/stats',
          method: 'GET',
          path: '/fibre-orders/stats',
          expect: [200],
        },
        {
          name: elevated
            ? 'GET /fibre-orders/update-requests (elevated → 200)'
            : 'GET /fibre-orders/update-requests (module-only → 403)',
          method: 'GET',
          path: '/fibre-orders/update-requests',
          expect: elevated ? [200] : [403],
        },
        {
          name: 'GET /fibre-orders',
          method: 'GET',
          path: '/fibre-orders',
          expect: [200],
        },
      ];

      if (orderId) {
        cases.push(
          {
            name: 'GET /fibre-orders/:id/updates',
            method: 'GET',
            path: `/fibre-orders/${orderId}/updates`,
            expect: [200],
          },
          {
            name: 'GET /fibre-orders/:id',
            method: 'GET',
            path: `/fibre-orders/${orderId}`,
            expect: [200],
          }
        );
      } else {
        cases.push(
          { name: 'GET /fibre-orders/:id/updates', skip: 'no order fixture for user/branch' },
          { name: 'GET /fibre-orders/:id', skip: 'no order fixture for user/branch' }
        );
      }

      cases.push(
        elevatedWrite('POST /fibre-orders', 'POST', '/fibre-orders', {}),
      );

      if (orderId) {
        // note > 500 chars → validation 400 after permission (avoids creating update-request)
        const longNote = 'x'.repeat(501);
        cases.push({
          name: 'POST /fibre-orders/:id/request-update (invalid note → 400 not 403)',
          method: 'POST',
          path: `/fibre-orders/${orderId}/request-update`,
          body: { note: longNote },
          expect: [400],
        });
        cases.push(
          elevatedWrite(
            'PUT /fibre-orders/:id',
            'PUT',
            `/fibre-orders/${orderId}`,
            { pipelineStatus: '__invalid__' }
          ),
          elevatedWrite(
            'POST /fibre-orders/:id/notes',
            'POST',
            `/fibre-orders/${orderId}/notes`,
            {}
          )
        );
      } else {
        cases.push(
          { name: 'POST /fibre-orders/:id/request-update', skip: 'no order fixture' },
          { name: 'PUT /fibre-orders/:id', skip: 'no order fixture' },
          { name: 'POST /fibre-orders/:id/notes', skip: 'no order fixture' }
        );
      }

      cases.push(
        {
          name: 'GET /fibre-products',
          method: 'GET',
          path: '/fibre-products',
          expect: [200],
        },
        productId
          ? {
              name: 'GET /fibre-products/:id',
              method: 'GET',
              path: `/fibre-products/${productId}`,
              expect: [200],
            }
          : { name: 'GET /fibre-products/:id', skip: 'no product fixture' },
        elevatedWrite('POST /fibre-products', 'POST', '/fibre-products', {}),
        productId
          ? elevatedWrite(
              'PUT /fibre-products/:id',
              'PUT',
              `/fibre-products/${productId}`,
              { name: '' }
            )
          : { name: 'PUT /fibre-products/:id', skip: 'no product fixture' },
        {
          name: 'DELETE /fibre-products/:id',
          skip: 'skipped — do not delete a real product',
        }
      );

      return cases;
    },
    buildDenyCases() {
      return [
        {
          name: 'GET /fibre-orders (expect 403)',
          method: 'GET',
          path: '/fibre-orders',
          expect: [403],
        },
        {
          name: 'GET /fibre-products (expect 403)',
          method: 'GET',
          path: '/fibre-products',
          expect: [403],
        },
        {
          name: 'GET /fibre-orders/stats (expect 403)',
          method: 'GET',
          path: '/fibre-orders/stats',
          expect: [403],
        },
      ];
    },
    formatFixtures(fixtures) {
      const agents = Object.entries(fixtures.orderIdByEmail || {})
        .map(([email, id]) => `${email}:${id || 'none'}`)
        .join(', ');
      return `orderId=${fixtures.orderId || '(none)'} productId=${fixtures.productId || '(none)'} agentOrders=[${agents}]`;
    },
  },

  // copiers: { ... },
  // readings: { ... },
};

const ACTIVE_DOMAIN = process.env.SMOKE_DOMAIN || 'connectivity';

// =============================================================================
// Reusable harness
// =============================================================================

const BASE = process.env.SMOKE_API_BASE || 'http://localhost:3001/api';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const prisma = new PrismaClient();

function mintToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '30m' }
  );
}

async function request(method, path, { token, branch, body } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (branch) headers['X-Active-Branch'] = branch;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text?.slice?.(0, 120) ?? null;
  }
  return { status: res.status, data };
}

function okStatus(status, allowed) {
  return allowed.includes(status);
}

async function main() {
  const domain = DOMAIN_CONFIGS[ACTIVE_DOMAIN];
  if (!domain) {
    console.error(
      `Unknown SMOKE_DOMAIN="${ACTIVE_DOMAIN}". Known: ${Object.keys(DOMAIN_CONFIGS).join(', ')}`
    );
    process.exit(2);
  }

  const health = await fetch(`${BASE}/health`).catch(() => null);
  if (!health?.ok) {
    console.error(`Backend not reachable at ${BASE}/health — start it first.`);
    process.exit(2);
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      modules: true,
      branch: true,
      twoFactorEnabled: true,
      branchAccess: { select: { branch: true } },
    },
    orderBy: { email: 'asc' },
  });

  const allowUsers = users.filter((u) =>
    (u.modules || []).includes(domain.allowModule)
  );
  const denyPool = users.filter(
    (u) => !(u.modules || []).includes(domain.allowModule)
  );

  console.log(`\n=== ${domain.title} ===\n`);
  console.log(`Users WITH ${domain.allowModule} (${allowUsers.length}):`);
  for (const u of allowUsers) {
    console.log(
      `  - ${u.email} (${u.role}) modules=[${u.modules}] 2FA=${u.twoFactorEnabled}`
    );
  }
  const denyUser =
    denyPool.find((u) => !u.twoFactorEnabled) || denyPool[0] || null;
  if (denyUser) {
    console.log(
      `\nUser WITHOUT ${domain.allowModule} (deny probe): ${denyUser.email} (${denyUser.role})`
    );
  } else {
    console.log(`\nNo user without ${domain.allowModule} found — skipping deny probe.`);
  }

  const probe = allowUsers[0];
  if (!probe) {
    console.error(`No ${domain.allowModule} users in DB.`);
    process.exit(1);
  }
  const branch = probe.branchAccess?.[0]?.branch || probe.branch || 'JHB';

  const fixtures = await domain.loadFixtures({
    request,
    mintToken,
    probe,
    branch,
  });

  console.log(
    `\nFixtures: branch=${branch} ${domain.formatFixtures?.(fixtures) ?? JSON.stringify(fixtures)}`
  );
  console.log(
    'Auth: JWT minted with JWT_SECRET (real pancom users have 2FA; session token matches login payload).\n'
  );

  const results = [];

  async function runCase(user, label, cases) {
    const token = mintToken(user);
    const userBranch = user.branchAccess?.[0]?.branch || user.branch || branch;
    for (const c of cases) {
      if (c.skip) {
        results.push({
          user: user.email,
          label,
          route: c.name,
          status: 'SKIP',
          pass: true,
          detail: c.skip,
        });
        continue;
      }
      const res = await request(c.method, c.path, {
        token,
        branch: userBranch,
        body: c.body,
      });
      const pass = okStatus(res.status, c.expect);
      results.push({
        user: user.email,
        label,
        route: c.name,
        status: res.status,
        pass,
        detail: pass
          ? ''
          : `expected ${c.expect.join('|')}, body=${JSON.stringify(res.data)?.slice(0, 160)}`,
      });
    }
  }

  for (const u of allowUsers) {
    await runCase(
      u,
      'ALLOW',
      domain.buildAllowCases({ user: u, branch, fixtures })
    );
  }

  if (denyUser) {
    await runCase(denyUser, 'DENY', domain.buildDenyCases());
  }

  console.log('--- Results ---\n');
  let passN = 0;
  let failN = 0;
  let skipN = 0;
  for (const r of results) {
    const tag = r.status === 'SKIP' ? 'SKIP' : r.pass ? 'PASS' : 'FAIL';
    if (tag === 'PASS') passN += 1;
    else if (tag === 'FAIL') failN += 1;
    else skipN += 1;
    const st = r.status === 'SKIP' ? '' : ` → ${r.status}`;
    console.log(
      `[${tag}] ${r.label} ${r.user} | ${r.route}${st}${r.detail ? ` | ${r.detail}` : ''}`
    );
  }
  console.log(
    `\nSummary: ${passN} pass, ${failN} fail, ${skipN} skip (of ${results.length})`
  );
  await prisma.$disconnect();
  process.exit(failN > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});

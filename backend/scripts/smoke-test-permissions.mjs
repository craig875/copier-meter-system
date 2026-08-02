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
 *   SMOKE_DOMAIN=copiers node scripts/smoke-test-permissions.mjs
 *   SMOKE_GET_ONLY=1 SMOKE_DOMAIN=connectivity node scripts/smoke-test-permissions.mjs
 *   SMOKE_REQUEST_DELAY_MS=500  # optional pacing (useful under prod 120/min rate limit)
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

  copiers: {
    title: 'Copiers + readings/UTO permission smoke',
    allowModule: 'copiers',
    /**
     * Five tiers (legacy middleware ∩ effective permission keys):
     * 1. module-only (capturer): readings/makes/machines view; blocked from customers/consumables/machine mutate
     * 2. meterUserOrAdmin (admin|manager|meter_user): machine create/update/decommission/recommission
     * 3. meterOrAdmin (same set): customer archive
     * 4. admin (admin|manager): elevated CRUD / import / unlock / uto_request
     * 5. strictAdmin (role==='admin' only — Craig): uto_list_blocked / uto_force_override
     */
    async loadFixtures(ctx) {
      const { request, mintToken, probe, branch } = ctx;
      const token0 = mintToken(probe);
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const db = new PrismaClient();
      const machineByBranch = {};
      const customerByBranch = {};
      const modelPartByBranch = {};
      let makeId = null;
      let modelId = null;
      try {
        for (const b of ['JHB', 'CT']) {
          const m = await db.machine.findFirst({
            where: { branch: b, isDecommissioned: false },
            select: { id: true },
            orderBy: { updatedAt: 'desc' },
          });
          machineByBranch[b] = m?.id ?? null;
          const c = await db.customer.findFirst({
            where: { branch: b },
            select: { id: true, isArchived: true },
            orderBy: { updatedAt: 'desc' },
          });
          customerByBranch[b] = c ? { id: c.id, isArchived: !!c.isArchived } : null;
          const mp = await db.modelPart.findFirst({
            where: { branch: b, isActive: true },
            select: { id: true },
            orderBy: { updatedAt: 'desc' },
          });
          modelPartByBranch[b] = mp?.id ?? null;
        }
        const mk = await db.make.findFirst({ select: { id: true }, orderBy: { name: 'asc' } });
        makeId = mk?.id ?? null;
        const md = await db.model.findFirst({ select: { id: true }, orderBy: { name: 'asc' } });
        modelId = md?.id ?? null;
      } finally {
        await db.$disconnect();
      }

      // Sanity: probe can list machines in fixture branch (permission path warm-up)
      await request('GET', '/machines?limit=1', { token: token0, branch });

      return {
        machineByBranch,
        customerByBranch,
        modelPartByBranch,
        makeId,
        modelId,
        year,
        month,
        /** Nonexistent UUID — 404 after auth (no durable decommission/recommission) */
        fakeMachineId: '00000000-0000-4000-8000-000000000099',
      };
    },
    buildAllowCases({ user, fixtures }) {
      const role = user.role;
      const strictAdmin = role === 'admin';
      const adminTier = role === 'admin' || role === 'manager';
      const meterUserOrAdmin = adminTier || role === 'meter_user';
      const meterOrAdmin = meterUserOrAdmin; // same role set as requireMeterOrAdmin
      const canReadings = meterUserOrAdmin || role === 'capturer';
      // capturer: readings + machines.view (legacy capture flow); not customers/consumables/mutate
      const canMachinesView = meterUserOrAdmin || role === 'capturer';
      const canCustomers = meterUserOrAdmin;
      const canConsumables = meterUserOrAdmin;

      const userBranch = user.branchAccess?.[0]?.branch || user.branch || 'JHB';
      const machineId = fixtures.machineByBranch?.[userBranch] ?? null;
      const customer = fixtures.customerByBranch?.[userBranch] ?? null;
      const modelPartId = fixtures.modelPartByBranch?.[userBranch] ?? null;
      const { makeId, year, month, fakeMachineId } = fixtures;
      const ym = `year=${year}&month=${month}`;

      /** Allowed → expectOk (usually 400, no durable write); denied → 403 */
      const tierWrite = (allowed, name, method, path, body, expectOk = [400]) => ({
        name: allowed
          ? `${name} (tier → ${expectOk.join('|')} not 403)`
          : `${name} (denied → 403)`,
        method,
        path,
        body,
        expect: allowed ? expectOk : [403],
      });

      const tierGet = (allowed, name, path, expectOk = [200]) => ({
        name: allowed ? name : `${name} (denied → 403)`,
        method: 'GET',
        path,
        expect: allowed ? expectOk : [403],
      });

      const cases = [
        // ----- MACHINES -----
        tierGet(canMachinesView, 'GET /machines', '/machines?limit=5'),
        machineId
          ? tierGet(canMachinesView, 'GET /machines/:id', `/machines/${machineId}`)
          : { name: 'GET /machines/:id', skip: `no machine fixture for ${userBranch}` },
        tierWrite(
          meterUserOrAdmin,
          'POST /machines',
          'POST',
          '/machines',
          {}
        ),
        machineId
          ? tierWrite(
              meterUserOrAdmin,
              'PUT /machines/:id',
              'PUT',
              `/machines/${machineId}`,
              { machineSerialNumber: '' }
            )
          : { name: 'PUT /machines/:id', skip: `no machine fixture for ${userBranch}` },
        // Real decommission avoided — nonexistent id → 404 after gate
        tierWrite(
          meterUserOrAdmin,
          'POST /machines/:id/decommission',
          'POST',
          `/machines/${fakeMachineId}/decommission`,
          undefined,
          [404]
        ),
        tierWrite(
          meterUserOrAdmin,
          'POST /machines/:id/recommission',
          'POST',
          `/machines/${fakeMachineId}/recommission`,
          undefined,
          [404]
        ),
        tierWrite(adminTier, 'POST /machines/import', 'POST', '/machines/import', {
          data: [],
        }),
        {
          name: 'DELETE /machines/:id',
          skip: 'skipped — do not delete a real machine',
        },

        // ----- CUSTOMERS -----
        tierGet(canCustomers, 'GET /customers', '/customers'),
        customer
          ? tierGet(canCustomers, 'GET /customers/:id', `/customers/${customer.id}`)
          : { name: 'GET /customers/:id', skip: `no customer fixture for ${userBranch}` },
        tierWrite(adminTier, 'POST /customers', 'POST', '/customers', {}),
        customer
          ? tierWrite(
              adminTier,
              'PUT /customers/:id',
              'PUT',
              `/customers/${customer.id}`,
              { name: '' }
            )
          : { name: 'PUT /customers/:id', skip: `no customer fixture for ${userBranch}` },
        customer
          ? {
              // Idempotent same-state write (flagged: real PATCH, same isArchived value)
              name: meterOrAdmin
                ? 'PATCH /customers/:id/archive (same isArchived — real write, idempotent)'
                : 'PATCH /customers/:id/archive (denied → 403)',
              method: 'PATCH',
              path: `/customers/${customer.id}/archive`,
              body: { isArchived: customer.isArchived },
              expect: meterOrAdmin ? [200] : [403],
            }
          : { name: 'PATCH /customers/:id/archive', skip: `no customer fixture for ${userBranch}` },
        {
          name: 'DELETE /customers/:id',
          skip: 'skipped — do not delete a real customer',
        },
        tierWrite(adminTier, 'POST /customers/import', 'POST', '/customers/import', {
          data: [],
        }),

        // ----- CONSUMABLES -----
        tierGet(canReadings, 'GET /consumables/toner-alerts', '/consumables/toner-alerts'),
        tierGet(canConsumables, 'GET /consumables/model-parts', '/consumables/model-parts'),
        modelPartId
          ? tierGet(
              adminTier,
              'GET /consumables/model-parts/:id',
              `/consumables/model-parts/${modelPartId}`
            )
          : { name: 'GET /consumables/model-parts/:id', skip: 'no modelPart fixture' },
        tierGet(canConsumables, 'GET /consumables/summary', '/consumables/summary'),
        machineId
          ? tierGet(
              canConsumables,
              'GET /consumables/machines/:machineId/history',
              `/consumables/machines/${machineId}/history`
            )
          : {
              name: 'GET /consumables/machines/:machineId/history',
              skip: `no machine fixture for ${userBranch}`,
            },
        tierWrite(canConsumables, 'POST /consumables/orders', 'POST', '/consumables/orders', {}),
        tierWrite(
          adminTier,
          'POST /consumables/model-parts',
          'POST',
          '/consumables/model-parts',
          {}
        ),
        modelPartId
          ? tierWrite(
              adminTier,
              'PUT /consumables/model-parts/:id',
              'PUT',
              `/consumables/model-parts/${modelPartId}`,
              { partName: '' }
            )
          : { name: 'PUT /consumables/model-parts/:id', skip: 'no modelPart fixture' },
        {
          name: 'DELETE consumable routes',
          skip: 'skipped — do not delete model-parts/orders',
        },

        // ----- MAKES / MODELS -----
        // GET requires only auth + copiers.access (all copiers allow roles have it)
        { name: 'GET /makes', method: 'GET', path: '/makes', expect: [200] },
        { name: 'GET /models', method: 'GET', path: '/models', expect: [200] },
        tierWrite(adminTier, 'POST /makes', 'POST', '/makes', {}),
        makeId
          ? tierWrite(adminTier, 'PUT /makes/:id', 'PUT', `/makes/${makeId}`, { name: '' })
          : { name: 'PUT /makes/:id', skip: 'no make fixture' },
        {
          name: 'DELETE /makes|models',
          skip: 'skipped — do not delete catalog rows',
        },

        // ----- READINGS / UTO -----
        tierGet(canReadings, 'GET /readings', `/readings?${ym}`),
        tierWrite(canReadings, 'POST /readings', 'POST', '/readings', {}),
        // Missing query → 400 after permission (export locks month if called with valid ym)
        tierWrite(
          canReadings,
          'GET /readings/export (no query → 400, avoids month lock)',
          'GET',
          '/readings/export',
          undefined,
          [400]
        ),
        // Hard tenancy disables cross-branch split views for everyone (not a permission gate)
        {
          name: 'GET /readings/split-by-branch',
          skip: 'hard tenancy — Cross-branch reading views are disabled (403 for all)',
        },
        machineId
          ? tierGet(
              canReadings,
              'GET /readings/history/:machineId',
              `/readings/history/${machineId}`
            )
          : {
              name: 'GET /readings/history/:machineId',
              skip: `no machine fixture for ${userBranch}`,
            },
        // unlock reads query; omit year/month → 400 (no real unlock)
        {
          name: adminTier
            ? 'POST /readings/unlock (no query → 400 not 403)'
            : 'POST /readings/unlock (denied → 403)',
          method: 'POST',
          path: '/readings/unlock',
          expect: adminTier ? [400] : [403],
        },
        {
          name: strictAdmin
            ? 'GET /readings/unable-to-obtain-blocked (strictAdmin → 200)'
            : 'GET /readings/unable-to-obtain-blocked (non-strict → 403)',
          method: 'GET',
          path: `/readings/unable-to-obtain-blocked?${ym}`,
          expect: strictAdmin ? [200] : [403],
        },
        {
          name: strictAdmin
            ? 'POST /readings/unable-to-obtain-override (strictAdmin → 400 not 403)'
            : 'POST /readings/unable-to-obtain-override (non-strict → 403)',
          method: 'POST',
          path: '/readings/unable-to-obtain-override',
          body: {},
          expect: strictAdmin ? [400] : [403],
        },
        tierWrite(
          adminTier,
          'POST /readings/unable-to-obtain-override-request',
          'POST',
          '/readings/unable-to-obtain-override-request',
          {}
        ),
      ];

      return cases;
    },
    buildDenyCases() {
      const now = new Date();
      const ym = `year=${now.getFullYear()}&month=${now.getMonth() + 1}`;
      return [
        {
          name: 'GET /machines (expect 403)',
          method: 'GET',
          path: '/machines',
          expect: [403],
        },
        {
          name: 'GET /customers (expect 403)',
          method: 'GET',
          path: '/customers',
          expect: [403],
        },
        {
          name: 'GET /readings (expect 403)',
          method: 'GET',
          path: `/readings?${ym}`,
          expect: [403],
        },
      ];
    },
    formatFixtures(fixtures) {
      return (
        `machines JHB=${fixtures.machineByBranch?.JHB || '(none)'} CT=${fixtures.machineByBranch?.CT || '(none)'} ` +
        `customers JHB=${fixtures.customerByBranch?.JHB?.id || '(none)'} CT=${fixtures.customerByBranch?.CT?.id || '(none)'} ` +
        `modelParts JHB=${fixtures.modelPartByBranch?.JHB || '(none)'} CT=${fixtures.modelPartByBranch?.CT || '(none)'} ` +
        `make=${fixtures.makeId || '(none)'} ym=${fixtures.year}-${fixtures.month}`
      );
    },
  },
};

const ACTIVE_DOMAIN = process.env.SMOKE_DOMAIN || 'connectivity';
/** When '1'/'true': skip every non-GET case (no POST/PUT/PATCH/DELETE against the target). */
const GET_ONLY =
  process.env.SMOKE_GET_ONLY === '1' || process.env.SMOKE_GET_ONLY === 'true';
const REQUEST_DELAY_MS = Number(process.env.SMOKE_REQUEST_DELAY_MS || 0) || 0;

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

/** @param {SmokeCase[]} cases */
function applyGetOnlyFilter(cases) {
  if (!GET_ONLY) return cases;
  return cases.map((c) => {
    if (c.skip) return c;
    const method = String(c.method || 'GET').toUpperCase();
    if (method === 'GET') return c;
    return {
      ...c,
      skip: `SMOKE_GET_ONLY — skipped ${method} (read-only probe)`,
    };
  });
}

/** Per-request abort (ms). Override with SMOKE_FETCH_TIMEOUT_MS. Default 90s. */
const FETCH_TIMEOUT_MS =
  Number(process.env.SMOKE_FETCH_TIMEOUT_MS || 90000) || 90000;

async function request(method, path, { token, branch, body } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (branch) headers['X-Active-Branch'] = branch;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: ac.signal,
    });
    let data = null;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text?.slice?.(0, 120) ?? null;
    }
    return { status: res.status, data, ms: Date.now() - t0 };
  } catch (e) {
    if (e?.name === 'AbortError') {
      return {
        status: 0,
        data: { error: `fetch aborted after ${FETCH_TIMEOUT_MS}ms` },
        ms: Date.now() - t0,
      };
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function okStatus(status, allowed) {
  return allowed.includes(status);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const domain = DOMAIN_CONFIGS[ACTIVE_DOMAIN];
  if (!domain) {
    console.error(
      `Unknown SMOKE_DOMAIN="${ACTIVE_DOMAIN}". Known: ${Object.keys(DOMAIN_CONFIGS).join(', ')}`
    );
    process.exit(2);
  }

  if (!process.env.JWT_SECRET) {
    console.error(
      'JWT_SECRET is not set in the environment (would mint with fallback-secret-key). Aborting.'
    );
    process.exit(2);
  }
  if (JWT_SECRET === 'fallback-secret-key') {
    console.error('JWT_SECRET resolved to fallback — aborting.');
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
  console.log(`SMOKE_API_BASE=${BASE}`);
  console.log(
    `SMOKE_GET_ONLY=${GET_ONLY}  SMOKE_REQUEST_DELAY_MS=${REQUEST_DELAY_MS}  SMOKE_FETCH_TIMEOUT_MS=${FETCH_TIMEOUT_MS}`
  );
  console.log(
    `JWT_SECRET: set from env (length=${JWT_SECRET.length}, prefix=${JWT_SECRET.slice(0, 4)}…)`
  );
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
  let mutatingAttempted = 0;

  async function runCase(user, label, cases) {
    const token = mintToken(user);
    const userBranch = user.branchAccess?.[0]?.branch || user.branch || branch;
    for (const c of applyGetOnlyFilter(cases)) {
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
      const method = String(c.method || 'GET').toUpperCase();
      if (method !== 'GET') {
        mutatingAttempted += 1;
      }
      if (REQUEST_DELAY_MS > 0) await sleep(REQUEST_DELAY_MS);
      process.stdout.write(
        `… ${label} ${user.email} | ${c.name} (${method} ${c.path}) … `
      );
      const res = await request(c.method, c.path, {
        token,
        branch: userBranch,
        body: c.body,
      });
      const pass =
        res.status === 0 ? false : okStatus(res.status, c.expect);
      const tag = pass ? 'PASS' : 'FAIL';
      console.log(
        `${tag} ${res.status}${res.ms != null ? ` ${res.ms}ms` : ''}`
      );
      results.push({
        user: user.email,
        label,
        route: c.name,
        status: res.status === 0 ? 'TIMEOUT' : res.status,
        pass,
        detail: pass
          ? ''
          : res.status === 0
            ? res.data?.error || 'fetch timeout'
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
    const tag =
      r.status === 'SKIP' ? 'SKIP' : r.status === 'TIMEOUT' ? 'TIMEOUT' : r.pass ? 'PASS' : 'FAIL';
    if (tag === 'PASS') passN += 1;
    else if (tag === 'FAIL' || tag === 'TIMEOUT') failN += 1;
    else skipN += 1;
    const st = r.status === 'SKIP' ? '' : ` → ${r.status}`;
    console.log(
      `[${tag}] ${r.label} ${r.user} | ${r.route}${st}${r.detail ? ` | ${r.detail}` : ''}`
    );
  }
  console.log(
    `\nSummary: ${passN} pass, ${failN} fail, ${skipN} skip (of ${results.length})`
  );
  console.log(
    `Write-safety: mutatingAttempted=${mutatingAttempted} (must be 0 when SMOKE_GET_ONLY=1)`
  );
  await prisma.$disconnect();
  process.exit(failN > 0 || (GET_ONLY && mutatingAttempted > 0) ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});

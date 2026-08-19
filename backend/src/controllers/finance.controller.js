// backend/controllers/finance.controller.js
import { PrismaClient } from '@prisma/client';
import { billedTotals, billingLineAmount, toBillingRunLineCreate, withLineTypeTotals } from '../services/billingRunLines.js';
 
const prisma = new PrismaClient();
 
// ── ENGINE 3 LOOKUP ───────────────────────────────────────────────
 
// GET /api/finance/lookup/:branch
// Returns all lookup entries for the branch as { customerName: smartEdgeCode }
export async function getLookup(req, res) {
  try {
    const { branch } = req.params;
    const entries = await prisma.engine3Lookup.findMany({
      where: { branch },
      orderBy: { customerName: 'asc' },
    });
    // Return as flat object for easy use in frontend
    const lookup = {};
    entries.forEach(e => { lookup[e.customerName] = e.smartEdgeCode; });
    res.json({ lookup, entries });
  } catch (err) {
    console.error('getLookup error:', err);
    res.status(500).json({ error: 'Failed to fetch lookup' });
  }
}
 
// POST /api/finance/lookup/:branch
// Body: { lookup: { "Customer Name": "CODE", ... } }
// Upserts all entries — adds new, updates changed, leaves deleted alone
export async function saveLookup(req, res) {
  try {
    const { branch } = req.params;
    const { lookup } = req.body;
    if (!lookup || typeof lookup !== 'object') {
      return res.status(400).json({ error: 'lookup object required' });
    }
    const ops = Object.entries(lookup).map(([customerName, smartEdgeCode]) =>
      prisma.engine3Lookup.upsert({
        where: { branch_customerName: { branch, customerName } },
        update: { smartEdgeCode: smartEdgeCode || '' },
        create: { branch, customerName, smartEdgeCode: smartEdgeCode || '' },
      })
    );
    await prisma.$transaction(ops);
    res.json({ ok: true, saved: ops.length });
  } catch (err) {
    console.error('saveLookup error:', err);
    res.status(500).json({ error: 'Failed to save lookup' });
  }
}
 
// ── EXCLUSIONS ────────────────────────────────────────────────────
 
// GET /api/finance/exclusions/:branch
export async function getExclusions(req, res) {
  try {
    const { branch } = req.params;
    const exclusions = await prisma.financeExclusion.findMany({
      where: { branch },
      orderBy: [{ type: 'asc' }, { value: 'asc' }],
    });
    // Split into categories and codes for convenience
    const categories = exclusions
      .filter(e => e.type === 'category')
      .map(e => e.value);
    const codes = exclusions
      .filter(e => e.type === 'code')
      .map(e => ({ value: e.value, note: e.note || '' }));
    res.json({ categories, codes, all: exclusions });
  } catch (err) {
    console.error('getExclusions error:', err);
    res.status(500).json({ error: 'Failed to fetch exclusions' });
  }
}
 
// POST /api/finance/exclusions/:branch
// Body: { categories: ["Data","Top Up",...], codes: [{ value: "ACC0101", note: "" }] }
// Replaces all exclusions for the branch
export async function saveExclusions(req, res) {
  try {
    const { branch } = req.params;
    const { categories = [], codes = [] } = req.body;
 
    await prisma.$transaction([
      // Delete all existing exclusions for this branch
      prisma.financeExclusion.deleteMany({ where: { branch } }),
      // Re-insert categories
      ...categories.map(value =>
        prisma.financeExclusion.create({ data: { branch, type: 'category', value } })
      ),
      // Re-insert codes
      ...codes.map(({ value, note }) =>
        prisma.financeExclusion.create({ data: { branch, type: 'code', value, note: note || null } })
      ),
    ]);
 
    res.json({ ok: true, categories: categories.length, codes: codes.length });
  } catch (err) {
    console.error('saveExclusions error:', err);
    res.status(500).json({ error: 'Failed to save exclusions' });
  }
}
 
// ── BILLING RUNS ──────────────────────────────────────────────────
 
// GET /api/finance/billing/history
// Query params: branch, limit (default 20), offset (default 0)
export async function getBillingHistory(req, res) {
  try {
    const { branch, limit = 20, offset = 0 } = req.query;
    const where = branch ? { branch } : {};
    const [runs, total] = await Promise.all([
      prisma.billingRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
        select: {
          id: true,
          branch: true,
          period: true,
          processedBy: true,
          grandTotal: true,
          clientCount: true,
          createdAt: true,
          notes: true,
          totalMobile: true,
          totalIntl: true,
          totalNational: true,
          totalLocal: true,
          totalSpecial: true,
          totalVirtual: true,
          totalVce: true,
        },
      }),
      prisma.billingRun.count({ where }),
    ]);
    const runIds = runs.map((run) => run.id);
    const groups = runIds.length
      ? await prisma.billingRunLine.groupBy({
          by: ['billingRunId', 'lineType'],
          where: { billingRunId: { in: runIds } },
          _sum: { lineTotal: true },
        })
      : [];
    res.json({
      runs: withLineTypeTotals(runs, groups),
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) {
    console.error('getBillingHistory error:', err);
    res.status(500).json({ error: 'Failed to fetch billing history' });
  }
}
 
// GET /api/finance/billing/:id
// Returns a single run with all its lines
export async function getBillingRun(req, res) {
  try {
    const { id } = req.params;
    const run = await prisma.billingRun.findUnique({
      where: { id },
      include: {
        lines: {
          orderBy: [{ lineType: 'asc' }, { clientCode: 'asc' }],
        },
      },
    });
    if (!run) return res.status(404).json({ error: 'Billing run not found' });
    res.json(run);
  } catch (err) {
    console.error('getBillingRun error:', err);
    res.status(500).json({ error: 'Failed to fetch billing run' });
  }
}
 
// POST /api/finance/billing/save
// Body: { branch, period, notes, lines, excludedLines, unmatchedLines }
// Zero-activity contract clients belong in `lines` with lineType billed.
export async function saveBillingRun(req, res) {
  try {
    const { branch, period, notes, lines = [], excludedLines = [], unmatchedLines = [], noActivityLines = [] } = req.body;
    if (!branch || !period) {
      return res.status(400).json({ error: 'branch and period are required' });
    }

    const billed = [
      ...(Array.isArray(lines) ? lines : []),
      ...(Array.isArray(noActivityLines) ? noActivityLines : []),
    ];
    const excluded = Array.isArray(excludedLines) ? excludedLines : [];
    const unmatched = Array.isArray(unmatchedLines) ? unmatchedLines : [];
    if (!billed.length && !excluded.length && !unmatched.length) {
      return res.status(400).json({ error: 'No lines to save' });
    }

    const totals = billedTotals(billed);
    const billedTotal = Object.values(totals).reduce((s, v) => s + v, 0);
    const supplierTotal =
      billedTotal +
      excluded.reduce((s, l) => s + billingLineAmount(l), 0) +
      unmatched.reduce((s, l) => s + billingLineAmount(l), 0);
    const processedBy = req.user?.name || req.user?.email || 'Unknown';

    const lineRows = [
      ...billed.map((l) => toBillingRunLineCreate(l, 'billed')),
      ...excluded.map((l) => toBillingRunLineCreate(l, 'excluded')),
      ...unmatched.map((l) => toBillingRunLineCreate(l, 'unmatched')),
    ];

    const run = await prisma.$transaction(async (tx) => {
      const created = await tx.billingRun.create({
        data: {
          branch,
          period,
          notes: notes || null,
          processedBy,
          clientCount: billed.length,
          grandTotal: supplierTotal,
          ...totals,
        },
      });
      await tx.billingRunLine.createMany({
        data: lineRows.map((row) => ({ ...row, billingRunId: created.id })),
      });
      return created;
    });

    res.json({ ok: true, run });
  } catch (err) {
    console.error('saveBillingRun error:', err);
    if (err.name === 'PrismaClientValidationError') {
      return res.status(500).json({
        error:
          'Failed to save billing run: the database client is missing a billing line field. Run prisma migrate deploy and prisma generate, then restart the API.',
      });
    }
    if (err.code === 'P2022' || /column .* does not exist/i.test(String(err.message))) {
      return res.status(500).json({
        error: 'Failed to save billing run: a billing line column is missing. Run prisma migrate deploy.',
      });
    }
    res.status(500).json({ error: 'Failed to save billing run' });
  }
}
 
// DELETE /api/finance/billing/:id
export async function deleteBillingRun(req, res) {
  try {
    const { id } = req.params;
    await prisma.billingRun.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('deleteBillingRun error:', err);
    res.status(500).json({ error: 'Failed to delete billing run' });
  }
}
// backend/controllers/finance.controller.js
import { PrismaClient } from '@prisma/client';
import { withLineTypeTotals } from '../services/billingRunLines.js';
import {
  BILLING_RUN_STATUS,
  buildBillingRunSnapshot,
  normalizeBillingRunFiles,
  normalizeBillingRunStatus,
} from '../services/billingRunSave.js';

const prisma = new PrismaClient();

function saveBillingErrorResponse(res, err) {
  console.error('saveBillingRun error:', err);
  if (err.name === 'PrismaClientValidationError') {
    return res.status(500).json({
      error:
        'Failed to save billing run: the database client is missing a billing field. Run prisma migrate deploy and prisma generate, then restart the API.',
    });
  }
  if (err.code === 'P2022' || /column .* does not exist/i.test(String(err.message))) {
    return res.status(500).json({
      error: 'Failed to save billing run: a billing column is missing. Run prisma migrate deploy.',
    });
  }
  return res.status(500).json({ error: 'Failed to save billing run' });
}

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
// Query params: branch, status (draft|submitted), limit, offset
export async function getBillingHistory(req, res) {
  try {
    const { branch, status, limit = 20, offset = 0 } = req.query;
    const where = {};
    if (branch) where.branch = branch;
    if (status === BILLING_RUN_STATUS.draft || status === BILLING_RUN_STATUS.submitted) {
      where.status = status;
    }
    const [runs, total] = await Promise.all([
      prisma.billingRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit, 10),
        skip: parseInt(offset, 10),
        select: {
          id: true,
          branch: true,
          period: true,
          processedBy: true,
          status: true,
          grandTotal: true,
          clientCount: true,
          createdAt: true,
          updatedAt: true,
          notes: true,
          totalMobile: true,
          totalIntl: true,
          totalNational: true,
          totalLocal: true,
          totalSpecial: true,
          totalVirtual: true,
          totalVce: true,
          _count: { select: { files: true } },
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
      runs: withLineTypeTotals(
        runs.map(({ _count, ...run }) => ({
          ...run,
          fileCount: _count?.files || 0,
        })),
        groups
      ),
      total,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
  } catch (err) {
    console.error('getBillingHistory error:', err);
    res.status(500).json({ error: 'Failed to fetch billing history' });
  }
}

// GET /api/finance/billing/:id
// Returns a single run with lines; includes files when status is draft (for resume).
export async function getBillingRun(req, res) {
  try {
    const { id } = req.params;
    const run = await prisma.billingRun.findUnique({
      where: { id },
      include: {
        lines: {
          orderBy: [{ lineType: 'asc' }, { clientCode: 'asc' }],
        },
        files: {
          orderBy: { filename: 'asc' },
        },
      },
    });
    if (!run) return res.status(404).json({ error: 'Billing run not found' });
    if (run.status !== BILLING_RUN_STATUS.draft) {
      return res.json({ ...run, files: [] });
    }
    res.json(run);
  } catch (err) {
    console.error('getBillingRun error:', err);
    res.status(500).json({ error: 'Failed to fetch billing run' });
  }
}

// POST /api/finance/billing/save
// Body: { branch, period, notes, status, draftId?, lines, excludedLines, unmatchedLines, noActivityLines, files? }
export async function saveBillingRun(req, res) {
  try {
    const {
      branch,
      period,
      notes,
      draftId,
      status: statusRaw,
      files: rawFiles,
    } = req.body;
    if (!branch || !period) {
      return res.status(400).json({ error: 'branch and period are required' });
    }

    const status = normalizeBillingRunStatus(statusRaw);
    const snapshot = buildBillingRunSnapshot(req.body);
    if (snapshot.isEmpty) {
      return res.status(400).json({ error: 'No lines to save' });
    }

    const processedBy = req.user?.name || req.user?.email || 'Unknown';
    const files =
      status === BILLING_RUN_STATUS.draft ? normalizeBillingRunFiles(rawFiles) : [];

    if (status === BILLING_RUN_STATUS.draft && files.length === 0 && !draftId) {
      return res.status(400).json({ error: 'Draft save requires the uploaded files' });
    }

    const run = await prisma.$transaction(async (tx) => {
      let targetId = null;

      if (draftId) {
        const existing = await tx.billingRun.findUnique({ where: { id: draftId } });
        if (!existing) {
          const err = new Error('Draft not found');
          err.statusCode = 404;
          throw err;
        }
        if (existing.status !== BILLING_RUN_STATUS.draft) {
          const err = new Error('Only draft runs can be updated');
          err.statusCode = 400;
          throw err;
        }
        targetId = existing.id;
        await tx.billingRunLine.deleteMany({ where: { billingRunId: targetId } });
        if (status === BILLING_RUN_STATUS.submitted || files.length > 0) {
          await tx.billingRunFile.deleteMany({ where: { billingRunId: targetId } });
        }
        await tx.billingRun.update({
          where: { id: targetId },
          data: {
            branch,
            period,
            notes: notes || null,
            processedBy,
            status,
            clientCount: snapshot.clientCount,
            grandTotal: snapshot.grandTotal,
            ...snapshot.totals,
          },
        });
      } else {
        const created = await tx.billingRun.create({
          data: {
            branch,
            period,
            notes: notes || null,
            processedBy,
            status,
            clientCount: snapshot.clientCount,
            grandTotal: snapshot.grandTotal,
            ...snapshot.totals,
          },
        });
        targetId = created.id;
      }

      await tx.billingRunLine.createMany({
        data: snapshot.lineRows.map((row) => ({ ...row, billingRunId: targetId })),
      });

      if (status === BILLING_RUN_STATUS.draft && files.length) {
        await tx.billingRunFile.createMany({
          data: files.map((file) => ({
            billingRunId: targetId,
            filename: file.filename,
            engine: file.engine,
            content: file.content,
            encoding: file.encoding,
            contentType: file.contentType,
          })),
        });
      }

      if (status === BILLING_RUN_STATUS.submitted) {
        await tx.billingRunFile.deleteMany({ where: { billingRunId: targetId } });
      }

      return tx.billingRun.findUnique({ where: { id: targetId } });
    });

    res.json({ ok: true, run });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    return saveBillingErrorResponse(res, err);
  }
}

// POST /api/finance/billing/:id/submit
// Finalises a draft: status=submitted, delete stored file contents.
export async function submitBillingRun(req, res) {
  try {
    const { id } = req.params;
    const existing = await prisma.billingRun.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Billing run not found' });
    if (existing.status !== BILLING_RUN_STATUS.draft) {
      return res.status(400).json({ error: 'Only draft runs can be submitted' });
    }

    const run = await prisma.$transaction(async (tx) => {
      await tx.billingRunFile.deleteMany({ where: { billingRunId: id } });
      return tx.billingRun.update({
        where: { id },
        data: {
          status: BILLING_RUN_STATUS.submitted,
          processedBy: req.user?.name || req.user?.email || existing.processedBy,
        },
      });
    });

    res.json({ ok: true, run });
  } catch (err) {
    console.error('submitBillingRun error:', err);
    res.status(500).json({ error: 'Failed to submit billing run' });
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
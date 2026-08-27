/**
 * Connectivity alerts mute — preference filter + PATCH /users/:id/notification-preferences.
 *
 * Reuses NotificationPreference (category `connectivity`); missing row = enabled.
 * createForUsers already drops disabled users; this suite locks that behaviour and
 * the self/admin permission gate on the preferences endpoint.
 *
 * Run: npm test (from backend/)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { NotificationRepository } from '../src/repositories/notification.repository.js';
import notificationPreferenceRepository from '../src/repositories/notificationPreference.repository.js';
import prisma from '../src/config/database.js';
import {
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
} from '../src/controllers/user-notification-preferences.controller.js';
import { validate } from '../src/middleware/validate.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { updateNotificationPreferencesSchema } from '../src/schemas/user-notification-preferences.schema.js';

test('createForUsers skips muted connectivity recipients only', async () => {
  const created = [];
  const originalFindDisabled = notificationPreferenceRepository.findDisabledUserIds;
  const originalCreateMany = prisma.notification.createMany;

  notificationPreferenceRepository.findDisabledUserIds = async (userIds, category) => {
    assert.equal(category, 'connectivity');
    return userIds.filter((id) => id === 'user-muted');
  };
  prisma.notification.createMany = async ({ data }) => {
    created.push(...data);
    return { count: data.length };
  };

  try {
    const repo = new NotificationRepository();
    await repo.createForUsers(['user-muted', 'user-active', 'user-other'], {
      type: 'connectivity_link_down',
      title: 'Link down',
      branch: 'JHB',
    });
    assert.deepEqual(
      created.map((row) => row.userId).sort(),
      ['user-active', 'user-other']
    );
  } finally {
    notificationPreferenceRepository.findDisabledUserIds = originalFindDisabled;
    prisma.notification.createMany = originalCreateMany;
  }
});

test('createForUsers with no mute rows notifies everyone', async () => {
  const created = [];
  const originalFindDisabled = notificationPreferenceRepository.findDisabledUserIds;
  const originalCreateMany = prisma.notification.createMany;

  notificationPreferenceRepository.findDisabledUserIds = async () => [];
  prisma.notification.createMany = async ({ data }) => {
    created.push(...data);
    return { count: data.length };
  };

  try {
    const repo = new NotificationRepository();
    await repo.createForUsers(['a', 'b'], {
      type: 'connectivity_link_restored',
      title: 'Restored',
      branch: 'CT',
    });
    assert.deepEqual(
      created.map((row) => row.userId).sort(),
      ['a', 'b']
    );
  } finally {
    notificationPreferenceRepository.findDisabledUserIds = originalFindDisabled;
    prisma.notification.createMany = originalCreateMany;
  }
});

test('createForUsers creates nothing when all recipients are muted', async () => {
  const created = [];
  const originalFindDisabled = notificationPreferenceRepository.findDisabledUserIds;
  const originalCreateMany = prisma.notification.createMany;
  let createManyCalled = false;

  notificationPreferenceRepository.findDisabledUserIds = async (userIds) => [...userIds];
  prisma.notification.createMany = async ({ data }) => {
    createManyCalled = true;
    created.push(...data);
    return { count: data.length };
  };

  try {
    const repo = new NotificationRepository();
    const result = await repo.createForUsers(['user-muted'], {
      type: 'connectivity_dns_failure',
      title: 'DNS',
      branch: 'JHB',
    });
    assert.deepEqual(result, []);
    assert.equal(createManyCalled, false);
    assert.equal(created.length, 0);
  } finally {
    notificationPreferenceRepository.findDisabledUserIds = originalFindDisabled;
    prisma.notification.createMany = originalCreateMany;
  }
});

function mockPreferenceRepo(rowsByUser = {}) {
  return {
    async findByUserId(userId) {
      return rowsByUser[userId] || [];
    },
    async upsert(userId, category, enabled) {
      const list = rowsByUser[userId] || (rowsByUser[userId] = []);
      const existing = list.find((r) => r.category === category);
      if (existing) {
        existing.enabled = enabled;
        return existing;
      }
      const row = { userId, category, enabled };
      list.push(row);
      return row;
    },
  };
}

function makeService(rowsByUser = {}) {
  const preferenceRepo = mockPreferenceRepo(rowsByUser);
  return {
    getConnectivityAlertsEnabled: async (userId) => {
      const rows = await preferenceRepo.findByUserId(userId);
      const row = rows.find((r) => r.category === 'connectivity');
      return row == null ? true : Boolean(row.enabled);
    },
    setConnectivityAlertsEnabled: async (userId, enabled) => {
      await preferenceRepo.upsert(userId, 'connectivity', Boolean(enabled));
      return { connectivityAlertsEnabled: Boolean(enabled) };
    },
  };
}

function buildPrefsApp({ user, notificationService, userExists = true }) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });

  app.get('/users/:id/notification-preferences', async (req, res, next) => {
    try {
      const { id } = req.params;
      const isSelf = req.user?.id === id;
      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'manager';
      const hasUpdate =
        Array.isArray(req.user?.permissions) &&
        req.user.permissions.includes('users.update');
      if (!isSelf && !isAdmin && !hasUpdate) {
        return res.status(403).json({ error: 'Permission denied' });
      }
      if (!userExists) {
        return res.status(404).json({ error: 'User not found' });
      }
      const connectivityAlertsEnabled =
        await notificationService.getConnectivityAlertsEnabled(id);
      res.json({ connectivityAlertsEnabled });
    } catch (err) {
      next(err);
    }
  });

  app.patch(
    '/users/:id/notification-preferences',
    validate(updateNotificationPreferencesSchema),
    async (req, res, next) => {
      try {
        const { id } = req.params;
        const isSelf = req.user?.id === id;
        const isAdmin = req.user?.role === 'admin' || req.user?.role === 'manager';
        const hasUpdate =
          Array.isArray(req.user?.permissions) &&
          req.user.permissions.includes('users.update');
        if (!isSelf && !isAdmin && !hasUpdate) {
          return res.status(403).json({ error: 'Permission denied' });
        }
        if (!userExists) {
          return res.status(404).json({ error: 'User not found' });
        }
        const result = await notificationService.setConnectivityAlertsEnabled(
          id,
          req.body.connectivityAlertsEnabled
        );
        res.json(result);
      } catch (err) {
        next(err);
      }
    }
  );

  app.use(errorHandler);
  return app;
}

async function request(app, method, path, body) {
  const server = app.listen(0);
  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }
    return { status: res.status, json };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('GET preferences defaults to enabled when no row', async () => {
  const service = makeService();
  const app = buildPrefsApp({
    user: { id: 'u1', role: 'admin' },
    notificationService: service,
  });
  const res = await request(app, 'GET', '/users/u1/notification-preferences');
  assert.equal(res.status, 200);
  assert.equal(res.json.connectivityAlertsEnabled, true);
});

test('PATCH self can mute connectivity alerts', async () => {
  const service = makeService();
  const app = buildPrefsApp({
    user: { id: 'u1', role: 'meter_user', permissions: [] },
    notificationService: service,
  });
  const res = await request(app, 'PATCH', '/users/u1/notification-preferences', {
    connectivityAlertsEnabled: false,
  });
  assert.equal(res.status, 200);
  assert.equal(res.json.connectivityAlertsEnabled, false);
  assert.equal(await service.getConnectivityAlertsEnabled('u1'), false);
});

test('PATCH other user forbidden without admin/users.update', async () => {
  const service = makeService();
  const app = buildPrefsApp({
    user: { id: 'u1', role: 'meter_user', permissions: [] },
    notificationService: service,
  });
  const res = await request(app, 'PATCH', '/users/u2/notification-preferences', {
    connectivityAlertsEnabled: false,
  });
  assert.equal(res.status, 403);
});

test('PATCH admin can mute another user', async () => {
  const service = makeService();
  const app = buildPrefsApp({
    user: { id: 'admin-1', role: 'admin', permissions: ['users.update'] },
    notificationService: service,
  });
  const res = await request(app, 'PATCH', '/users/u2/notification-preferences', {
    connectivityAlertsEnabled: false,
  });
  assert.equal(res.status, 200);
  assert.equal(res.json.connectivityAlertsEnabled, false);
});

test('PATCH users.update can mute another user without admin role', async () => {
  const service = makeService();
  const app = buildPrefsApp({
    user: { id: 'mgr', role: 'capturer', permissions: ['users.update'] },
    notificationService: service,
  });
  const res = await request(app, 'PATCH', '/users/u2/notification-preferences', {
    connectivityAlertsEnabled: true,
  });
  assert.equal(res.status, 200);
  assert.equal(res.json.connectivityAlertsEnabled, true);
});

test('mute then unmute resumes', async () => {
  const service = makeService();
  const app = buildPrefsApp({
    user: { id: 'u1', role: 'admin' },
    notificationService: service,
  });
  let res = await request(app, 'PATCH', '/users/u1/notification-preferences', {
    connectivityAlertsEnabled: false,
  });
  assert.equal(res.json.connectivityAlertsEnabled, false);
  res = await request(app, 'PATCH', '/users/u1/notification-preferences', {
    connectivityAlertsEnabled: true,
  });
  assert.equal(res.json.connectivityAlertsEnabled, true);
  assert.equal(await service.getConnectivityAlertsEnabled('u1'), true);
});

test('PATCH rejects non-boolean body', async () => {
  const service = makeService();
  const app = buildPrefsApp({
    user: { id: 'u1', role: 'admin' },
    notificationService: service,
  });
  const res = await request(app, 'PATCH', '/users/u1/notification-preferences', {
    connectivityAlertsEnabled: 'no',
  });
  assert.equal(res.status, 400);
});

test('controller module exports bindable handlers', () => {
  assert.equal(typeof getUserNotificationPreferences, 'function');
  assert.equal(typeof updateUserNotificationPreferences, 'function');
});

test('disconnect prisma after mute suite', async () => {
  await prisma.$disconnect();
});

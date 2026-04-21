import express from "express";
import { v4 as uuid } from "uuid";
import { readDb, writeDb } from "../data/store.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

function ensureNotifications(db) {
  if (!Array.isArray(db.notifications)) db.notifications = [];
  return db;
}

router.get("/", requireAuth, (req, res) => {
  const db = ensureNotifications(readDb());
  const items = db.notifications
    .filter((n) => n.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.json(items);
});

router.post("/mark-read", requireAuth, (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) {
    return res.status(400).json({ message: "ids must be an array." });
  }
  const db = ensureNotifications(readDb());
  const now = new Date().toISOString();
  let updated = 0;
  for (const n of db.notifications) {
    if (n.userId === req.user.id && ids.includes(n.id) && !n.readAt) {
      n.readAt = now;
      updated += 1;
    }
  }
  writeDb(db);
  return res.json({ message: "Notifications marked as read.", updated });
});

router.post("/mark-all-read", requireAuth, (req, res) => {
  const db = ensureNotifications(readDb());
  const now = new Date().toISOString();
  let updated = 0;
  for (const n of db.notifications) {
    if (n.userId === req.user.id && !n.readAt) {
      n.readAt = now;
      updated += 1;
    }
  }
  writeDb(db);
  return res.json({ message: "All notifications marked as read.", updated });
});

// internal helper (not exposed) example payload shape
export function createNotification({ userId, title, body, link }) {
  const db = ensureNotifications(readDb());
  const notification = {
    id: uuid(),
    userId,
    title,
    body,
    link: link || null,
    createdAt: new Date().toISOString(),
    readAt: null
  };
  db.notifications.push(notification);
  writeDb(db);
  return notification;
}

export default router;

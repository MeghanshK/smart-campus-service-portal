import express from "express";
import { readDb } from "../data/store.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/stats", requireAuth, (req, res) => {
  const db = readDb();
  const ticketsForUser =
    req.user.role === "student"
      ? db.tickets.filter((t) => t.createdBy === req.user.id)
      : db.tickets;

  const stats = {
    totalTickets: ticketsForUser.length,
    open: ticketsForUser.filter((t) => t.status === "open").length,
    inProgress: ticketsForUser.filter((t) => t.status === "in_progress").length,
    resolved: ticketsForUser.filter((t) => t.status === "resolved").length,
    announcements: db.announcements.length
  };

  return res.json(stats);
});

router.get("/analytics", requireAuth, (req, res) => {
  const db = readDb();
  const ticketsForUser =
    req.user.role === "student"
      ? db.tickets.filter((t) => t.createdBy === req.user.id)
      : db.tickets;

  const now = Date.now();
  const resolvedTickets = ticketsForUser.filter((t) => t.status === "resolved" || t.status === "closed");
  const resolutionTimesMs = resolvedTickets
    .map((t) => {
      const created = new Date(t.createdAt).getTime();
      const resolvedAt = t.updatedAt ? new Date(t.updatedAt).getTime() : null;
      if (!created || !resolvedAt) return null;
      return resolvedAt - created;
    })
    .filter((x) => typeof x === "number" && x >= 0);

  const avgResolutionMs =
    resolutionTimesMs.length === 0
      ? null
      : Math.round(resolutionTimesMs.reduce((a, b) => a + b, 0) / resolutionTimesMs.length);

  const overdue = ticketsForUser.filter((t) => {
    if (!t.dueAt) return false;
    if (t.status === "resolved" || t.status === "closed") return false;
    return new Date(t.dueAt).getTime() < now;
  });

  const byCategory = {};
  const byPriority = {};
  const byStatus = {};
  for (const t of ticketsForUser) {
    byCategory[t.category] = (byCategory[t.category] || 0) + 1;
    byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
  }

  let workload = null;
  if (req.user.role !== "student") {
    workload = {};
    for (const t of ticketsForUser) {
      const key = t.assignedTo || "Unassigned";
      workload[key] = (workload[key] || 0) + 1;
    }
  }

  return res.json({
    avgResolutionMs,
    avgResolutionHours: avgResolutionMs === null ? null : Math.round((avgResolutionMs / (1000 * 60 * 60)) * 10) / 10,
    overdueCount: overdue.length,
    totalTickets: ticketsForUser.length,
    byCategory,
    byPriority,
    byStatus,
    workload
  });
});

export default router;

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

export default router;

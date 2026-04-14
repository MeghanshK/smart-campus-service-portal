import express from "express";
import { v4 as uuid } from "uuid";
import { readDb, writeDb } from "../data/store.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.get("/", requireAuth, (req, res) => {
  const db = readDb();
  const result =
    req.user.role === "student"
      ? db.tickets.filter((t) => t.createdBy === req.user.id)
      : db.tickets;
  return res.json(result);
});

router.post("/", requireAuth, (req, res) => {
  const { title, description, category, priority } = req.body;
  if (!title || !description || !category) {
    return res.status(400).json({ message: "Title, description, and category are required." });
  }

  const db = readDb();
  const ticket = {
    id: uuid(),
    title,
    description,
    category,
    priority: priority || "medium",
    status: "open",
    createdAt: new Date().toISOString(),
    createdBy: req.user.id,
    createdByName: req.user.name,
    comments: []
  };

  db.tickets.push(ticket);
  writeDb(db);
  return res.status(201).json(ticket);
});

router.patch("/:id/status", requireAuth, requireRole("staff", "admin"), (req, res) => {
  const { status } = req.body;
  const allowed = ["open", "in_progress", "resolved", "closed"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: "Invalid status value." });
  }

  const db = readDb();
  const ticket = db.tickets.find((t) => t.id === req.params.id);
  if (!ticket) {
    return res.status(404).json({ message: "Ticket not found." });
  }

  ticket.status = status;
  ticket.updatedAt = new Date().toISOString();
  writeDb(db);
  return res.json(ticket);
});

router.post("/:id/comments", requireAuth, (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ message: "Comment message is required." });
  }

  const db = readDb();
  const ticket = db.tickets.find((t) => t.id === req.params.id);
  if (!ticket) {
    return res.status(404).json({ message: "Ticket not found." });
  }

  if (req.user.role === "student" && ticket.createdBy !== req.user.id) {
    return res.status(403).json({ message: "You can comment only on your own tickets." });
  }

  ticket.comments.push({
    id: uuid(),
    userId: req.user.id,
    userName: req.user.name,
    role: req.user.role,
    message,
    createdAt: new Date().toISOString()
  });
  writeDb(db);
  return res.status(201).json(ticket);
});

export default router;

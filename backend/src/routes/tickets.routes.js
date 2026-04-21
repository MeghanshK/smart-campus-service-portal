import express from "express";
import { v4 as uuid } from "uuid";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { readDb, writeDb } from "../data/store.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createNotification } from "./notifications.routes.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "..", "uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

function getTicketOr404(db, ticketId, res) {
  const ticket = db.tickets.find((t) => t.id === ticketId);
  if (!ticket) {
    res.status(404).json({ message: "Ticket not found." });
    return null;
  }
  return ticket;
}

function getSlaHours(priority) {
  if (priority === "high") return 24;
  if (priority === "low") return 72;
  return 48;
}

function computeDueAt(createdAtIso, priority) {
  const hours = getSlaHours(priority);
  return new Date(new Date(createdAtIso).getTime() + hours * 60 * 60 * 1000).toISOString();
}

function normalizeTicket(ticket) {
  const nowIso = new Date().toISOString();
  if (!ticket.priority) ticket.priority = "medium";
  if (!ticket.status) ticket.status = "open";
  if (!ticket.createdAt) ticket.createdAt = nowIso;

  if (ticket.assignedTo === undefined) ticket.assignedTo = null;
  if (ticket.assignedToId === undefined) ticket.assignedToId = null;
  if (!Array.isArray(ticket.comments)) ticket.comments = [];
  if (!Array.isArray(ticket.statusHistory)) ticket.statusHistory = [];
  if (!Array.isArray(ticket.attachments)) ticket.attachments = [];
  if (!ticket.dueAt) ticket.dueAt = computeDueAt(ticket.createdAt, ticket.priority);
  if (!ticket.lastActivityAt) ticket.lastActivityAt = ticket.updatedAt || ticket.createdAt;

  if (ticket.statusHistory.length === 0) {
    ticket.statusHistory.push({
      id: uuid(),
      from: null,
      to: ticket.status,
      by: ticket.createdByName || "System",
      at: ticket.createdAt
    });
  }

  return ticket;
}

router.get("/", requireAuth, (req, res) => {
  const db = readDb();
  db.tickets = db.tickets.map((t) => normalizeTicket(t));
  writeDb(db);
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
    assignedTo: null,
    assignedToId: null,
    statusHistory: [],
    dueAt: null,
    lastActivityAt: null,
    attachments: [],
    comments: []
  };
  normalizeTicket(ticket);

  db.tickets.push(ticket);
  writeDb(db);
  return res.status(201).json(ticket);
});

router.get("/:id", requireAuth, (req, res) => {
  const db = readDb();
  const ticket = getTicketOr404(db, req.params.id, res);
  if (!ticket) return;
  normalizeTicket(ticket);
  writeDb(db);

  if (req.user.role === "student" && ticket.createdBy !== req.user.id) {
    return res.status(403).json({ message: "You can view only your own tickets." });
  }
  return res.json(ticket);
});

router.post(
  "/:id/attachments",
  requireAuth,
  upload.single("file"),
  (req, res) => {
    const db = readDb();
    const ticket = getTicketOr404(db, req.params.id, res);
    if (!ticket) return;
    normalizeTicket(ticket);

    if (req.user.role === "student" && ticket.createdBy !== req.user.id) {
      return res.status(403).json({ message: "You can upload only to your own tickets." });
    }
    if (!req.file) {
      return res.status(400).json({ message: "No file provided." });
    }

    const attachment = {
      id: uuid(),
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/${req.file.filename}`,
      uploadedBy: req.user.name,
      uploadedById: req.user.id,
      uploadedAt: new Date().toISOString()
    };

    ticket.attachments.push(attachment);
    ticket.updatedAt = new Date().toISOString();
    ticket.lastActivityAt = ticket.updatedAt;
    writeDb(db);
    return res.status(201).json({ attachment, ticket });
  }
);

router.patch("/:id/status", requireAuth, requireRole("staff", "admin"), (req, res) => {
  const { status } = req.body;
  const allowed = ["open", "in_progress", "resolved", "closed"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: "Invalid status value." });
  }

  const db = readDb();
  const ticket = getTicketOr404(db, req.params.id, res);
  if (!ticket) return;
  normalizeTicket(ticket);

  const previousStatus = ticket.status;
  ticket.status = status;
  ticket.updatedAt = new Date().toISOString();
  ticket.lastActivityAt = ticket.updatedAt;
  if (!ticket.statusHistory) ticket.statusHistory = [];
  ticket.statusHistory.push({
    id: uuid(),
    from: previousStatus,
    to: status,
    by: req.user.name,
    at: ticket.updatedAt
  });
  writeDb(db);

  // notify ticket creator
  if (ticket.createdBy) {
    createNotification({
      userId: ticket.createdBy,
      title: "Ticket status updated",
      body: `Your ticket "${ticket.title}" is now ${status.replace("_", " ")}.`,
      link: null
    });
  }
  return res.json(ticket);
});

router.patch("/:id/assign", requireAuth, requireRole("staff", "admin"), (req, res) => {
  const db = readDb();
  const ticket = getTicketOr404(db, req.params.id, res);
  if (!ticket) return;
  normalizeTicket(ticket);

  const assignedTo = req.body.assignedTo || req.user.name;
  ticket.assignedTo = assignedTo;
  ticket.assignedToId = req.user.id;
  ticket.updatedAt = new Date().toISOString();
  ticket.lastActivityAt = ticket.updatedAt;
  writeDb(db);

  // notify ticket creator
  if (ticket.createdBy) {
    createNotification({
      userId: ticket.createdBy,
      title: "Ticket assigned",
      body: `Your ticket "${ticket.title}" was assigned to ${ticket.assignedTo}.`,
      link: null
    });
  }
  return res.json(ticket);
});

router.patch("/:id/priority", requireAuth, requireRole("staff", "admin"), (req, res) => {
  const { priority } = req.body;
  const allowed = ["low", "medium", "high"];
  if (!allowed.includes(priority)) {
    return res.status(400).json({ message: "Invalid priority value." });
  }

  const db = readDb();
  const ticket = getTicketOr404(db, req.params.id, res);
  if (!ticket) return;
  normalizeTicket(ticket);

  ticket.priority = priority;
  ticket.dueAt = computeDueAt(ticket.createdAt, ticket.priority);
  ticket.updatedAt = new Date().toISOString();
  ticket.lastActivityAt = ticket.updatedAt;
  writeDb(db);
  return res.json(ticket);
});

router.post("/:id/comments", requireAuth, (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ message: "Comment message is required." });
  }

  const db = readDb();
  const ticket = getTicketOr404(db, req.params.id, res);
  if (!ticket) return;
  normalizeTicket(ticket);

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
  ticket.updatedAt = new Date().toISOString();
  ticket.lastActivityAt = ticket.updatedAt;
  writeDb(db);

  // notify other party
  const targetUserId = req.user.role === "student" ? ticket.assignedToId || ticket.createdBy : ticket.createdBy;
  if (targetUserId && targetUserId !== req.user.id) {
    createNotification({
      userId: targetUserId,
      title: "New comment on ticket",
      body: `${req.user.name}: ${message}`,
      link: null
    });
  }
  return res.status(201).json(ticket);
});

export default router;

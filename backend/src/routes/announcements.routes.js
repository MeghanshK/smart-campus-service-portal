import express from "express";
import { v4 as uuid } from "uuid";
import { readDb, writeDb } from "../data/store.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.get("/", (req, res) => {
  const db = readDb();
  const sorted = [...db.announcements].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  return res.json(sorted);
});

router.post("/", requireAuth, requireRole("staff", "admin"), (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ message: "Title and content are required." });
  }

  const db = readDb();
  const announcement = {
    id: uuid(),
    title,
    content,
    createdAt: new Date().toISOString(),
    authorName: req.user.name
  };

  db.announcements.push(announcement);
  writeDb(db);
  return res.status(201).json(announcement);
});

export default router;

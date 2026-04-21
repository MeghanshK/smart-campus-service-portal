import express from "express";
import { readDb, writeDb } from "../data/store.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.get("/users", requireAuth, requireRole("admin"), (req, res) => {
  const db = readDb();
  const users = db.users
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      isActive: u.isActive !== false
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.json(users);
});

router.patch("/users/:id/role", requireAuth, requireRole("admin"), (req, res) => {
  const { role } = req.body;
  if (!["student", "staff", "admin"].includes(role)) {
    return res.status(400).json({ message: "Invalid role value." });
  }

  const db = readDb();
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ message: "User not found." });

  user.role = role;
  user.updatedAt = new Date().toISOString();
  writeDb(db);
  return res.json({ message: "Role updated.", userId: user.id, role: user.role });
});

router.patch("/users/:id/active", requireAuth, requireRole("admin"), (req, res) => {
  const { isActive } = req.body;
  if (typeof isActive !== "boolean") {
    return res.status(400).json({ message: "isActive must be boolean." });
  }

  const db = readDb();
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ message: "User not found." });

  user.isActive = isActive;
  user.updatedAt = new Date().toISOString();
  writeDb(db);
  return res.json({ message: "User active state updated.", userId: user.id, isActive: user.isActive });
});

export default router;

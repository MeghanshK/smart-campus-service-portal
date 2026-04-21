import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import dotenv from "dotenv";
import { readDb, writeDb } from "../data/store.js";
import { requireAuth } from "../middleware/auth.js";

dotenv.config();

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required." });
    }

    const db = readDb();
    const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(409).json({ message: "Email already exists." });
    }

    const hashed = await bcrypt.hash(password, 10);
    const newUser = {
      id: uuid(),
      name,
      email,
      password: hashed,
      role: role && ["student", "staff", "admin"].includes(role) ? role : "student",
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    writeDb(db);

    return res.status(201).json({ message: "Registration successful." });
  } catch (error) {
    return res.status(500).json({ message: "Registration failed.", error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const db = readDb();
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }
    if (user.isActive === false) {
      return res.status(403).json({ message: "Your account is disabled. Contact admin." });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    return res.status(500).json({ message: "Login failed.", error: error.message });
  }
});

router.get("/me", requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

export default router;

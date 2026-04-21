import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { readDb, writeDb } from "../data/store.js";

export async function ensureDefaultAdmin() {
  const email = (process.env.ADMIN_EMAIL || "admin@campus.local").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "Admin@123";
  const name = process.env.ADMIN_NAME || "Campus Admin";

  const db = readDb();
  const existing = db.users.find((u) => u.email.toLowerCase() === email);
  if (existing) return;

  const hashed = await bcrypt.hash(password, 10);
  db.users.push({
    id: uuid(),
    name,
    email,
    password: hashed,
    role: "admin",
    createdAt: new Date().toISOString()
  });

  writeDb(db);
}

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.routes.js";
import ticketRoutes from "./routes/tickets.routes.js";
import announcementRoutes from "./routes/announcements.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import notificationRoutes from "./routes/notifications.routes.js";
import { ensureDefaultAdmin } from "./bootstrap/ensureAdmin.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.json({ message: "Smart Campus Service Portal API is running." });
});

app.use("/api/auth", authRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);

ensureDefaultAdmin()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server started on http://localhost:${PORT}`);
      console.log("Default admin ensured (ADMIN_EMAIL / ADMIN_PASSWORD).");
    });
  })
  .catch((error) => {
    console.error("Failed to ensure default admin:", error);
    app.listen(PORT, () => {
      console.log(`Server started on http://localhost:${PORT}`);
    });
  });

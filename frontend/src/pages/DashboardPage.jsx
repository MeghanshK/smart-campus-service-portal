import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function DashboardPage({ user, setUser }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [theme, setTheme] = useState(() => localStorage.getItem("dashboardTheme") || "dark");

  const [ticketForm, setTicketForm] = useState({
    title: "",
    description: "",
    category: "maintenance",
    priority: "medium"
  });

  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    content: ""
  });

  const isStaffOrAdmin = useMemo(
    () => ["staff", "admin"].includes(user.role),
    [user.role]
  );
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesSearch =
        ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tickets, searchTerm, statusFilter]);

  const loadData = async () => {
    setError("");
    try {
      const [statsRes, ticketsRes, announcementRes] = await Promise.all([
        api.get("/dashboard/stats"),
        api.get("/tickets"),
        api.get("/announcements")
      ]);
      setStats(statsRes.data);
      setTickets(ticketsRes.data);
      setAnnouncements(announcementRes.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load dashboard data.");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    localStorage.setItem("dashboardTheme", theme);
  }, [theme]);

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/login");
  };

  const createTicket = async (e) => {
    e.preventDefault();
    try {
      await api.post("/tickets", ticketForm);
      setTicketForm({
        title: "",
        description: "",
        category: "maintenance",
        priority: "medium"
      });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Ticket creation failed.");
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/tickets/${id}/status`, { status });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Status update failed.");
    }
  };

  const createAnnouncement = async (e) => {
    e.preventDefault();
    try {
      await api.post("/announcements", announcementForm);
      setAnnouncementForm({ title: "", content: "" });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Announcement creation failed.");
    }
  };

  return (
    <div className={`container app-shell app-shell-themed dashboard-theme ${theme === "dark" ? "theme-dark" : "theme-light"}`}>
      <aside className="sidebar card">
        <div>
          <p className="kicker">Smart Campus</p>
          <h2>Service Portal</h2>
          <p className="muted">Professional helpdesk experience for your institute.</p>
        </div>
        <div className="sidebar-menu">
          <button
            className={`menu-item ${activeSection === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveSection("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={`menu-item ${activeSection === "tickets" ? "active" : ""}`}
            onClick={() => setActiveSection("tickets")}
          >
            Tickets
          </button>
          <button
            className={`menu-item ${activeSection === "announcements" ? "active" : ""}`}
            onClick={() => setActiveSection("announcements")}
          >
            Announcements
          </button>
          <button
            className={`menu-item ${activeSection === "analytics" ? "active" : ""}`}
            onClick={() => setActiveSection("analytics")}
          >
            Analytics
          </button>
        </div>
        <div className="sidebar-footer">
          <p className="muted">{user.name}</p>
          <span className="role-chip">{user.role}</span>
          <button onClick={logout} className="btn-secondary">Logout</button>
        </div>
      </aside>

      <main className="dashboard-layout dashboard-main">
        <header className="topbar card">
          <div className="topbar-title">
            <p className="kicker">Operations Console</p>
            <h1>Smart Campus Service Portal</h1>
            <div>
              <p>
                Welcome, {user.name} ({user.role}) - monitor and resolve campus issues faster.
              </p>
            </div>
          </div>
          <button
            className="theme-toggle"
            onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
          >
            {theme === "dark" ? "Light Theme" : "Dark Theme"}
          </button>
        </header>

        {error && <p className="error">{error}</p>}

        {stats && activeSection === "dashboard" && (
          <section className="grid cards stat-grid section-theme section-dashboard">
            <StatCard label="Total Tickets" value={stats.totalTickets} />
            <StatCard label="Open" value={stats.open} />
            <StatCard label="In Progress" value={stats.inProgress} />
            <StatCard label="Resolved" value={stats.resolved} />
            <StatCard label="Announcements" value={stats.announcements} />
          </section>
        )}

        {(activeSection === "dashboard" || activeSection === "tickets") && (
          <>
            {activeSection === "dashboard" && (
              <section className="card panel section-theme section-ticket-create">
                <h2>Create Service Ticket</h2>
                <p className="muted">Submit new service requests with clear category and priority.</p>
                <form onSubmit={createTicket}>
                  <input
                    type="text"
                    placeholder="Title"
                    value={ticketForm.title}
                    onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
                    required
                  />
                  <textarea
                    placeholder="Describe your issue"
                    value={ticketForm.description}
                    onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                    required
                  />
                  <select
                    value={ticketForm.category}
                    onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                  >
                    <option value="maintenance">Maintenance</option>
                    <option value="it_support">IT Support</option>
                    <option value="hostel">Hostel</option>
                    <option value="library">Library</option>
                    <option value="other">Other</option>
                  </select>
                  <select
                    value={ticketForm.priority}
                    onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  <button type="submit" className="btn-primary">Submit Ticket</button>
                </form>
              </section>
            )}

            <section className="card panel section-theme section-tickets">
              <div className="tickets-header">
                <h2>Tickets</h2>
                <div className="ticket-controls">
                  <input
                    type="text"
                    placeholder="Search tickets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
              <div className="list">
                {filteredTickets.map((ticket) => (
                  <div className="list-item ticket-row" key={ticket.id}>
                    <h3 className="item-title">{ticket.title}</h3>
                    <p>{ticket.description}</p>
                    <p className="meta-row">
                      <span className="tag">{ticket.category}</span>
                      <span className={`tag priority-${ticket.priority}`}>{ticket.priority}</span>
                      <span className={`status status-${ticket.status}`}>{ticket.status.replace("_", " ")}</span>
                    </p>
                    <small className="muted">
                      By {ticket.createdByName} | {new Date(ticket.createdAt).toLocaleString()}
                    </small>
                    {isStaffOrAdmin && (
                      <div className="actions">
                        <button className="btn-secondary" onClick={() => updateStatus(ticket.id, "in_progress")}>
                          Mark In Progress
                        </button>
                        <button className="btn-secondary" onClick={() => updateStatus(ticket.id, "resolved")}>
                          Mark Resolved
                        </button>
                        <button className="btn-secondary" onClick={() => updateStatus(ticket.id, "closed")}>
                          Close
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {filteredTickets.length === 0 && <p className="muted">No tickets found for this filter.</p>}
              </div>
            </section>
          </>
        )}

        {(activeSection === "dashboard" || activeSection === "announcements") && (
          <section className="card panel section-theme section-announcements">
            <h2>Announcements</h2>
            <div className="list">
              {announcements.map((a) => (
                <div className="list-item" key={a.id}>
                  <h3 className="item-title">{a.title}</h3>
                  <p>{a.content}</p>
                  <small className="muted">
                    By {a.authorName} | {new Date(a.createdAt).toLocaleString()}
                  </small>
                </div>
              ))}
              {announcements.length === 0 && <p className="muted">No announcements yet.</p>}
            </div>

            {isStaffOrAdmin && (
              <>
                <h3>Create Announcement</h3>
                <form onSubmit={createAnnouncement}>
                  <input
                    type="text"
                    placeholder="Announcement title"
                    value={announcementForm.title}
                    onChange={(e) =>
                      setAnnouncementForm({ ...announcementForm, title: e.target.value })
                    }
                    required
                  />
                  <textarea
                    placeholder="Announcement content"
                    value={announcementForm.content}
                    onChange={(e) =>
                      setAnnouncementForm({ ...announcementForm, content: e.target.value })
                    }
                    required
                  />
                  <button type="submit" className="btn-primary">Publish</button>
                </form>
              </>
            )}
          </section>
        )}

        {activeSection === "analytics" && stats && (
          <section className="card panel section-theme section-analytics">
            <h2>Analytics Overview</h2>
            <p className="muted">Quick performance summary generated from current ticket data.</p>
            <div className="analytics-grid">
              <div className="analytics-item">
                <span className="muted">Resolution Rate</span>
                <strong>
                  {stats.totalTickets === 0
                    ? "0%"
                    : `${Math.round((stats.resolved / stats.totalTickets) * 100)}%`}
                </strong>
              </div>
              <div className="analytics-item">
                <span className="muted">Active Workload</span>
                <strong>{stats.open + stats.inProgress} Tickets</strong>
              </div>
              <div className="analytics-item">
                <span className="muted">Announcement Coverage</span>
                <strong>{stats.announcements} Published</strong>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="card stat-card">
      <h3>{label}</h3>
      <p>{value}</p>
    </div>
  );
}

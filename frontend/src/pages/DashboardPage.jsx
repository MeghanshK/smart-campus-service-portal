import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function DashboardPage({ user, setUser }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [theme, setTheme] = useState(() => localStorage.getItem("dashboardTheme") || "dark");
  const [commentDrafts, setCommentDrafts] = useState({});
  const [queueFilter, setQueueFilter] = useState("all"); // all | unassigned | mine
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);

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
      const matchesQueue =
        !isStaffOrAdmin ||
        queueFilter === "all" ||
        (queueFilter === "unassigned" && !ticket.assignedToId) ||
        (queueFilter === "mine" && ticket.assignedToId === user.id);
      return matchesSearch && matchesStatus && matchesQueue;
    });
  }, [tickets, searchTerm, statusFilter, queueFilter, isStaffOrAdmin, user.id]);

  const nowMs = Date.now();
  const isTicketOverdue = (ticket) => {
    if (!ticket?.dueAt) return false;
    if (ticket.status === "resolved" || ticket.status === "closed") return false;
    return new Date(ticket.dueAt).getTime() < nowMs;
  };

  const buildActivity = (ticket) => {
    const statusEvents = (ticket.statusHistory || []).map((s) => ({
      id: `s-${s.id}`,
      type: "status",
      at: s.at,
      label: `Status changed to "${String(s.to).replace("_", " ")}"`,
      by: s.by
    }));
    const commentEvents = (ticket.comments || []).map((c) => ({
      id: `c-${c.id}`,
      type: "comment",
      at: c.createdAt,
      label: c.message,
      by: `${c.userName} (${c.role})`
    }));
    return [...statusEvents, ...commentEvents].sort((a, b) => new Date(b.at) - new Date(a.at));
  };

  const loadData = async () => {
    setError("");
    setMessage("");
    try {
      const [statsRes, analyticsRes, ticketsRes, announcementRes, notifRes] = await Promise.all([
        api.get("/dashboard/stats"),
        api.get("/dashboard/analytics"),
        api.get("/tickets"),
        api.get("/announcements"),
        api.get("/notifications")
      ]);
      setStats(statsRes.data);
      setAnalytics(analyticsRes.data);
      setTickets(ticketsRes.data);
      setAnnouncements(announcementRes.data);
      setNotifications(notifRes.data);
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
    setError("");
    setMessage("");
    try {
      await api.post("/tickets", ticketForm);
      setTicketForm({
        title: "",
        description: "",
        category: "maintenance",
        priority: "medium"
      });
      await loadData();
      setMessage("Ticket submitted successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Ticket creation failed.");
    }
  };

  const updateStatus = async (id, status) => {
    setError("");
    setMessage("");
    try {
      await api.patch(`/tickets/${id}/status`, { status });
      await loadData();
      setMessage("Ticket status updated.");
    } catch (err) {
      setError(err.response?.data?.message || "Status update failed.");
    }
  };

  const assignToMe = async (id) => {
    setError("");
    setMessage("");
    try {
      await api.patch(`/tickets/${id}/assign`, {});
      await loadData();
      setMessage("Ticket assigned successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Assignment failed.");
    }
  };

  const updatePriority = async (id, priority) => {
    setError("");
    setMessage("");
    try {
      await api.patch(`/tickets/${id}/priority`, { priority });
      await loadData();
      setMessage("Priority updated.");
    } catch (err) {
      setError(err.response?.data?.message || "Priority update failed.");
    }
  };

  const addComment = async (ticketId) => {
    const draft = commentDrafts[ticketId]?.trim();
    if (!draft) return;
    setError("");
    setMessage("");
    try {
      await api.post(`/tickets/${ticketId}/comments`, { message: draft });
      setCommentDrafts((prev) => ({ ...prev, [ticketId]: "" }));
      await loadData();
      setMessage("Comment added.");
    } catch (err) {
      setError(err.response?.data?.message || "Comment failed.");
    }
  };

  const uploadAttachment = async (ticketId) => {
    if (!attachmentFile) return;
    setError("");
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", attachmentFile);
      await api.post(`/tickets/${ticketId}/attachments`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setAttachmentFile(null);
      await loadData();
      setMessage("Attachment uploaded.");
    } catch (err) {
      setError(err.response?.data?.message || "Attachment upload failed.");
    }
  };

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.readAt).length,
    [notifications]
  );

  const markAllRead = async () => {
    try {
      await api.post("/notifications/mark-all-read");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to mark notifications read.");
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
          {user.role === "admin" && (
            <button
              className={`menu-item ${activeSection === "admin" ? "active" : ""}`}
              onClick={() => setActiveSection("admin")}
            >
              Admin Panel
            </button>
          )}
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
          <button className="notif-btn" onClick={() => setNotifOpen((v) => !v)}>
            Notifications {unreadCount > 0 ? `(${unreadCount})` : ""}
          </button>
        </header>

        {notifOpen && (
          <div className="notif-panel">
            <div className="notif-header">
              <h3>Notifications</h3>
              <div className="notif-actions">
                <button className="btn-secondary" onClick={markAllRead}>Mark all read</button>
                <button className="btn-secondary" onClick={() => setNotifOpen(false)}>Close</button>
              </div>
            </div>
            <div className="notif-list">
              {notifications.map((n) => (
                <div key={n.id} className={`notif-item ${n.readAt ? "" : "unread"}`}>
                  <strong>{n.title}</strong>
                  <p className="muted">{n.body}</p>
                  <small className="muted">{new Date(n.createdAt).toLocaleString()}</small>
                </div>
              ))}
              {notifications.length === 0 && <p className="muted">No notifications yet.</p>}
            </div>
          </div>
        )}

        {error && <p className="error">{error}</p>}
        {message && <p className="success">{message}</p>}

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
              {isStaffOrAdmin && (
                <div className="queue-filters">
                  <button
                    className={`chip ${queueFilter === "all" ? "active" : ""}`}
                    onClick={() => setQueueFilter("all")}
                  >
                    All
                  </button>
                  <button
                    className={`chip ${queueFilter === "unassigned" ? "active" : ""}`}
                    onClick={() => setQueueFilter("unassigned")}
                  >
                    Unassigned
                  </button>
                  <button
                    className={`chip ${queueFilter === "mine" ? "active" : ""}`}
                    onClick={() => setQueueFilter("mine")}
                  >
                    Assigned to me
                  </button>
                </div>
              )}
              <div className="list">
                {filteredTickets.map((ticket) => (
                  <div
                    className={`list-item ticket-row ${isTicketOverdue(ticket) ? "overdue" : ""}`}
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    role="button"
                    tabIndex={0}
                  >
                    <h3 className="item-title">{ticket.title}</h3>
                    <p>{ticket.description}</p>
                    <p className="meta-row">
                      <span className="tag">{ticket.category}</span>
                      <span className={`tag priority-${ticket.priority}`}>{ticket.priority}</span>
                      <span className={`status status-${ticket.status}`}>{ticket.status.replace("_", " ")}</span>
                      {ticket.dueAt && (
                        <span className={`sla ${isTicketOverdue(ticket) ? "sla-overdue" : ""}`}>
                          Due: {new Date(ticket.dueAt).toLocaleString()}
                        </span>
                      )}
                    </p>
                    <small className="muted">
                      By {ticket.createdByName} | {new Date(ticket.createdAt).toLocaleString()}
                    </small>
                    {ticket.assignedTo && (
                      <small className="muted">Assigned to: {ticket.assignedTo}</small>
                    )}
                    {isStaffOrAdmin && (
                      <div className="actions">
                        <button className="btn-secondary" onClick={() => assignToMe(ticket.id)}>
                          Assign To Me
                        </button>
                        <select
                          className="inline-select"
                          value={ticket.priority}
                          onChange={(e) => updatePriority(ticket.id, e.target.value)}
                        >
                          <option value="low">Low Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="high">High Priority</option>
                        </select>
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
                    <div className="comment-box">
                      <h4>Activity Timeline</h4>
                      <div className="comment-list">
                        {buildActivity(ticket).map((event) => (
                          <div key={event.id} className="comment-item">
                            <strong>{event.by}</strong> ·{" "}
                            <span className="muted">{new Date(event.at).toLocaleString()}</span>
                            <div className="activity-text">
                              {event.type === "status" ? (
                                <span className="activity-status">{event.label}</span>
                              ) : (
                                <span>{event.label}</span>
                              )}
                            </div>
                          </div>
                        ))}
                        {buildActivity(ticket).length === 0 && <p className="muted">No activity yet.</p>}
                      </div>
                      <div className="comment-form">
                        <input
                          type="text"
                          placeholder="Add a comment..."
                          value={commentDrafts[ticket.id] || ""}
                          onChange={(e) =>
                            setCommentDrafts((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                          }
                        />
                        <button className="btn-primary" onClick={() => addComment(ticket.id)}>
                          Post
                        </button>
                      </div>
                    </div>
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
              {analytics && (
                <>
                  <div className="analytics-item">
                    <span className="muted">Avg Resolution</span>
                    <strong>
                      {analytics.avgResolutionHours === null ? "—" : `${analytics.avgResolutionHours}h`}
                    </strong>
                  </div>
                  <div className="analytics-item">
                    <span className="muted">Overdue Tickets</span>
                    <strong>{analytics.overdueCount}</strong>
                  </div>
                  {analytics.workload && (
                    <div className="analytics-item analytics-wide">
                      <span className="muted">Workload (Assigned)</span>
                      <div className="kv-grid">
                        {Object.entries(analytics.workload).map(([k, v]) => (
                          <div key={k} className="kv">
                            <span className="muted">{k}</span>
                            <strong>{v}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        )}

        {activeSection === "admin" && user.role === "admin" && (
          <AdminPanel setError={setError} setMessage={setMessage} />
        )}

        {selectedTicket && (
          <div className="modal-backdrop" onClick={() => setSelectedTicket(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{selectedTicket.title}</h2>
                <button className="btn-secondary" onClick={() => setSelectedTicket(null)}>
                  Close
                </button>
              </div>
              <p className="muted">{selectedTicket.description}</p>
              <div className="meta-row">
                <span className="tag">{selectedTicket.category}</span>
                <span className={`tag priority-${selectedTicket.priority}`}>{selectedTicket.priority}</span>
                <span className={`status status-${selectedTicket.status}`}>
                  {selectedTicket.status.replace("_", " ")}
                </span>
                {selectedTicket.dueAt && (
                  <span className={`sla ${isTicketOverdue(selectedTicket) ? "sla-overdue" : ""}`}>
                    Due: {new Date(selectedTicket.dueAt).toLocaleString()}
                  </span>
                )}
              </div>

              <div className="modal-section">
                <h3>Attachments</h3>
                <div className="attachments">
                  {(selectedTicket.attachments || []).map((a) => (
                    <a
                      key={a.id}
                      className="attachment"
                      href={`http://localhost:5000${a.url}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {a.originalName} ({Math.round(a.size / 1024)} KB)
                    </a>
                  ))}
                  {(!selectedTicket.attachments || selectedTicket.attachments.length === 0) && (
                    <p className="muted">No attachments uploaded.</p>
                  )}
                </div>
                <div className="attachment-upload">
                  <input type="file" onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)} />
                  <button className="btn-primary" onClick={() => uploadAttachment(selectedTicket.id)}>
                    Upload
                  </button>
                </div>
              </div>

              <div className="modal-section">
                <h3>Activity Timeline</h3>
                <div className="comment-list">
                  {buildActivity(selectedTicket).map((event) => (
                    <div key={event.id} className="comment-item">
                      <strong>{event.by}</strong> ·{" "}
                      <span className="muted">{new Date(event.at).toLocaleString()}</span>
                      <div className="activity-text">
                        {event.type === "status" ? (
                          <span className="activity-status">{event.label}</span>
                        ) : (
                          <span>{event.label}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {isStaffOrAdmin && (
                <div className="modal-actions">
                  <button className="btn-secondary" onClick={() => assignToMe(selectedTicket.id)}>
                    Assign To Me
                  </button>
                  <button className="btn-secondary" onClick={() => updateStatus(selectedTicket.id, "in_progress")}>
                    In Progress
                  </button>
                  <button className="btn-secondary" onClick={() => updateStatus(selectedTicket.id, "resolved")}>
                    Resolve
                  </button>
                  <button className="btn-secondary" onClick={() => updateStatus(selectedTicket.id, "closed")}>
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
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

function AdminPanel({ setError, setMessage }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/users");
      setUsers(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const updateRole = async (userId, role) => {
    setError("");
    setMessage("");
    try {
      await api.patch(`/admin/users/${userId}/role`, { role });
      await loadUsers();
      setMessage("User role updated.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update role.");
    }
  };

  const updateActive = async (userId, isActive) => {
    setError("");
    setMessage("");
    try {
      await api.patch(`/admin/users/${userId}/active`, { isActive });
      await loadUsers();
      setMessage("User status updated.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update user status.");
    }
  };

  return (
    <section className="card panel section-theme section-admin">
      <div className="admin-header">
        <h2>Admin Panel</h2>
        <button className="btn-secondary" onClick={loadUsers}>
          Refresh
        </button>
      </div>
      <p className="muted">Manage users, roles, and access.</p>

      {loading ? (
        <p className="muted">Loading users...</p>
      ) : (
        <div className="admin-table">
          <div className="admin-row admin-head">
            <div>Name</div>
            <div>Email</div>
            <div>Role</div>
            <div>Status</div>
            <div>Actions</div>
          </div>
          {users.map((u) => (
            <div className="admin-row" key={u.id}>
              <div>{u.name}</div>
              <div className="muted">{u.email}</div>
              <div>
                <select value={u.role} onChange={(e) => updateRole(u.id, e.target.value)}>
                  <option value="student">student</option>
                  <option value="staff">staff</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <div>
                <span className={`status ${u.isActive ? "status-open" : "status-closed"}`}>
                  {u.isActive ? "active" : "disabled"}
                </span>
              </div>
              <div className="actions">
                {u.isActive ? (
                  <button className="btn-secondary" onClick={() => updateActive(u.id, false)}>
                    Disable
                  </button>
                ) : (
                  <button className="btn-secondary" onClick={() => updateActive(u.id, true)}>
                    Enable
                  </button>
                )}
              </div>
            </div>
          ))}
          {users.length === 0 && <p className="muted">No users found.</p>}
        </div>
      )}
    </section>
  );
}

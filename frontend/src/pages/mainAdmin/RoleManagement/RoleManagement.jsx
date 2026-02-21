import React, { useState, useEffect } from "react";
import AdminLayout from "../AdminLayout/AdminLayout";
import axios from "axios";
import { FaPlus, FaEdit, FaTrash, FaUserShield, FaUsers, FaUserTag, FaCheck, FaTimes, FaSave, FaKey } from "react-icons/fa";
import "./RoleManagement.css";

const MODULES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "students", label: "Students" },
  { key: "courses", label: "Courses" },
  { key: "batches", label: "Batches" },
  { key: "liveClasses", label: "Live Classes" },
  { key: "liveBatches", label: "Live Batches" },
  { key: "mockTests", label: "Mock Tests" },
  { key: "mockTestFeedback", label: "Mock Test Feedback" },
  { key: "practiceTests", label: "Practice Tests" },
  { key: "payments", label: "Payments" },
  { key: "coupons", label: "Coupons" },
  { key: "notifications", label: "Notifications" },
  { key: "announcements", label: "Announcements" },
  { key: "popupAnnouncements", label: "Popup Announcements" },
  { key: "leads", label: "Leads" },
  { key: "reports", label: "Reports" },
  { key: "faculty", label: "Faculty" },
  { key: "blogs", label: "Blogs" },
  { key: "demoVideos", label: "Demo Videos" },
  { key: "studyMaterials", label: "Study Materials" },
  { key: "pdfManagement", label: "PDF Management" },
  { key: "discussions", label: "Discussions" },
  { key: "bschools", label: "B-Schools" },
  { key: "iimPredictor", label: "IIM Predictor" },
  { key: "responseSheets", label: "Response Sheets" },
  { key: "downloads", label: "Downloads" },
  { key: "gallery", label: "Gallery" },
  { key: "scoreCards", label: "Score Cards" },
  { key: "successStories", label: "Success Stories" },
  { key: "topPerformers", label: "Top Performers" },
  { key: "coursePurchaseContent", label: "Course Page Content" },
  { key: "crm", label: "CRM" },
  { key: "billing", label: "Billing" },
  { key: "roleManagement", label: "Role Management" }
];

const ACTIONS = ["view", "create", "edit", "delete", "export", "approve"];

const getDefaultPermissions = () => {
  const perms = {};
  MODULES.forEach(m => {
    perms[m.key] = { view: false, create: false, edit: false, delete: false, export: false, approve: false };
  });
  return perms;
};

const RoleManagement = () => {
  const [activeTab, setActiveTab] = useState("roles");
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleForm, setRoleForm] = useState({ name: "", description: "", loginRoute: "", permissions: getDefaultPermissions() });

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ fullName: "", email: "", phone: "", password: "", userType: "subadmin", role: "", status: "active" });

  const [assigningUser, setAssigningUser] = useState(null);
  const [assignRoleId, setAssignRoleId] = useState("");

  const token = localStorage.getItem("adminToken");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchRoles();
    fetchUsers();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/admin/roles", { headers });
      setRoles(res.data.roles || []);
    } catch (err) {
      console.error("Error fetching roles:", err);
      showMessage(err.response?.data?.message || "Failed to load roles. Please check your permissions.", true);
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get("/api/admin/admin-users", { headers });
      setUsers(res.data.users || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      showMessage(err.response?.data?.message || "Failed to load admin users. Please check your permissions.", true);
    }
  };

  const showMessage = (msg, isError = false) => {
    if (isError) {
      setError(msg);
      setSuccess("");
    } else {
      setSuccess(msg);
      setError("");
    }
    setTimeout(() => { setError(""); setSuccess(""); }, 3000);
  };

  const openCreateRole = () => {
    setEditingRole(null);
    setRoleForm({ name: "", description: "", loginRoute: "", permissions: getDefaultPermissions() });
    setShowRoleModal(true);
  };

  const openEditRole = (role) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      description: role.description || "",
      loginRoute: role.loginRoute || "",
      permissions: role.permissions || getDefaultPermissions()
    });
    setShowRoleModal(true);
  };

  const handlePermissionChange = (module, action) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: {
          ...prev.permissions[module],
          [action]: !prev.permissions[module]?.[action]
        }
      }
    }));
  };

  const toggleAllForModule = (module) => {
    const current = roleForm.permissions[module] || {};
    const allChecked = ACTIONS.every(a => current[a]);
    const newPerms = {};
    ACTIONS.forEach(a => { newPerms[a] = !allChecked; });
    setRoleForm(prev => ({
      ...prev,
      permissions: { ...prev.permissions, [module]: newPerms }
    }));
  };

  const saveRole = async () => {
    if (!roleForm.name.trim()) {
      showMessage("Role name is required", true);
      return;
    }
    setLoading(true);
    try {
      if (editingRole) {
        await axios.put(`/api/admin/roles/${editingRole._id}`, roleForm, { headers });
        showMessage("Role updated successfully");
      } else {
        await axios.post("/api/admin/roles", roleForm, { headers });
        showMessage("Role created successfully");
      }
      setShowRoleModal(false);
      fetchRoles();
    } catch (err) {
      showMessage(err.response?.data?.message || "Failed to save role", true);
    }
    setLoading(false);
  };

  const deleteRole = async (id) => {
    if (!window.confirm("Are you sure you want to delete this role?")) return;
    try {
      await axios.delete(`/api/admin/roles/${id}`, { headers });
      showMessage("Role deleted successfully");
      fetchRoles();
    } catch (err) {
      showMessage(err.response?.data?.message || "Failed to delete role", true);
    }
  };

  const openCreateUser = () => {
    setEditingUser(null);
    setUserForm({ fullName: "", email: "", phone: "", password: "", userType: "subadmin", role: "", status: "active" });
    setShowUserModal(true);
  };

  const openEditUser = (user) => {
    setEditingUser(user);
    setUserForm({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || "",
      password: "",
      userType: user.userType,
      role: user.role?._id || "",
      status: user.status
    });
    setShowUserModal(true);
  };

  const saveUser = async () => {
    if (!userForm.fullName.trim() || !userForm.email.trim()) {
      showMessage("Name and email are required", true);
      return;
    }
    if (!editingUser && !userForm.password) {
      showMessage("Password is required for new users", true);
      return;
    }
    setLoading(true);
    try {
      const payload = { ...userForm };
      if (!payload.password) delete payload.password;
      if (!payload.role) payload.role = null;

      if (editingUser) {
        await axios.put(`/api/admin/admin-users/${editingUser._id}`, payload, { headers });
        showMessage("User updated successfully");
      } else {
        await axios.post("/api/admin/admin-users", payload, { headers });
        showMessage("User created successfully");
      }
      setShowUserModal(false);
      fetchUsers();
    } catch (err) {
      showMessage(err.response?.data?.message || "Failed to save user", true);
    }
    setLoading(false);
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await axios.delete(`/api/admin/admin-users/${id}`, { headers });
      showMessage("User deleted successfully");
      fetchUsers();
    } catch (err) {
      showMessage(err.response?.data?.message || "Failed to delete user", true);
    }
  };

  const toggleUserStatus = async (id) => {
    try {
      await axios.put(`/api/admin/admin-users/${id}/toggle-status`, {}, { headers });
      showMessage("User status updated");
      fetchUsers();
    } catch (err) {
      showMessage(err.response?.data?.message || "Failed to update status", true);
    }
  };

  const openAssignRole = (user) => {
    setAssigningUser(user);
    setAssignRoleId(user.role?._id || "");
  };

  const saveAssignedRole = async () => {
    if (!assigningUser) return;
    setLoading(true);
    try {
      await axios.put(`/api/admin/admin-users/${assigningUser._id}/assign-role`, { roleId: assignRoleId || null }, { headers });
      showMessage("Role assigned successfully");
      setAssigningUser(null);
      fetchUsers();
    } catch (err) {
      showMessage(err.response?.data?.message || "Failed to assign role", true);
    }
    setLoading(false);
  };

  return (
    <AdminLayout>
      <div className="role-management">
        <h1 className="page-title"><FaUserShield /> Role Management</h1>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="tabs">
          <button className={`tab ${activeTab === "roles" ? "active" : ""}`} onClick={() => setActiveTab("roles")}>
            <FaUserTag /> Roles
          </button>
          <button className={`tab ${activeTab === "users" ? "active" : ""}`} onClick={() => setActiveTab("users")}>
            <FaUsers /> Admin Users
          </button>
          <button className={`tab ${activeTab === "assign" ? "active" : ""}`} onClick={() => setActiveTab("assign")}>
            <FaKey /> Assign Roles
          </button>
        </div>

        {activeTab === "roles" && (
          <div className="tab-content">
            <div className="section-header">
              <h2>Manage Roles</h2>
              <button className="btn btn-primary" onClick={openCreateRole}><FaPlus /> Create Role</button>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Login Route</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map(role => (
                    <tr key={role._id}>
                      <td><strong>{role.name}</strong></td>
                      <td>{role.description || "-"}</td>
                      <td>{role.loginRoute ? <code>/role/{role.loginRoute}</code> : "-"}</td>
                      <td>{new Date(role.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button className="btn-icon" title="Edit" onClick={() => openEditRole(role)}><FaEdit /></button>
                        <button className="btn-icon btn-danger" title="Delete" onClick={() => deleteRole(role._id)}><FaTrash /></button>
                      </td>
                    </tr>
                  ))}
                  {loading && roles.length === 0 && <tr><td colSpan="5" className="empty">Loading roles...</td></tr>}
                  {!loading && roles.length === 0 && <tr><td colSpan="5" className="empty">No roles found. Click "Create Role" to add one.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="tab-content">
            <div className="section-header">
              <h2>Admin Users</h2>
              <button className="btn btn-primary" onClick={openCreateUser}><FaPlus /> Create User</button>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Type</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user._id}>
                      <td><strong>{user.fullName}</strong></td>
                      <td>{user.email}</td>
                      <td><span className={`badge badge-${user.userType}`}>{user.userType}</span></td>
                      <td>{user.role?.name || <em>No role</em>}</td>
                      <td>
                        <span className={`status-badge ${user.status}`}>{user.status}</span>
                      </td>
                      <td>
                        <button className="btn-icon" title="Edit" onClick={() => openEditUser(user)}><FaEdit /></button>
                        {user.userType !== "superadmin" && (
                          <>
                            <button className="btn-icon" title="Toggle Status" onClick={() => toggleUserStatus(user._id)}>
                              {user.status === "active" ? <FaTimes /> : <FaCheck />}
                            </button>
                            <button className="btn-icon btn-danger" title="Delete" onClick={() => deleteUser(user._id)}><FaTrash /></button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && <tr><td colSpan="6" className="empty">No users found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "assign" && (
          <div className="tab-content">
            <div className="section-header">
              <h2>Assign Roles to Users</h2>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Type</th>
                    <th>Current Role</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u => u.userType !== "superadmin").map(user => (
                    <tr key={user._id}>
                      <td><strong>{user.fullName}</strong></td>
                      <td>{user.email}</td>
                      <td><span className={`badge badge-${user.userType}`}>{user.userType}</span></td>
                      <td>{user.role?.name || <em>No role assigned</em>}</td>
                      <td>
                        {assigningUser?._id === user._id ? (
                          <div className="assign-inline">
                            <select value={assignRoleId} onChange={e => setAssignRoleId(e.target.value)}>
                              <option value="">-- No Role --</option>
                              {roles.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                            </select>
                            <button className="btn btn-sm btn-success" onClick={saveAssignedRole} disabled={loading}><FaSave /></button>
                            <button className="btn btn-sm btn-secondary" onClick={() => setAssigningUser(null)}><FaTimes /></button>
                          </div>
                        ) : (
                          <button className="btn btn-sm btn-primary" onClick={() => openAssignRole(user)}><FaUserTag /> Assign</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.filter(u => u.userType !== "superadmin").length === 0 && (
                    <tr><td colSpan="5" className="empty">No assignable users found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showRoleModal && (
          <div className="modal-overlay" onClick={() => setShowRoleModal(false)}>
            <div className="modal role-modal" onClick={e => e.stopPropagation()}>
              <h2>{editingRole ? "Edit Role" : "Create Role"}</h2>
              <div className="form-group">
                <label>Role Name *</label>
                <input type="text" value={roleForm.name} onChange={e => setRoleForm({ ...roleForm, name: e.target.value })} placeholder="e.g., Content Manager" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={roleForm.description} onChange={e => setRoleForm({ ...roleForm, description: e.target.value })} placeholder="Brief description of this role" />
              </div>
              <div className="form-group">
                <label>Login Route (optional)</label>
                <div className="login-route-input">
                  <span className="route-prefix">/role/</span>
                  <input type="text" value={roleForm.loginRoute} onChange={e => setRoleForm({ ...roleForm, loginRoute: e.target.value.replace(/[^a-zA-Z0-9-_]/g, '').toLowerCase() })} placeholder="e.g., lead, counselor" />
                </div>
                <small className="form-hint">Users with this role can log in at /role/{roleForm.loginRoute || 'slug'}</small>
              </div>
              <div className="permissions-section">
                <h3>Permissions</h3>
                <div className="permissions-grid">
                  <div className="perm-header">
                    <span>Module</span>
                    {ACTIONS.map(a => <span key={a} className="action-label">{a}</span>)}
                    <span>All</span>
                  </div>
                  {MODULES.map(mod => (
                    <div key={mod.key} className="perm-row">
                      <span className="module-label">{mod.label}</span>
                      {ACTIONS.map(action => (
                        <label key={action} className="checkbox-cell">
                          <input
                            type="checkbox"
                            checked={roleForm.permissions[mod.key]?.[action] || false}
                            onChange={() => handlePermissionChange(mod.key, action)}
                          />
                        </label>
                      ))}
                      <button className="btn-toggle-all" onClick={() => toggleAllForModule(mod.key)}>Toggle</button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowRoleModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveRole} disabled={loading}>
                  {loading ? "Saving..." : "Save Role"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showUserModal && (
          <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
            <div className="modal user-modal" onClick={e => e.stopPropagation()}>
              <h2>{editingUser ? "Edit User" : "Create Admin User"}</h2>
              <div className="form-group">
                <label>Full Name *</label>
                <input type="text" value={userForm.fullName} onChange={e => setUserForm({ ...userForm, fullName: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="text" value={userForm.phone} onChange={e => setUserForm({ ...userForm, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label>{editingUser ? "New Password (leave blank to keep)" : "Password *"}</label>
                <input type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>User Type</label>
                  <select value={userForm.userType} onChange={e => setUserForm({ ...userForm, userType: e.target.value })}>
                    <option value="subadmin">Subadmin</option>
                    <option value="teacher">Teacher</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                    <option value="">-- No Role --</option>
                    {roles.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={userForm.status} onChange={e => setUserForm({ ...userForm, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowUserModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveUser} disabled={loading}>
                  {loading ? "Saving..." : "Save User"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default RoleManagement;

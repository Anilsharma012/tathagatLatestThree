import React, { useEffect, useState, useMemo } from "react";
import AdminLayout from "../AdminLayout/AdminLayout";
import axios from "axios";
import "./AllUsers.css";

const AllUsers = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchPaidUsers = async () => {
      try {
        const token = localStorage.getItem("adminToken");
        const res = await axios.get("/api/admin/paid-users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(res.data.users);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };
    fetchPaidUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase().trim();
    return users?.filter(Boolean).filter(
      (u) =>
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.phoneNumber || "").includes(q)
    );
  }, [users, search]);

  const exportCSV = () => {
    const data = filteredUsers;
    if (!data || data.length === 0) return;
    const headers = ["Sr.No", "Name", "Email", "Phone", "Courses"];
    const rows = data.map((u, i) => [
      i + 1,
      (u?.name || "").replace(/,/g, " "),
      u?.email || "",
      u?.phoneNumber || "",
      (u?.enrolledCourses?.filter(ec => ec?.status === "unlocked" && ec?.courseId)
        .map(ec => ec?.courseId?.name || "Course removed").join(" | ") || "")
        .replace(/,/g, " "),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `all_users_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="users-page">
        <div className="users-header">
          <h1 className="page-title">All Users Who Purchased Courses</h1>
          <div className="users-header-actions">
            <input
              type="text"
              className="users-search"
              placeholder="Search by name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="export-csv-btn" onClick={exportCSV}>
              Export CSV
            </button>
          </div>
        </div>

        <div className="user-table-wrapper">
          <table className="user-table">
            <thead>
              <tr>
                <th>Sr. No</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Courses</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers?.filter(Boolean).map((user, index) => (
                <tr key={user?._id || index}>
                  <td>{index + 1}</td>
                  <td>{user?.name || "N/A"}</td>
                  <td>{user?.email || "N/A"}</td>
                  <td>{user?.phoneNumber || "N/A"}</td>
                  <td>
                    <ul>
                      {user?.enrolledCourses
                        ?.filter((ec) => ec?.status === "unlocked" && ec?.courseId)
                        .map((ec, i) => (
                          <li key={ec?.courseId?._id || i}>
                            {ec?.courseId?.name || "Course removed"}
                          </li>
                        ))}
                    </ul>
                  </td>
                </tr>
              ))}
              {(!filteredUsers || filteredUsers.length === 0) && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "#999" }}>
                    {search ? "No users match your search" : "No users found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AllUsers;

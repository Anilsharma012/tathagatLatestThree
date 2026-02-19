import React, { useEffect, useState, useMemo } from "react";
import AdminLayout from "../AdminLayout/AdminLayout";
import axios from "axios";
import "./AllStudents.css";

const ITEMS_PER_PAGE = 20;

const AllStudents = () => {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    selectedCategory: "",
    selectedExam: "",
  });

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = localStorage.getItem("adminToken");
        const res = await axios.get("/api/admin/get-students", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStudents(res.data.students);
      } catch (error) {
        console.error("Failed to fetch students:", error);
      }
    };
    fetchStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase().trim();
    return students.filter(
      (s) =>
        (s.name || "").toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q) ||
        (s.phoneNumber || "").includes(q) ||
        (s.selectedCategory || "").toLowerCase().includes(q) ||
        (s.selectedExam || "").toLowerCase().includes(q)
    );
  }, [students, search]);

  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const handleEdit = (student) => {
    setEditingStudent(student);
    setEditForm({
      name: student.name || "",
      email: student.email || "",
      phoneNumber: student.phoneNumber || "",
      selectedCategory: student.selectedCategory || "",
      selectedExam: student.selectedExam || "",
    });
  };

  const handleUpdate = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const res = await axios.put(
        `/api/admin/update-student/${editingStudent._id}`,
        editForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updated = res.data.student;
      setStudents((prev) =>
        prev.map((s) => (s._id === updated._id ? updated : s))
      );
      alert("Student updated successfully!");
      setEditingStudent(null);
    } catch (error) {
      console.error("Update failed", error);
      alert("Failed to update student.");
    }
  };

  const handleDelete = async (id) => {
    const confirm = window.confirm("Are you sure you want to delete this student?");
    if (!confirm) return;
    try {
      const token = localStorage.getItem("adminToken");
      await axios.delete(`/api/admin/delete-student/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStudents((prev) => prev.filter((s) => s._id !== id));
      alert("Student deleted successfully!");
    } catch (err) {
      console.error("Delete failed", err);
      alert("Something went wrong!");
    }
  };

  const exportCSV = () => {
    const data = filteredStudents;
    if (data.length === 0) return;
    const headers = ["Sr.No", "Name", "Email", "Phone", "Category", "Exam", "Joined"];
    const rows = data.map((s, i) => [
      i + 1,
      (s.name || "").replace(/,/g, " "),
      s.email || "",
      s.phoneNumber || "",
      s.selectedCategory || "",
      s.selectedExam || "",
      s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `all_students_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="students-page">
        <div className="students-header">
          <h1 className="page-title">All Registered Students</h1>
          <div className="students-header-actions">
            <input
              type="text"
              className="students-search"
              placeholder="Search by name, email, phone, category, exam..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="export-csv-btn" onClick={exportCSV}>
              Export CSV
            </button>
          </div>
        </div>

        <div className="students-info-bar">
          <span>Showing {paginatedStudents.length} of {filteredStudents.length} students</span>
          {search && <span className="search-tag">Search: "{search}"</span>}
        </div>

        <div className="student-table-wrapper">
          <table className="student-table">
            <thead>
              <tr>
                <th>Sr.No</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Category</th>
                <th>Exam</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.map((student, index) => (
                <tr key={student._id}>
                  <td>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                  <td>{student.name}</td>
                  <td>{student.email}</td>
                  <td>{student.phoneNumber}</td>
                  <td>{student.selectedCategory || "-"}</td>
                  <td>{student.selectedExam || "-"}</td>
                  <td>{new Date(student.createdAt).toLocaleDateString()}</td>
                  <td className="action-icons">
                    <button title="View" onClick={() => window.location.assign(`/admin/students/${student._id}`)} className="edit-btn">👁️</button>
                    <button title="Edit" onClick={() => handleEdit(student)} className="edit-btn">✏️</button>
                    <button title="Delete" onClick={() => handleDelete(student._id)} className="delete-btn">🗑️</button>
                  </td>
                </tr>
              ))}
              {paginatedStudents.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "40px", color: "#999" }}>
                    {search ? "No students match your search" : "No students found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="students-pagination">
            <button
              className="pagination-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
            >
              First
            </button>
            <button
              className="pagination-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Prev
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page;
              if (totalPages <= 5) {
                page = i + 1;
              } else if (currentPage <= 3) {
                page = i + 1;
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i;
              } else {
                page = currentPage - 2 + i;
              }
              return (
                <button
                  key={page}
                  className={`pagination-btn ${currentPage === page ? "active" : ""}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              );
            })}
            <button
              className="pagination-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </button>
            <button
              className="pagination-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
            >
              Last
            </button>
          </div>
        )}
      </div>

      {editingStudent && (
        <div className="edit-modal">
          <div className="edit-modal-content">
            <h2>Edit Student</h2>
            <label>Name:</label>
            <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            <label>Email:</label>
            <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            <label>Phone:</label>
            <input type="text" value={editForm.phoneNumber} onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })} />
            <label>Category:</label>
            <input type="text" value={editForm.selectedCategory} onChange={(e) => setEditForm({ ...editForm, selectedCategory: e.target.value })} />
            <label>Exam:</label>
            <input type="text" value={editForm.selectedExam} onChange={(e) => setEditForm({ ...editForm, selectedExam: e.target.value })} />
            <div className="edit-actions">
              <button onClick={handleUpdate}>Update</button>
              <button className="cancel" onClick={() => setEditingStudent(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AllStudents;

import React, { useState, useEffect } from "react";
import AdminLayout from "../AdminLayout/AdminLayout";
import axios from "axios";
import { FaPlus, FaEdit, FaTrash, FaChevronDown, FaChevronRight, FaToggleOn, FaToggleOff } from "react-icons/fa";
import "./OnboardingCategoryManagement.css";

const OnboardingCategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingExam, setEditingExam] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", displayOrder: 0 });
  const [examForm, setExamForm] = useState({ name: "", displayOrder: 0 });

  const token = localStorage.getItem("adminToken");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/onboarding-categories", { headers });
      setCategories(res.data.categories || []);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) return alert("Category name is required");
    try {
      if (editingCategory) {
        await axios.put(`/api/onboarding-categories/${editingCategory._id}`, categoryForm, { headers });
      } else {
        await axios.post("/api/onboarding-categories", categoryForm, { headers });
      }
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCategoryForm({ name: "", displayOrder: 0 });
      fetchCategories();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save category");
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm("Are you sure you want to delete this category and all its exams?")) return;
    try {
      await axios.delete(`/api/onboarding-categories/${id}`, { headers });
      fetchCategories();
    } catch (err) {
      alert("Failed to delete category");
    }
  };

  const handleToggleCategory = async (cat) => {
    try {
      await axios.put(`/api/onboarding-categories/${cat._id}`, { isActive: !cat.isActive }, { headers });
      fetchCategories();
    } catch (err) {
      alert("Failed to update category");
    }
  };

  const handleSaveExam = async () => {
    if (!examForm.name.trim()) return alert("Exam name is required");
    try {
      if (editingExam) {
        await axios.put(
          `/api/onboarding-categories/${selectedCategoryId}/exams/${editingExam._id}`,
          examForm,
          { headers }
        );
      } else {
        await axios.post(`/api/onboarding-categories/${selectedCategoryId}/exams`, examForm, { headers });
      }
      setShowExamModal(false);
      setEditingExam(null);
      setExamForm({ name: "", displayOrder: 0 });
      fetchCategories();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save exam");
    }
  };

  const handleDeleteExam = async (catId, examId) => {
    if (!window.confirm("Are you sure you want to delete this exam?")) return;
    try {
      await axios.delete(`/api/onboarding-categories/${catId}/exams/${examId}`, { headers });
      fetchCategories();
    } catch (err) {
      alert("Failed to delete exam");
    }
  };

  const handleToggleExam = async (catId, exam) => {
    try {
      await axios.put(
        `/api/onboarding-categories/${catId}/exams/${exam._id}`,
        { isActive: !exam.isActive },
        { headers }
      );
      fetchCategories();
    } catch (err) {
      alert("Failed to update exam");
    }
  };

  const openEditCategory = (cat) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name, displayOrder: cat.displayOrder });
    setShowCategoryModal(true);
  };

  const openAddExam = (catId) => {
    setSelectedCategoryId(catId);
    setEditingExam(null);
    setExamForm({ name: "", displayOrder: 0 });
    setShowExamModal(true);
  };

  const openEditExam = (catId, exam) => {
    setSelectedCategoryId(catId);
    setEditingExam(exam);
    setExamForm({ name: exam.name, displayOrder: exam.displayOrder });
    setShowExamModal(true);
  };

  return (
    <AdminLayout>
      <div className="obc-page">
        <div className="obc-header">
          <div>
            <h2 className="page-title">Exam Categories & Exams</h2>
            <p className="obc-subtitle">Manage categories and exams shown during student signup onboarding</p>
          </div>
          <button
            className="obc-add-btn"
            onClick={() => {
              setEditingCategory(null);
              setCategoryForm({ name: "", displayOrder: 0 });
              setShowCategoryModal(true);
            }}
          >
            <FaPlus /> Add Category
          </button>
        </div>

        {loading ? (
          <div className="obc-loading">Loading...</div>
        ) : categories.length === 0 ? (
          <div className="obc-empty">
            <p>No exam categories yet. Add your first category to get started.</p>
          </div>
        ) : (
          <div className="obc-list">
            {categories.map((cat) => (
              <div key={cat._id} className={`obc-card ${!cat.isActive ? "obc-inactive" : ""}`}>
                <div
                  className="obc-card-header"
                  onClick={() => setExpandedCategory(expandedCategory === cat._id ? null : cat._id)}
                >
                  <div className="obc-card-left">
                    {expandedCategory === cat._id ? <FaChevronDown /> : <FaChevronRight />}
                    <h3>{cat.name}</h3>
                    <span className={`obc-badge ${cat.isActive ? "active" : "inactive"}`}>
                      {cat.isActive ? "Active" : "Inactive"}
                    </span>
                    <span className="obc-count">{cat.exams?.length || 0} exams</span>
                  </div>
                  <div className="obc-card-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="obc-icon-btn" title="Toggle Active" onClick={() => handleToggleCategory(cat)}>
                      {cat.isActive ? <FaToggleOn className="toggle-on" /> : <FaToggleOff className="toggle-off" />}
                    </button>
                    <button className="obc-icon-btn edit" title="Edit" onClick={() => openEditCategory(cat)}>
                      <FaEdit />
                    </button>
                    <button className="obc-icon-btn delete" title="Delete" onClick={() => handleDeleteCategory(cat._id)}>
                      <FaTrash />
                    </button>
                  </div>
                </div>

                {expandedCategory === cat._id && (
                  <div className="obc-exams">
                    <div className="obc-exams-header">
                      <span>Exams in this category</span>
                      <button className="obc-add-exam-btn" onClick={() => openAddExam(cat._id)}>
                        <FaPlus /> Add Exam
                      </button>
                    </div>
                    {cat.exams && cat.exams.length > 0 ? (
                      <div className="obc-exam-list">
                        {[...cat.exams].sort((a, b) => a.displayOrder - b.displayOrder).map((exam) => (
                          <div key={exam._id} className={`obc-exam-item ${!exam.isActive ? "obc-inactive" : ""}`}>
                            <div className="obc-exam-info">
                              <span className="obc-exam-name">{exam.name}</span>
                              <span className={`obc-badge small ${exam.isActive ? "active" : "inactive"}`}>
                                {exam.isActive ? "Active" : "Inactive"}
                              </span>
                            </div>
                            <div className="obc-exam-actions">
                              <button className="obc-icon-btn" onClick={() => handleToggleExam(cat._id, exam)}>
                                {exam.isActive ? <FaToggleOn className="toggle-on" /> : <FaToggleOff className="toggle-off" />}
                              </button>
                              <button className="obc-icon-btn edit" onClick={() => openEditExam(cat._id, exam)}>
                                <FaEdit />
                              </button>
                              <button className="obc-icon-btn delete" onClick={() => handleDeleteExam(cat._id, exam._id)}>
                                <FaTrash />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="obc-no-exams">No exams added yet</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {showCategoryModal && (
          <div className="obc-modal-overlay" onClick={() => setShowCategoryModal(false)}>
            <div className="obc-modal" onClick={(e) => e.stopPropagation()}>
              <h3>{editingCategory ? "Edit Category" : "Add Category"}</h3>
              <div className="obc-form-group">
                <label>Category Name</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="e.g., MBA, After 12, GMAT"
                />
              </div>
              <div className="obc-form-group">
                <label>Display Order</label>
                <input
                  type="number"
                  value={categoryForm.displayOrder}
                  onChange={(e) => setCategoryForm({ ...categoryForm, displayOrder: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="obc-modal-actions">
                <button className="obc-cancel-btn" onClick={() => setShowCategoryModal(false)}>Cancel</button>
                <button className="obc-save-btn" onClick={handleSaveCategory}>
                  {editingCategory ? "Update" : "Add"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showExamModal && (
          <div className="obc-modal-overlay" onClick={() => setShowExamModal(false)}>
            <div className="obc-modal" onClick={(e) => e.stopPropagation()}>
              <h3>{editingExam ? "Edit Exam" : "Add Exam"}</h3>
              <div className="obc-form-group">
                <label>Exam Name</label>
                <input
                  type="text"
                  value={examForm.name}
                  onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
                  placeholder="e.g., CAT, XAT, SNAP"
                />
              </div>
              <div className="obc-form-group">
                <label>Display Order</label>
                <input
                  type="number"
                  value={examForm.displayOrder}
                  onChange={(e) => setExamForm({ ...examForm, displayOrder: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="obc-modal-actions">
                <button className="obc-cancel-btn" onClick={() => setShowExamModal(false)}>Cancel</button>
                <button className="obc-save-btn" onClick={handleSaveExam}>
                  {editingExam ? "Update" : "Add"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default OnboardingCategoryManagement;

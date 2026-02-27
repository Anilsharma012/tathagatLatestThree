import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FaEdit, FaTrash, FaPlus, FaTimes, FaClipboardList, FaQuestionCircle } from 'react-icons/fa';
import './CourseMockTestManager.css';

const CourseMockTestManager = ({ course, onClose }) => {
  const [series, setSeries] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [showAddSeriesForm, setShowAddSeriesForm] = useState(false);
  const [showAddTestForm, setShowAddTestForm] = useState(false);
  const [editingSeries, setEditingSeries] = useState(null);
  const [editingTest, setEditingTest] = useState(null);

  const [seriesFormData, setSeriesFormData] = useState({
    title: '',
    category: 'Modular',
    description: '',
    price: 0,
    validity: 365
  });

  const [testFormData, setTestFormData] = useState({
    title: '',
    description: '',
    duration: 120,
    totalQuestions: 66,
    testType: 'modular',
    exam: 'CAT',
    yearLabel: '2025'
  });

  const categoryOptions = [
    { value: 'Modular', label: 'Modular Tests' },
    { value: 'Sessional', label: 'Sectional Tests' },
    { value: 'Full', label: 'Full Tests' },
    { value: 'Final', label: 'Final Tests' },
    { value: 'Previous Year', label: 'Previous Year Papers' }
  ];

  const fetchSeries = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`/api/courses/${course._id}/mock-test-series`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSeries(res.data.series || []);
    } catch (error) {
      console.error('Error fetching mock test series:', error);
    } finally {
      setLoading(false);
    }
  }, [course._id]);

  const fetchTests = useCallback(async (seriesId) => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`/api/courses/${course._id}/mock-test-series/${seriesId}/tests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTests(res.data.tests || []);
    } catch (error) {
      console.error('Error fetching tests:', error);
    }
  }, [course._id]);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  useEffect(() => {
    if (selectedSeries) {
      fetchTests(selectedSeries._id);
    } else {
      setTests([]);
    }
  }, [selectedSeries, fetchTests]);

  const handleSeriesInputChange = (field, value) => {
    setSeriesFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTestInputChange = (field, value) => {
    setTestFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddSeries = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      
      const payload = {
        ...seriesFormData,
        courseId: course._id
      };

      if (editingSeries) {
        await axios.put(`/api/courses/${course._id}/mock-test-series/${editingSeries._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Series updated successfully');
      } else {
        await axios.post(`/api/courses/${course._id}/mock-test-series`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Series added successfully');
      }

      resetSeriesForm();
      fetchSeries();
    } catch (error) {
      console.error('Error saving series:', error);
      alert('Failed to save series: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleAddTest = async (e) => {
    e.preventDefault();
    if (!selectedSeries) {
      alert('Please select a series first');
      return;
    }
    
    if (!testFormData.title.trim()) {
      alert('Test title is required');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      
      const payload = {
        title: testFormData.title.trim(),
        description: testFormData.description.trim(),
        duration: parseInt(testFormData.duration) || 120,
        totalQuestions: parseInt(testFormData.totalQuestions) || 66,
        testType: testFormData.testType,
        exam: testFormData.exam,
        yearLabel: testFormData.yearLabel
      };

      if (editingTest) {
        await axios.put(`/api/courses/${course._id}/mock-test-series/${selectedSeries._id}/tests/${editingTest._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Test updated successfully');
      } else {
        await axios.post(`/api/courses/${course._id}/mock-test-series/${selectedSeries._id}/tests`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Test added successfully');
      }

      resetTestForm();
      fetchTests(selectedSeries._id);
    } catch (error) {
      console.error('Error saving test:', error);
      alert('Failed to save test: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSeries = async (seriesId) => {
    if (!window.confirm('Are you sure you want to delete this series and all its tests?')) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      await axios.delete(`/api/courses/${course._id}/mock-test-series/${seriesId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Series deleted successfully');
      if (selectedSeries?._id === seriesId) {
        setSelectedSeries(null);
      }
      fetchSeries();
    } catch (error) {
      console.error('Error deleting series:', error);
      alert('Failed to delete series');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTest = async (testId) => {
    if (!window.confirm('Are you sure you want to delete this test?')) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      await axios.delete(`/api/courses/${course._id}/mock-test-series/${selectedSeries._id}/tests/${testId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Test deleted successfully');
      fetchTests(selectedSeries._id);
    } catch (error) {
      console.error('Error deleting test:', error);
      alert('Failed to delete test');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSeries = (seriesItem) => {
    setEditingSeries(seriesItem);
    setSeriesFormData({
      title: seriesItem.title || '',
      category: seriesItem.category || 'Modular',
      description: seriesItem.description || '',
      price: seriesItem.price || 0,
      validity: seriesItem.validity || 365
    });
    setShowAddSeriesForm(true);
  };

  const handleEditTest = (test) => {
    setEditingTest(test);
    setTestFormData({
      title: test.title || '',
      description: test.description || '',
      duration: test.duration || 120,
      totalQuestions: test.totalQuestions || 66,
      testType: test.testType || 'modular',
      exam: test.exam || 'CAT',
      yearLabel: test.yearLabel || '2025'
    });
    setShowAddTestForm(true);
  };

  const resetSeriesForm = () => {
    setSeriesFormData({
      title: '',
      category: 'Modular',
      description: '',
      price: 0,
      validity: 365
    });
    setEditingSeries(null);
    setShowAddSeriesForm(false);
  };

  const resetTestForm = () => {
    setTestFormData({
      title: '',
      description: '',
      duration: 120,
      totalQuestions: 66,
      testType: 'modular',
      exam: 'CAT',
      yearLabel: '2025'
    });
    setEditingTest(null);
    setShowAddTestForm(false);
  };

  return (
    <div className="course-mock-test-backdrop" onClick={onClose}>
      <div className="course-mock-test-modal" onClick={(e) => e.stopPropagation()}>
        <div className="course-mock-test-header">
          <div>
            <h2 className="course-mock-test-title">Mock Test Management</h2>
            <p className="course-mock-test-subtitle">{course.name}</p>
          </div>
          <button className="course-mock-test-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="course-mock-test-content">
          <div className="course-mock-test-sidebar">
            <div className="sidebar-header">
              <h3>Test Series</h3>
              <button 
                className="btn-add-series"
                onClick={() => setShowAddSeriesForm(true)}
              >
                <FaPlus /> Add Series
              </button>
            </div>

            {loading && <div className="loading-text">Loading...</div>}

            <div className="series-list">
              {series.length === 0 && !loading && (
                <p className="no-data-text">No test series yet. Create one to get started.</p>
              )}
              {series.map((s) => (
                <div 
                  key={s._id}
                  className={`series-item ${selectedSeries?._id === s._id ? 'active' : ''}`}
                  onClick={() => setSelectedSeries(s)}
                >
                  <div className="series-item-content">
                    <span className="series-category-badge">{s.category}</span>
                    <span className="series-title">{s.title}</span>
                    <span className="series-test-count">{s.testCount || 0} tests</span>
                  </div>
                  <div className="series-actions">
                    <button onClick={(e) => { e.stopPropagation(); handleEditSeries(s); }}>
                      <FaEdit />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteSeries(s._id); }}>
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="course-mock-test-main">
            {selectedSeries ? (
              <>
                <div className="main-header">
                  <h3>{selectedSeries.title} - Tests</h3>
                  <button 
                    className="btn-add-test"
                    onClick={() => setShowAddTestForm(true)}
                  >
                    <FaPlus /> Add Test
                  </button>
                </div>

                <div className="tests-list">
                  {tests.length === 0 && (
                    <p className="no-data-text">No tests in this series. Add one to get started.</p>
                  )}
                  {tests.map((test) => (
                    <div key={test._id} className="test-item">
                      <div className="test-item-content">
                        <div className="test-icon">
                          <FaClipboardList />
                        </div>
                        <div className="test-details">
                          <h4>{test.title}</h4>
                          <p>{test.description || 'No description'}</p>
                          <div className="test-meta">
                            <span>{test.duration} mins</span>
                            <span>{test.totalQuestions} questions</span>
                            <span>{test.exam}</span>
                          </div>
                        </div>
                      </div>
                      <div className="test-actions">
                        <button 
                          className="btn-questions"
                          onClick={() => alert('Question builder coming soon!')}
                          title="Manage Questions"
                        >
                          <FaQuestionCircle /> Questions
                        </button>
                        <button onClick={() => handleEditTest(test)}>
                          <FaEdit />
                        </button>
                        <button onClick={() => handleDeleteTest(test._id)}>
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="no-selection">
                <FaClipboardList size={48} />
                <p>Select a test series from the left to view and manage tests</p>
              </div>
            )}
          </div>
        </div>

        {showAddSeriesForm && (
          <div className="form-overlay" onClick={resetSeriesForm}>
            <div className="form-modal" onClick={(e) => e.stopPropagation()}>
              <h3>{editingSeries ? 'Edit Series' : 'Add New Series'}</h3>
              <form onSubmit={handleAddSeries}>
                <div className="form-group">
                  <label>Series Title</label>
                  <input
                    type="text"
                    value={seriesFormData.title}
                    onChange={(e) => handleSeriesInputChange('title', e.target.value)}
                    placeholder="Enter series title"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={seriesFormData.category}
                    onChange={(e) => handleSeriesInputChange('category', e.target.value)}
                  >
                    {categoryOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={seriesFormData.description}
                    onChange={(e) => handleSeriesInputChange('description', e.target.value)}
                    placeholder="Enter description"
                    rows={3}
                  />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn-cancel" onClick={resetSeriesForm}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-save" disabled={loading}>
                    {loading ? 'Saving...' : (editingSeries ? 'Update' : 'Add Series')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAddTestForm && (
          <div className="form-overlay" onClick={resetTestForm}>
            <div className="form-modal" onClick={(e) => e.stopPropagation()}>
              <h3>{editingTest ? 'Edit Test' : 'Add New Test'}</h3>
              <form onSubmit={handleAddTest}>
                <div className="form-group">
                  <label>Test Title</label>
                  <input
                    type="text"
                    value={testFormData.title}
                    onChange={(e) => handleTestInputChange('title', e.target.value)}
                    placeholder="Enter test title"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={testFormData.description}
                    onChange={(e) => handleTestInputChange('description', e.target.value)}
                    placeholder="Enter description"
                    rows={3}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Duration (mins)</label>
                    <input
                      type="number"
                      value={testFormData.duration}
                      onChange={(e) => handleTestInputChange('duration', parseInt(e.target.value))}
                      min={1}
                    />
                  </div>
                  <div className="form-group">
                    <label>Total Questions</label>
                    <input
                      type="number"
                      value={testFormData.totalQuestions}
                      onChange={(e) => handleTestInputChange('totalQuestions', parseInt(e.target.value))}
                      min={1}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Exam</label>
                    <select
                      value={testFormData.exam}
                      onChange={(e) => handleTestInputChange('exam', e.target.value)}
                    >
                      <option value="CAT">CAT</option>
                      <option value="XAT">XAT</option>
                      <option value="SNAP">SNAP</option>
                      <option value="IIFT">IIFT</option>
                      <option value="NMAT">NMAT</option>
                      <option value="MAT">MAT</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Year Label</label>
                    <input
                      type="text"
                      value={testFormData.yearLabel}
                      onChange={(e) => handleTestInputChange('yearLabel', e.target.value)}
                      placeholder="e.g., 2025"
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn-cancel" onClick={resetTestForm}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-save" disabled={loading}>
                    {loading ? 'Saving...' : (editingTest ? 'Update' : 'Add Test')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseMockTestManager;

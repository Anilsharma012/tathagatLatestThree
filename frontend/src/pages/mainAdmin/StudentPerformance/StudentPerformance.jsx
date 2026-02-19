import React, { useState, useEffect } from 'react';
import AdminLayout from '../AdminLayout/AdminLayout';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import './StudentPerformance.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

const StudentPerformance = () => {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentPerformance, setStudentPerformance] = useState(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState('');
  const [testLeaderboard, setTestLeaderboard] = useState(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  useEffect(() => {
    fetchDashboardAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'students' && students.length === 0) fetchStudents();
    if (activeTab === 'tests' && tests.length === 0) fetchTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken');
    return { Authorization: `Bearer ${token}` };
  };

  const fetchDashboardAnalytics = async () => {
    setDashboardLoading(true);
    try {
      const response = await fetch('/api/admin/mock-tests/dashboard-analytics', {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
    } finally {
      setDashboardLoading(false);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users?role=student&limit=100', {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success || data.users) {
        setStudents(data.users || data.data || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTests = async () => {
    try {
      const response = await fetch('/api/admin/mock-tests/tests?limit=100', {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success || data.tests) {
        setTests(data.tests || []);
      }
    } catch (error) {
      console.error('Error fetching tests:', error);
    }
  };

  const fetchStudentPerformance = async (studentId) => {
    setPerformanceLoading(true);
    setSelectedStudent(studentId);
    try {
      const response = await fetch(`/api/admin/mock-tests/student-performance/${studentId}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setStudentPerformance(data);
      }
    } catch (error) {
      console.error('Error fetching student performance:', error);
      setStudentPerformance(null);
    } finally {
      setPerformanceLoading(false);
    }
  };

  const fetchTestLeaderboard = async (testId) => {
    if (!testId) return;
    setLeaderboardLoading(true);
    setSelectedTest(testId);
    try {
      const response = await fetch(`/api/admin/mock-tests/test-leaderboard/${testId}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setTestLeaderboard(data);
      }
    } catch (error) {
      console.error('Error fetching test leaderboard:', error);
      setTestLeaderboard(null);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const filteredStudents = students.filter(student =>
    (student.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (student.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (student.phoneNumber || '').includes(searchQuery)
  );

  const renderDashboardTab = () => {
    if (dashboardLoading) return <div className="sp-loading">Loading analytics...</div>;
    if (!dashboardData) return <div className="sp-no-data">No analytics data available</div>;

    const { overview, recentAttempts, topPerformers, scoreDistribution, dailyAttempts } = dashboardData;

    const dailyChartData = {
      labels: (dailyAttempts || []).map(d => {
        const date = new Date(d._id);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      }),
      datasets: [
        {
          label: 'Attempts',
          data: (dailyAttempts || []).map(d => d.count),
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Avg Score',
          data: (dailyAttempts || []).map(d => Math.round(d.avgScore || 0)),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: false,
          tension: 0.4,
          yAxisID: 'y1'
        }
      ]
    };

    const scoreDistData = {
      labels: (scoreDistribution || []).map(s => {
        if (s._id === '300+') return '300+';
        return `${s._id}`;
      }),
      datasets: [{
        label: 'Students',
        data: (scoreDistribution || []).map(s => s.count),
        backgroundColor: [
          '#ef4444', '#f97316', '#f59e0b', '#84cc16',
          '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
        ],
        borderRadius: 6
      }]
    };

    return (
      <div className="sp-dashboard">
        <div className="sp-overview-cards">
          <div className="sp-overview-card sp-card-blue">
            <div className="sp-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div className="sp-card-info">
              <span className="sp-card-value">{overview?.totalStudents || 0}</span>
              <span className="sp-card-label">Total Students</span>
            </div>
          </div>
          <div className="sp-overview-card sp-card-green">
            <div className="sp-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </div>
            <div className="sp-card-info">
              <span className="sp-card-value">{overview?.totalTests || 0}</span>
              <span className="sp-card-label">Active Tests</span>
            </div>
          </div>
          <div className="sp-overview-card sp-card-purple">
            <div className="sp-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <div className="sp-card-info">
              <span className="sp-card-value">{overview?.totalAttempts || 0}</span>
              <span className="sp-card-label">Total Attempts</span>
            </div>
          </div>
        </div>

        <div className="sp-charts-row">
          <div className="sp-chart-card sp-chart-wide">
            <h3>Daily Activity (Last 30 Days)</h3>
            {dailyAttempts?.length > 0 ? (
              <Line
                data={dailyChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: 'index', intersect: false },
                  scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Attempts' } },
                    y1: { position: 'right', beginAtZero: true, title: { display: true, text: 'Avg Score' }, grid: { drawOnChartArea: false } }
                  },
                  plugins: { legend: { position: 'top' } }
                }}
              />
            ) : <div className="sp-no-chart-data">No activity data yet</div>}
          </div>
          <div className="sp-chart-card">
            <h3>Score Distribution</h3>
            {scoreDistribution?.length > 0 ? (
              <Bar
                data={scoreDistData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true, title: { display: true, text: 'Count' } }, x: { title: { display: true, text: 'Score Range' } } }
                }}
              />
            ) : <div className="sp-no-chart-data">No score data yet</div>}
          </div>
        </div>

        <div className="sp-tables-row">
          <div className="sp-table-card">
            <h3>Top Performers</h3>
            {topPerformers?.length > 0 ? (
              <table className="sp-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Name</th>
                    <th>Avg Score</th>
                    <th>Best Score</th>
                    <th>Tests</th>
                  </tr>
                </thead>
                <tbody>
                  {topPerformers.map((p) => (
                    <tr key={p.rank} className={p.rank <= 3 ? 'sp-top-row' : ''}>
                      <td>
                        {p.rank === 1 ? <span className="sp-medal gold">1</span> :
                         p.rank === 2 ? <span className="sp-medal silver">2</span> :
                         p.rank === 3 ? <span className="sp-medal bronze">3</span> :
                         `#${p.rank}`}
                      </td>
                      <td><strong>{p.name}</strong></td>
                      <td>{p.avgScore}</td>
                      <td>{p.bestScore}</td>
                      <td>{p.totalTests}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="sp-no-data">No test data yet</div>}
          </div>

          <div className="sp-table-card">
            <h3>Recent Attempts</h3>
            {recentAttempts?.length > 0 ? (
              <table className="sp-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Test</th>
                    <th>Score</th>
                    <th>Time</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAttempts.slice(0, 15).map((a, idx) => (
                    <tr key={idx}>
                      <td>{a.studentName}</td>
                      <td className="sp-test-name">{a.testName}</td>
                      <td><strong>{a.score}</strong></td>
                      <td>{a.timeTakenMinutes} min</td>
                      <td>{a.completedAt ? new Date(a.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="sp-no-data">No recent attempts</div>}
          </div>
        </div>
      </div>
    );
  };

  const renderStudentPerformanceCharts = () => {
    if (!studentPerformance) return null;
    const { sectionAnalysis, attempts } = studentPerformance;

    const sectionChartData = sectionAnalysis?.length > 0 ? {
      labels: sectionAnalysis.map(s => s.section),
      datasets: [
        {
          label: 'Avg Score',
          data: sectionAnalysis.map(s => parseFloat(s.averageScore) || 0),
          backgroundColor: 'rgba(79, 70, 229, 0.7)',
          borderRadius: 6
        },
        {
          label: 'Accuracy %',
          data: sectionAnalysis.map(s => parseFloat(s.averageAccuracy) || 0),
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          borderRadius: 6
        }
      ]
    } : null;

    const trendData = attempts?.length > 1 ? {
      labels: [...attempts].reverse().map(a => a.testName?.substring(0, 15) || 'Test'),
      datasets: [{
        label: 'Score',
        data: [...attempts].reverse().map(a => a.score),
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        fill: true,
        tension: 0.4
      }]
    } : null;

    return (
      <div className="sp-student-charts">
        {trendData && (
          <div className="sp-chart-card">
            <h4>Score Trend</h4>
            <Line data={trendData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />
          </div>
        )}
        {sectionChartData && (
          <div className="sp-chart-card">
            <h4>Section-wise Performance</h4>
            <Bar data={sectionChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }} />
          </div>
        )}
      </div>
    );
  };

  const renderStudentsTab = () => (
    <div className="sp-students-section">
      <div className="sp-search-bar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          type="text"
          placeholder="Search students by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="sp-split-view">
        <div className="sp-student-list-panel">
          <h3>Students ({filteredStudents.length})</h3>
          {loading ? (
            <div className="sp-loading">Loading students...</div>
          ) : (
            <div className="sp-student-list">
              {filteredStudents.map(student => (
                <div
                  key={student._id}
                  className={`sp-student-item ${selectedStudent === student._id ? 'active' : ''}`}
                  onClick={() => fetchStudentPerformance(student._id)}
                >
                  <div className="sp-student-avatar">
                    {(student.name || 'S').charAt(0).toUpperCase()}
                  </div>
                  <div className="sp-student-info">
                    <span className="sp-student-name">{student.name || 'N/A'}</span>
                    <span className="sp-student-detail">{student.phoneNumber || student.email || ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sp-performance-panel">
          {!selectedStudent ? (
            <div className="sp-empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="64" height="64"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
              <p>Select a student to view performance</p>
            </div>
          ) : performanceLoading ? (
            <div className="sp-loading">Loading performance data...</div>
          ) : studentPerformance ? (
            <div className="sp-performance-content">
              <div className="sp-student-header">
                <div className="sp-student-avatar-lg">
                  {(studentPerformance.student?.name || 'S').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3>{studentPerformance.student?.name || 'Student'}</h3>
                  <p>{studentPerformance.student?.email}</p>
                </div>
              </div>

              <div className="sp-summary-grid">
                <div className="sp-stat-card">
                  <span className="sp-stat-value">{studentPerformance.summary?.totalAttempts || 0}</span>
                  <span className="sp-stat-label">Tests Taken</span>
                </div>
                <div className="sp-stat-card">
                  <span className="sp-stat-value">{studentPerformance.summary?.averageScore || 0}</span>
                  <span className="sp-stat-label">Avg Score</span>
                </div>
                <div className="sp-stat-card">
                  <span className="sp-stat-value">{studentPerformance.summary?.bestScore || 0}</span>
                  <span className="sp-stat-label">Best Score</span>
                </div>
                <div className="sp-stat-card">
                  <span className="sp-stat-value">{studentPerformance.summary?.averagePercentile || 0}%</span>
                  <span className="sp-stat-label">Avg Percentile</span>
                </div>
              </div>

              {renderStudentPerformanceCharts()}

              {studentPerformance.sectionAnalysis?.length > 0 && (
                <div className="sp-section-analysis">
                  <h4>Section-wise Breakdown</h4>
                  <div className="sp-section-cards">
                    {studentPerformance.sectionAnalysis.map(section => (
                      <div key={section.section} className="sp-section-card">
                        <h5>{section.section}</h5>
                        <div className="sp-section-stats">
                          <div>
                            <span className="sp-stat-value">{section.averageScore}</span>
                            <span className="sp-stat-label">Avg Score</span>
                          </div>
                          <div>
                            <span className="sp-stat-value">{section.averageAccuracy}%</span>
                            <span className="sp-stat-label">Accuracy</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {studentPerformance.attempts?.length > 0 && (
                <div className="sp-attempts-table">
                  <h4>Test History</h4>
                  <table className="sp-table">
                    <thead>
                      <tr>
                        <th>Test Name</th>
                        <th>Score</th>
                        <th>Time</th>
                        <th>Rank</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentPerformance.attempts.map((attempt, index) => (
                        <tr key={index}>
                          <td className="sp-test-name">{attempt.testName}</td>
                          <td><strong>{attempt.score}</strong></td>
                          <td>{attempt.timeTakenMinutes} min</td>
                          <td>{attempt.rank ? `#${attempt.rank}` : '-'}</td>
                          <td>{attempt.completedAt ? new Date(attempt.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="sp-no-data">No performance data available for this student.</div>
          )}
        </div>
      </div>
    </div>
  );

  const renderTestsTab = () => (
    <div className="sp-tests-section">
      <div className="sp-test-selector">
        <label>Select Test:</label>
        <select
          value={selectedTest}
          onChange={(e) => fetchTestLeaderboard(e.target.value)}
        >
          <option value="">-- Select a test --</option>
          {tests.map(test => (
            <option key={test._id} value={test._id}>
              {test.title}
            </option>
          ))}
        </select>
      </div>

      {selectedTest && (
        <div className="sp-leaderboard">
          {leaderboardLoading ? (
            <div className="sp-loading">Loading leaderboard...</div>
          ) : testLeaderboard ? (
            <>
              <div className="sp-test-summary">
                <h3>{testLeaderboard.testName}</h3>
                <div className="sp-test-stats">
                  <div className="sp-stat-card">
                    <span className="sp-stat-value">{testLeaderboard.totalParticipants}</span>
                    <span className="sp-stat-label">Participants</span>
                  </div>
                  <div className="sp-stat-card">
                    <span className="sp-stat-value">{testLeaderboard.averageScore}</span>
                    <span className="sp-stat-label">Avg Score</span>
                  </div>
                  <div className="sp-stat-card">
                    <span className="sp-stat-value">{testLeaderboard.highestScore}</span>
                    <span className="sp-stat-label">Highest Score</span>
                  </div>
                </div>
              </div>

              <div className="sp-leaderboard-table">
                <h4>Top 10 Leaderboard</h4>
                <table className="sp-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Student</th>
                      <th>Email</th>
                      <th>Score</th>
                      <th>Time</th>
                      <th>Percentile</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(testLeaderboard.topTen || []).map((entry, index) => (
                      <tr key={index} className={index < 3 ? 'sp-top-row' : ''}>
                        <td>
                          {index === 0 ? <span className="sp-medal gold">1</span> :
                           index === 1 ? <span className="sp-medal silver">2</span> :
                           index === 2 ? <span className="sp-medal bronze">3</span> :
                           `#${entry.rank}`}
                        </td>
                        <td><strong>{entry.studentName}</strong></td>
                        <td>{entry.email || '-'}</td>
                        <td>{entry.score}</td>
                        <td>{entry.timeTakenMinutes} min</td>
                        <td>{entry.percentile}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {testLeaderboard.allAttempts?.length > 10 && (
                <div className="sp-all-attempts">
                  <h4>All Participants ({testLeaderboard.allAttempts.length})</h4>
                  <table className="sp-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Student</th>
                        <th>Score</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testLeaderboard.allAttempts.slice(10).map((entry, index) => (
                        <tr key={index}>
                          <td>#{index + 11}</td>
                          <td>{entry.studentName}</td>
                          <td>{entry.score}</td>
                          <td>{entry.completedAt ? new Date(entry.completedAt).toLocaleDateString('en-IN') : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="sp-no-data">No leaderboard data available for this test.</div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <AdminLayout>
      <div className="sp-container">
        <div className="sp-header">
          <h1>Student Performance Analytics</h1>
          <p>View test performance, rankings, and analytics for all students</p>
        </div>

        <div className="sp-tabs">
          <button
            className={activeTab === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={activeTab === 'students' ? 'active' : ''}
            onClick={() => setActiveTab('students')}
          >
            By Student
          </button>
          <button
            className={activeTab === 'tests' ? 'active' : ''}
            onClick={() => setActiveTab('tests')}
          >
            By Test
          </button>
        </div>

        <div className="sp-tab-content">
          {activeTab === 'dashboard' && renderDashboardTab()}
          {activeTab === 'students' && renderStudentsTab()}
          {activeTab === 'tests' && renderTestsTab()}
        </div>
      </div>
    </AdminLayout>
  );
};

export default StudentPerformance;

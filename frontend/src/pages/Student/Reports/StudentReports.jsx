import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import http from '../../../utils/http';
import './StudentReports.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const StudentReports = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [performanceTrend, setPerformanceTrend] = useState([]);
  const [sectionAnalysis, setSectionAnalysis] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [userRank, setUserRank] = useState(null);
  const [totalParticipants, setTotalParticipants] = useState(0);

  useEffect(() => {
    fetchReportsData();
  }, []);

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      const [summaryRes, sectionRes] = await Promise.all([
        http.get('/mock-tests/reports/summary'),
        http.get('/mock-tests/reports/section-analysis')
      ]);

      if (summaryRes.data?.success) {
        setSummary(summaryRes.data.summary);
        setAttempts(summaryRes.data.attempts);
        setPerformanceTrend(summaryRes.data.performanceTrend);
      }

      if (sectionRes.data?.success) {
        setSectionAnalysis(sectionRes.data.analysis);
        setUserRank(sectionRes.data.userRank);
        setTotalParticipants(sectionRes.data.totalParticipants);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async (testId, testName) => {
    try {
      const response = await http.get(`/mock-tests/reports/${testId}/leaderboard`);
      if (response.data?.success) {
        setLeaderboard(response.data);
        setSelectedTest({ id: testId, name: testName });
        setShowLeaderboard(true);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const sectionColors = ['#6366f1', '#06b6d4', '#f59e0b'];

  const accuracyChartData = {
    labels: sectionAnalysis.map(s => s.section),
    datasets: [{
      label: 'Accuracy %',
      data: sectionAnalysis.map(s => parseFloat(s.averageAccuracy)),
      backgroundColor: sectionColors.map(c => c + 'cc'),
      borderColor: sectionColors,
      borderWidth: 2,
      borderRadius: 8,
      barThickness: 44
    }]
  };

  if (loading) {
    return (
      <div className="reports-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h1>Analysis & Reports</h1>
        <p>Track your mock test performance and compare with top students</p>
      </div>

      <div className="stats-cards-row">
        <div className="stat-card blue">
          <div className="stat-icon"><span>📝</span></div>
          <div className="stat-info">
            <h3>{summary?.totalAttempts || 0}</h3>
            <p>Tests Taken</p>
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon"><span>📊</span></div>
          <div className="stat-info">
            <h3>{summary?.averageScore || 0}</h3>
            <p>Average Score</p>
          </div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon"><span>🏆</span></div>
          <div className="stat-info">
            <h3>{summary?.bestScore || 0}</h3>
            <p>Best Score</p>
          </div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon"><span>⏱️</span></div>
          <div className="stat-info">
            <h3>{summary?.averageTimeMinutes || 0} min</h3>
            <p>Avg. Time</p>
          </div>
        </div>
      </div>

      <div className="charts-grid-pro">
        <div className="chart-card-pro chart-accuracy">
          <div className="chart-card-header">
            <div className="chart-header-left">
              <h3>Section Accuracy</h3>
              <p>How accurately you answer in each section</p>
            </div>
          </div>
          <div className="chart-body-pro">
            {sectionAnalysis.length > 0 ? (
              <Bar
                data={accuracyChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: '#1e1e3f',
                      padding: 12,
                      cornerRadius: 10,
                      callbacks: { label: (ctx) => `Accuracy: ${ctx.parsed.y}%` }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
                      ticks: { font: { size: 11 }, color: '#aaa', callback: (v) => v + '%' }
                    },
                    x: {
                      grid: { display: false },
                      ticks: { font: { size: 12, weight: '500' }, color: '#555' }
                    }
                  }
                }}
              />
            ) : (
              <div className="empty-state-pro">
                <div className="empty-icon-circle"><span>🎯</span></div>
                <h4>No accuracy data yet</h4>
                <p>Take a mock test to track your accuracy</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {userRank && (
        <div className="rank-progress-card">
          <h3>Your Overall Ranking</h3>
          <div className="rank-stats">
            <div className="rank-item">
              <span className="rank-value">#{userRank}</span>
              <span className="rank-label">Current Rank</span>
            </div>
            <div className="rank-item">
              <span className="rank-value">{totalParticipants}</span>
              <span className="rank-label">Total Participants</span>
            </div>
            <div className="rank-item">
              <span className="rank-value">{totalParticipants > 0 ? ((1 - (userRank / totalParticipants)) * 100).toFixed(1) : 0}%</span>
              <span className="rank-label">Percentile</span>
            </div>
          </div>
        </div>
      )}

      <div className="comparison-section">
        <h2>Subject-wise Performance vs Top 10</h2>
        <p className="section-subtitle">Compare your scores with top 10 performers in each subject</p>
        <div className="section-stats-row">
          {sectionAnalysis.map(section => (
            <div key={section.section} className={`section-stat-card ${section.section.toLowerCase()}`}>
              <h4>{section.section === 'VARC' ? 'Verbal Ability & Reading Comprehension' : section.section === 'DILR' ? 'Data Interpretation & Logical Reasoning' : section.section === 'QA' ? 'Quantitative Aptitude' : section.section}</h4>
              <div className="section-metrics">
                <div className="metric">
                  <span className="value">{section.averageScore}</span>
                  <span className="label">Your Score</span>
                </div>
                <div className="metric">
                  <span className="value">{section.top10AverageScore || 0}</span>
                  <span className="label">Top 10 Avg</span>
                </div>
                <div className="metric">
                  <span className={`value ${parseFloat(section.scoreDifference) >= 0 ? 'positive' : 'negative'}`}>
                    {parseFloat(section.scoreDifference) >= 0 ? '+' : ''}{section.scoreDifference}
                  </span>
                  <span className="label">Difference</span>
                </div>
              </div>
              <div className="accuracy-comparison">
                <div className="accuracy-bar">
                  <div className="accuracy-label">Your Accuracy: {section.averageAccuracy}%</div>
                  <div className="accuracy-progress">
                    <div className="progress-fill user" style={{width: `${Math.min(100, section.averageAccuracy)}%`}}></div>
                  </div>
                </div>
                <div className="accuracy-bar">
                  <div className="accuracy-label">Top 10 Accuracy: {section.top10AverageAccuracy || 0}%</div>
                  <div className="accuracy-progress">
                    <div className="progress-fill top10" style={{width: `${Math.min(100, section.top10AverageAccuracy || 0)}%`}}></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="attempts-section">
        <h2>Your Test Attempts</h2>
        {attempts.length === 0 ? (
          <div className="empty-state">
            <p>You haven't taken any mock tests yet.</p>
            <a href="/student/mock-tests" className="start-test-btn">Start a Mock Test</a>
          </div>
        ) : (
          <div className="attempts-table-container">
            <table className="attempts-table">
              <thead>
                <tr>
                  <th>Test Name</th>
                  <th>Score</th>
                  <th>Time Taken</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map(attempt => (
                  <tr key={attempt._id}>
                    <td>
                      <div className="test-name-cell">
                        <span className="test-name">{attempt.testName}</span>
                        {attempt.seriesName && <span className="series-name">{attempt.seriesName}</span>}
                      </div>
                    </td>
                    <td>
                      <span className="score-badge">{attempt.score}/{attempt.maxScore}</span>
                    </td>
                    <td>{attempt.timeTakenMinutes} min</td>
                    <td>{new Date(attempt.completedAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="action-btn leaderboard-btn"
                        onClick={() => fetchLeaderboard(attempt.testId, attempt.testName)}
                      >
                        Leaderboard
                      </button>
                      <a
                        href={`/student/mock-test/review/${attempt._id}`}
                        className="action-btn review-btn"
                      >
                        Review
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showLeaderboard && leaderboard && (
        <div className="modal-overlay" onClick={() => setShowLeaderboard(false)}>
          <div className="leaderboard-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Top 10 - {selectedTest?.name}</h2>
              <button onClick={() => setShowLeaderboard(false)}>x</button>
            </div>
            <div className="modal-content">
              <div className="leaderboard-stats">
                <div className="lb-stat">
                  <span className="lb-value">{leaderboard.totalParticipants}</span>
                  <span className="lb-label">Total Participants</span>
                </div>
                {leaderboard.currentUserRank && (
                  <div className="lb-stat highlight">
                    <span className="lb-value">#{leaderboard.currentUserRank}</span>
                    <span className="lb-label">Your Rank</span>
                  </div>
                )}
                {leaderboard.currentUserScore !== null && (
                  <div className="lb-stat">
                    <span className="lb-value">{leaderboard.currentUserScore}</span>
                    <span className="lb-label">Your Score</span>
                  </div>
                )}
              </div>
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Student</th>
                    <th>Score</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.topTen.map(student => (
                    <tr key={student.rank} className={student.isCurrentUser ? 'current-user' : ''}>
                      <td>
                        <span className={`rank-badge rank-${student.rank}`}>
                          {student.rank <= 3 ? ['🥇', '🥈', '🥉'][student.rank - 1] : `#${student.rank}`}
                        </span>
                      </td>
                      <td>
                        {student.studentName}
                        {student.isCurrentUser && <span className="you-tag">(You)</span>}
                      </td>
                      <td className="score-cell">{student.score}</td>
                      <td>{student.timeTakenMinutes} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentReports;

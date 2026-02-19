import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './MockTestInstructions.css';

const MockTestInstructions = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [testDetails, setTestDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {  
    fetchTestDetails();
  }, [testId]);

  const fetchTestDetails = async () => {
    setLoading(true);
    try {
      const authToken = localStorage.getItem('authToken');

      const response = await fetch(`/api/mock-tests/test/${testId}/details`, {
        headers: authToken ? {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        } : {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setTestDetails(data.test);
      } else {
        console.error('Failed to fetch test details:', data.message);
        navigate('/student/dashboard');
      }
    } catch (error) {
      console.error('Error fetching test details:', error);
      navigate('/student/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    navigate(`/student/mock-test/${testId}/terms`);
  };

  const getUserName = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.name || 'John Smith';
    } catch {
      return 'John Smith';
    }
  };

  if (loading) {
    return (
      <div className="cat-instructions-page">
        <div className="cat-loading">
          <div className="cat-spinner"></div>
          <p>Loading instructions...</p>
        </div>
      </div>
    );
  }

  if (!testDetails) {
    return (
      <div className="cat-instructions-page">
        <div className="cat-error">
          <h3>Test Not Found</h3>
          <button onClick={() => navigate('/student/dashboard')}>
            Go Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cat-instructions-page">
      <div className="cat-header">
        <div className="cat-header-top">
          <img src="/cat-iim-banner.png" alt="CAT 2025 - IIM Logos" className="cat-iim-banner" />
        </div>
        <div className="cat-header-bar">
          <span>Instructions</span>
        </div>
      </div>

      <div className="cat-content">
        <div className="cat-main-panel">
          <div className="cat-instructions-panel">
            <div className="notice-box">
              The number, type and pattern of questions, as well as sequence and timing of sections in the Mock Exam are only indicative and these are subject to variations from year to year as decided by the CAT authorities.
            </div>

            <div className="instructions-content">
              <h3 className="section-title">General Instructions:</h3>
              
              <ol className="instruction-list">
                <li>
                  To log in, enter your registration number and password following the instructions provided to you by the invigilator.
                </li>
                <li>
                  The total duration of the test is 120 minutes. For PwD candidates, the total duration is 160 minutes.
                </li>
                <li>
                  The test has 3 (three) sections. The time allotted to each section is 40 minutes (53 minutes and 20 seconds for PwD candidates). As soon as the candidate visits a section, the clock (displayed as "Time Left" in the top right corner of the screen) will start. On completion of 40 minutes, the clock will stop, the particular section will be locked, and the answers to questions in that section will be auto-submitted. The candidate will then need to proceed to the next section. The exact same process will be repeated in the other two sections. After submitting all three sections, a summary of the answers will appear on the screen.
                </li>
                <li>
                  For PwD candidates, the process will be the same as above. The only exception is that, for each section, the PwD candidate will have 53 minutes and 20 seconds, with an option for submitting the answers of a section at any point in time after the completion of 40 minutes by clicking on the 'Submit' button. After 53 minutes and 20 seconds, however, the section test will automatically end. Therefore, PwD candidates can complete all three sections of the test within a maximum of 160 minutes.
                </li>
                <li>
                  The candidate's computer time will be synchronized with the server clock. The countdown timer ("Time Left") at the top right corner of the computer screen indicates the remaining time to complete the current section. When the timer reaches zero, the section test will automatically end.
                </li>
                <li>
                  No candidate will be allowed to leave the test hall before 120 minutes.
                </li>
                <li>
                  A writing pad will be provided to candidates for rough work, which must be returned after the test. Please note that for PwD candidates, two writing pads will be provided, while others will receive only one. Candidates should clearly write their name and registration number at the designated place on the writing pad.
                </li>
                <li>
                  The question paper will include a mix of Multiple-Choice Questions (MCQs) with options and Non-MCQs.
                </li>
                <li>
                  For an MCQ, a candidate will receive 3 marks for a correct answer, -1 mark for a wrong answer, and 0 marks for an unattempted question.
                </li>
                <li>
                  For a Non-MCQ, a candidate will receive 3 marks for a correct answer and 0 marks for both wrong and unattempted questions. There will be no negative marking for incorrect answers in non-MCQ questions.
                </li>
                <li>
                  An MCQ will have four choices, of which only one is correct. The computer assigned to the candidate at the test center operates on specialized software that allows only one answer per MCQ.
                </li>
                <li>
                  The candidate's answers will be updated and saved on a server periodically.
                </li>
                <li>
                  An on-screen calculator will be provided, which can be used for computing. The candidate will not be allowed to use any other calculator, computing machine, or device.
                </li>
                <li>
                  Candidates are expected to familiarize themselves with various symbols before starting the test. The question palette displayed on the right side of the screen will show the status of each question with the help of one of the following symbols:
                </li>
              </ol>

              <div className="status-table">
                <table>
                  <thead>
                    <tr>
                      <th>S No.</th>
                      <th>Question Number with Status</th>
                      <th>Meaning</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>A</td>
                      <td><div className="status-box gray">1</div></td>
                      <td>You have not visited the question yet.</td>
                    </tr>
                    <tr>
                      <td>B</td>
                      <td><div className="status-box red">3</div></td>
                      <td>You have visited the question but have not answered it.</td>
                    </tr>
                    <tr>
                      <td>C</td>
                      <td><div className="status-box green">5</div></td>
                      <td>You have answered the question but have not flagged it as Marked for Review.</td>
                    </tr>
                    <tr>
                      <td>D</td>
                      <td><div className="status-box purple">7</div></td>
                      <td>You have not answered the question but have flagged it as Marked for Review.</td>
                    </tr>
                    <tr>
                      <td>E</td>
                      <td><div className="status-box purple-tick">9</div></td>
                      <td>You have answered the question as well as flagged it as Marked for Review.</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="important-note">
                *Answers to all questions flagged as <strong>'Marked for Review' (Serial No. E)</strong> will be automatically considered as submitted for evaluation at the end of the time allotted for that section.
              </p>

              <ol className="instruction-list" start="15">
                <li>
                  Click the " {'>'} " arrow to the left of the question palette to collapse it and make the window larger. To reopen the question palette, click the " {'<'} " arrow on the right side of the computer console. Note that in some cases, the candidate might need to scroll down to see the full question and options.
                </li>
                <li>
                  <strong>To answer a question, follow these steps:</strong>
                  <ol type="a">
                    <li>Click on the question number in the question palette to go directly to that question.</li>
                    <li>Select an answer for an MCQ by clicking the radio button located to the left of the choice.</li>
                    <li>For a non-MCQ, enter only a whole number as the answer in the provided space on the screen using the on-screen keyboard. For example, if the correct answer is 50, enter only 50, not 50.0 or 050, etc.</li>
                  </ol>
                </li>
                <li>
                  Click on 'Save & Next' to save your answer for the current question and then proceed to the next question. To revisit an answered question before finishing the section, click on 'Mark for Review'.
                  <p className="caution-text">
                    <strong>Caution: Your answer for the current question will not be saved if you navigate directly to another question by clicking on a question number and do not click the 'Save & Next' or 'Mark for Review' button.</strong>
                  </p>
                </li>
                <li>
                  You can view all questions in a section by clicking the 'Question Paper' button. This feature allows you to see all the questions in your current section at once.
                </li>
                <li>
                  <strong>Procedure for changing your response to a question:</strong>
                  <ol type="a">
                    <li>To deselect your chosen answer, click on the question number on the question palette and then click the 'Clear Response' button.</li>
                    <li>To change your answer, select a different option by clicking on its radio button.</li>
                    <li>To save your updated answer, click on either the 'Save & Next' or 'Mark for Review' button.</li>
                  </ol>
                </li>
                <li>
                  <strong>Navigating through Sections:</strong>
                  <ol type="a">
                    <li>
                      The test has three sections administered in the following order:
                      <ol type="i">
                        <li>Verbal Ability and Reading Comprehension (VARC)</li>
                        <li>Data Interpretation and Logical Reasoning (DILR)</li>
                        <li>Quantitative Ability (QA)</li>
                      </ol>
                    </li>
                    <li>
                      The names of the three sections are displayed on the top bar of the screen. The section you are currently viewing is highlighted. From any section, you will be able to move to the next section only after completing a minimum of 40 minutes.
                    </li>
                    <li>
                      PwD category candidates with "Blindness and Low Vision" disability will have the screen magnification option enabled by default and will find two magnifying glass icons at the top of the screen. You can click on the + icon to zoom in and click on the - icon to zoom out the question.
                    </li>
                  </ol>
                </li>
              </ol>

              <div className="zoom-info">
                <p>Zoom is enabled at 2 levels from the default view, which are:</p>
                <table className="zoom-table">
                  <thead>
                    <tr>
                      <th>Default View</th>
                      <th>Level 1</th>
                      <th>Level 2</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>16x Pixel</td>
                      <td>21x Pixel</td>
                      <td>24x Pixel</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="cat-profile-panel">
            <div className="profile-section">
              <div className="profile-avatar">
                <div className="avatar-circle">
                  <svg viewBox="0 0 100 100" className="avatar-svg">
                    <circle cx="50" cy="35" r="22" fill="#4a90a4"/>
                    <ellipse cx="50" cy="85" rx="35" ry="25" fill="#4a90a4"/>
                  </svg>
                </div>
              </div>
              <div className="profile-name">{getUserName()}</div>
            </div>
            
            <div className="next-button-container">
              <button className="cat-btn-next" onClick={handleNext}>
                Next <span className="arrow">{'>'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockTestInstructions;

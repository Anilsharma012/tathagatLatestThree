import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import "./MockTestAttempt.css";
import CandidateFeedbackForm from "./CandidateFeedbackForm";

const MockTestAttempt = () => {
  const { testId, attemptId } = useParams();
  const navigate = useNavigate();

  const sanitizeHtml = (html) => {
    if (!html) return "";
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        "p",
        "br",
        "strong",
        "em",
        "u",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "ul",
        "ol",
        "li",
        "img",
        "a",
        "table",
        "thead",
        "tbody",
        "tr",
        "th",
        "td",
        "span",
        "div",
        "sup",
        "sub",
        "strike",
        "code",
        "pre",
        "blockquote",
        "hr",
        "video",
        "iframe",
      ],
      ALLOWED_ATTR: [
        "href",
        "src",
        "alt",
        "title",
        "width",
        "height",
        "style",
        "class",
        "target",
        "rel",
        "colspan",
        "rowspan",
        "align",
        "controls",
        "frameborder",
        "allowfullscreen",
      ],
      ALLOWED_URI_REGEXP:
        /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });
  };

  const [testData, setTestData] = useState(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState({});
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [visitedQuestions, setVisitedQuestions] = useState(new Set([0]));
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(null);

  const [sectionStates, setSectionStates] = useState([]);
  const [isResuming, setIsResuming] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [showSectionLockedModal, setShowSectionLockedModal] = useState(false);
  const [lockedSectionInfo, setLockedSectionInfo] = useState(null);

  const [showCalculator, setShowCalculator] = useState(false);
  const [showScratchPad, setShowScratchPad] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showQuestionPaper, setShowQuestionPaper] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [calculatorValue, setCalculatorValue] = useState("0");
  const [calculatorExpression, setCalculatorExpression] = useState("");
  const [calculatorMemory, setCalculatorMemory] = useState(0);
  const [scratchPadContent, setScratchPadContent] = useState("");
  const [drawingMode, setDrawingMode] = useState(false);
  const canvasRef = useRef(null);
  const drawingDataRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (showScratchPad && drawingMode && canvasRef.current && drawingDataRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = drawingDataRef.current;
    }
  }, [showScratchPad, drawingMode]);

  const saveCanvasData = () => {
    if (canvasRef.current) {
      drawingDataRef.current = canvasRef.current.toDataURL();
    }
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveCanvasData();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawingDataRef.current = null;
  };
  const [showSectionResult, setShowSectionResult] = useState(false);
  const [currentSectionResult, setCurrentSectionResult] = useState(null);
  const [completedSections, setCompletedSections] = useState([]);
  const [showFinalResult, setShowFinalResult] = useState(false);
  const [finalResult, setFinalResult] = useState(null);
  const [studentInfo, setStudentInfo] = useState({
    name: "John Smith",
    email: "",
    phone: "",
  });
  const [showStudentDetails, setShowStudentDetails] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showExamSummary, setShowExamSummary] = useState(false);
  const [allSectionsStats, setAllSectionsStats] = useState([]);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [showNumericKeypad, setShowNumericKeypad] = useState(false);
  const [numericInputCursorPos, setNumericInputCursorPos] = useState(0);
  const numericInputRef = useRef(null);

  const timerRef = useRef(null);
  const syncIntervalRef = useRef(null);
  const currentAttemptIdRef = useRef(attemptId);

  useEffect(() => {
    currentAttemptIdRef.current = attemptId;
  }, [attemptId]);

  useEffect(() => {
    fetchTestData();
    loadStudentInfo();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, []);

  const loadStudentInfo = () => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const userData = JSON.parse(stored);
        setStudentInfo({
          name: userData.name || "John Smith",
          email: userData.email || "",
          phone: userData.phone || userData.mobile || "",
        });
      }
    } catch (error) {
      console.error("Error loading student info:", error);
    }
  };

  useEffect(() => {
    if (sectionStates.length > 0 && testData && !showFinalResult) {
      timerRef.current = setInterval(() => {
        setSectionStates((prevStates) => {
          const currentSectionState = prevStates[currentSection];

          if (!currentSectionState) return prevStates;

          if (currentSectionState.isLocked || currentSectionState.isCompleted) {
            return prevStates;
          }

          if (currentSectionState.remainingSeconds <= 1) {
            const newStates = prevStates.map((state, idx) =>
              idx === currentSection
                ? {
                    ...state,
                    remainingSeconds: 0,
                    isCompleted: true,
                    completedAt: new Date().toISOString(),
                  }
                : { ...state },
            );

            setTimeout(() => handleSectionTimeUp(), 0);
            return newStates;
          }

          const newStates = prevStates.map((state, idx) =>
            idx === currentSection
              ? { ...state, remainingSeconds: state.remainingSeconds - 1 }
              : { ...state },
          );
          return newStates;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sectionStates.length, currentSection, testData, showFinalResult]);

  useEffect(() => {
    if (currentAttemptIdRef.current && testData && !showFinalResult) {
      syncIntervalRef.current = setInterval(() => {
        syncProgress();
      }, 5000);
    }

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [
    testData,
    currentSection,
    currentQuestion,
    responses,
    sectionStates,
    showFinalResult,
  ]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      syncProgress();
      e.preventDefault();
      e.returnValue =
        "Your test progress will be saved. Are you sure you want to leave?";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [responses, sectionStates]);

  const syncProgress = useCallback(async () => {
    if (!currentAttemptIdRef.current || showFinalResult) return;

    try {
      const authToken = localStorage.getItem("authToken");
      if (!authToken) return;

      const currentQuestionData =
        testData?.sections?.[currentSection]?.questions?.[currentQuestion];

      const responsesWithReviewState = Object.entries(responses).map(
        ([questionId, selectedAnswer]) => {
          let isMarked = false;
          if (testData?.sections) {
            testData.sections.forEach((section, sectionIdx) => {
              if (section.questions) {
                section.questions.forEach((q, qIdx) => {
                  if (
                    q._id === questionId &&
                    sectionIdx === currentSection &&
                    markedForReview.has(qIdx)
                  ) {
                    isMarked = true;
                  }
                });
              }
            });
          }
          return {
            questionId,
            selectedAnswer,
            isAnswered: !!selectedAnswer,
            isMarkedForReview: isMarked,
          };
        },
      );

      const syncData = {
        currentSectionKey: testData?.sections?.[currentSection]?.name,
        currentSectionIndex: currentSection,
        currentQuestionIndex: currentQuestion,
        currentQuestionId: currentQuestionData?._id,
        sectionStates: sectionStates,
        responses: responsesWithReviewState,
      };

      const response = await fetch(
        `/api/mock-tests/attempt/${currentAttemptIdRef.current}/sync`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(syncData),
        },
      );

      if (response.ok) {
        const syncResult = await response.json();
        setLastSyncTime(new Date());
        setSyncError(null);

        if (
          syncResult.sectionStates &&
          Array.isArray(syncResult.sectionStates)
        ) {
          setSectionStates((prevStates) => {
            return syncResult.sectionStates.map((serverState, idx) => {
              return {
                ...serverState,
                remainingSeconds: serverState.remainingSeconds,
                isLocked: serverState.isLocked,
                isCompleted: serverState.isCompleted,
              };
            });
          });
        }
      } else {
        console.error("Sync failed:", response.status);
        setSyncError("Failed to save progress");
      }
    } catch (error) {
      console.error("Error syncing progress:", error);
      setSyncError("Connection error - progress may not be saved");
    }
  }, [
    testData,
    currentSection,
    currentQuestion,
    responses,
    sectionStates,
    markedForReview,
    showFinalResult,
  ]);

  const fetchTestData = async () => {
    try {
      setLoadingError(null);
      const authToken = localStorage.getItem("authToken");
      if (!authToken || authToken === "null") {
        navigate("/Login");
        return;
      }

      if (attemptId) {
        const attemptResponse = await fetch(
          `/api/mock-tests/attempt/${attemptId}`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (attemptResponse.ok) {
          const attemptData = await attemptResponse.json();
          if (attemptData.success) {
            setTestData(attemptData.test);

            if (attemptData.attempt?.sectionStates?.length > 0) {
              setSectionStates(attemptData.attempt.sectionStates);
              setIsResuming(true);

              if (attemptData.attempt.currentSectionIndex !== undefined) {
                setCurrentSection(attemptData.attempt.currentSectionIndex);
              }
              if (attemptData.attempt.currentQuestionIndex !== undefined) {
                setCurrentQuestion(attemptData.attempt.currentQuestionIndex);
              }
            } else {
              initializeSectionStates(attemptData.test);
            }

            if (attemptData.responses) {
              const responsesObj = {};
              if (Array.isArray(attemptData.responses)) {
                attemptData.responses.forEach((r) => {
                  if (r.questionId && r.selectedAnswer) {
                    responsesObj[r.questionId] = r.selectedAnswer;
                  }
                });
              } else {
                Object.assign(responsesObj, attemptData.responses);
              }
              setResponses(responsesObj);
            }

            setLoading(false);
            return;
          }
        }
      }

      const response = await fetch(`/api/mock-tests/test/${testId}/start`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`,
        );
      }

      const data = await response.json();
      if (data.success) {
        setTestData(data.test);

        if (data.attempt?.sectionStates?.length > 0) {
          setSectionStates(data.attempt.sectionStates);
        } else {
          initializeSectionStates(data.test);
        }

        if (data.resuming && data.attempt) {
          setIsResuming(true);
          currentAttemptIdRef.current = data.attempt._id;
          navigate(`/student/mock-test/${testId}/attempt/${data.attempt._id}`, {
            replace: true,
          });

          if (data.attempt.currentSectionIndex !== undefined) {
            setCurrentSection(data.attempt.currentSectionIndex);
          }
          if (data.attempt.currentQuestionIndex !== undefined) {
            setCurrentQuestion(data.attempt.currentQuestionIndex);
          }
        } else if (data.attempt) {
          currentAttemptIdRef.current = data.attempt._id;
          navigate(`/student/mock-test/${testId}/attempt/${data.attempt._id}`, {
            replace: true,
          });
        }
      } else {
        setLoadingError(data.message || "Failed to start test");
      }
    } catch (error) {
      console.error("Error fetching test data:", error);
      setLoadingError(
        error.message || "Failed to load test. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const initializeSectionStates = (test) => {
    if (!test?.sections) return;

    const states = test.sections.map((section, index) => ({
      sectionKey: section.name,
      startedAt: index === 0 ? new Date().toISOString() : null,
      remainingSeconds: section.duration * 60,
      isLocked: false,
      isCompleted: false,
      completedAt: null,
    }));

    setSectionStates(states);
  };

  const handleSectionTimeUp = async () => {
    const sectionName =
      testData?.sections?.[currentSection]?.name || "Current section";

    try {
      const authToken = localStorage.getItem("authToken");
      if (authToken && currentAttemptIdRef.current) {
        await fetch(
          `/api/mock-tests/attempt/${currentAttemptIdRef.current}/transition`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${authToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fromSection: sectionName,
              toSection: testData?.sections?.[currentSection + 1]?.name || null,
            }),
          },
        );
      }
    } catch (error) {
      console.error("Error locking section on server:", error);
    }

    setLockedSectionInfo({
      sectionName,
      message: `Time's up for ${sectionName}! Moving to the next section.`,
    });
    setShowSectionLockedModal(true);
  };

  const handleSectionLockedContinue = async () => {
    setShowSectionLockedModal(false);
    setLockedSectionInfo(null);

    if (currentSection < testData.sections.length - 1) {
      const sectionResult = calculateSectionResult(currentSection);
      setCompletedSections((prev) => [...prev, sectionResult]);

      try {
        const authToken = localStorage.getItem("authToken");
        await fetch(
          `/api/mock-tests/attempt/${currentAttemptIdRef.current}/transition-section`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${authToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fromSection: testData.sections[currentSection].name,
              toSection: testData.sections[currentSection + 1].name,
            }),
          },
        );
      } catch (error) {
        console.error("Error transitioning section:", error);
      }

      setSectionStates((prevStates) =>
        prevStates.map((state, idx) =>
          idx === currentSection + 1
            ? { ...state, startedAt: new Date().toISOString() }
            : { ...state },
        ),
      );

      setCurrentSection((prev) => prev + 1);
      setCurrentQuestion(0);
      setVisitedQuestions(new Set([0]));
    } else {
      handleSubmitTest();
    }
  };

  const formatTime = (seconds) => {
    if (seconds === undefined || seconds === null || isNaN(seconds)) {
      return "00:00";
    }
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getCurrentSectionTime = () => {
    return sectionStates[currentSection]?.remainingSeconds || 0;
  };

  const getTotalTimeRemaining = () => {
    return sectionStates.reduce((total, state) => {
      if (!state.isCompleted) {
        return total + (state.remainingSeconds || 0);
      }
      return total;
    }, 0);
  };

  const isSectionLocked = (sectionIndex) => {
    const state = sectionStates[sectionIndex];
    if (!state) return false;
    return state.isLocked || state.isCompleted || state.remainingSeconds <= 0;
  };

  const canNavigateToSection = (sectionIndex) => {
    if (sectionIndex === currentSection) return true;
    if (sectionIndex < currentSection) {
      return !isSectionLocked(sectionIndex);
    }
    return false;
  };

  const handleQuestionSelect = (questionIndex) => {
    setCurrentQuestion(questionIndex);
    setVisitedQuestions((prev) => new Set([...prev, questionIndex]));
  };

  const handleAnswerSelect = (answer) => {
    const questionId = getCurrentQuestion()?._id;
    if (questionId) {
      setResponses((prev) => ({
        ...prev,
        [questionId]: answer,
      }));
      saveResponse(questionId, answer);
    }
  };

  const saveResponse = async (questionId, selectedAnswer) => {
    try {
      const authToken = localStorage.getItem("authToken");
      await fetch(
        `/api/mock-tests/attempt/${currentAttemptIdRef.current}/response`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            questionId,
            selectedAnswer,
            isMarkedForReview: markedForReview.has(currentQuestion),
          }),
        },
      );
    } catch (error) {
      console.error("Error saving response:", error);
    }
  };

  const handleMarkForReview = () => {
    setMarkedForReview((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(currentQuestion)) {
        newSet.delete(currentQuestion);
      } else {
        newSet.add(currentQuestion);
      }
      return newSet;
    });
    handleNextQuestion();
  };

  const handleClearResponse = () => {
    const questionId = getCurrentQuestion()?._id;
    if (questionId) {
      setResponses((prev) => {
        const newResponses = { ...prev };
        delete newResponses[questionId];
        return newResponses;
      });
      saveResponse(questionId, null);
    }
  };

  const handleKeypadInput = (key) => {
    const questionId = getCurrentQuestion()?._id;
    if (!questionId) return;

    const currentValue = responses[questionId] || "";
    let newValue = currentValue;

    if (key === "Backspace") {
      newValue = currentValue.slice(0, -1);
    } else if (key === "Clear") {
      newValue = "";
    } else if (key === "Left") {
      if (numericInputRef.current) {
        const pos = numericInputRef.current.selectionStart;
        numericInputRef.current.setSelectionRange(
          Math.max(0, pos - 1),
          Math.max(0, pos - 1),
        );
        numericInputRef.current.focus();
      }
      return;
    } else if (key === "Right") {
      if (numericInputRef.current) {
        const pos = numericInputRef.current.selectionStart;
        const len = currentValue.length;
        numericInputRef.current.setSelectionRange(
          Math.min(len, pos + 1),
          Math.min(len, pos + 1),
        );
        numericInputRef.current.focus();
      }
      return;
    } else {
      if (key === "-" && currentValue.includes("-")) return;
      if (key === "." && currentValue.includes(".")) return;
      newValue = currentValue + key;
    }

    handleAnswerSelect(newValue);
  };

  const handleNextQuestion = () => {
    const totalQuestions =
      testData?.sections[currentSection]?.questions?.length || 0;
    if (currentQuestion < totalQuestions - 1) {
      handleQuestionSelect(currentQuestion + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      handleQuestionSelect(currentQuestion - 1);
    }
  };

  const handleSaveAndNext = () => {
    handleNextQuestion();
  };

  const calculateSectionResult = (sectionIndex) => {
    const section = testData.sections[sectionIndex];
    const sectionQuestions = section.questions || [];

    let answered = 0;
    let markedCount = 0;
    let answeredAndMarked = 0;
    let visitedCount = 0;

    sectionQuestions.forEach((question, localIndex) => {
      const questionId = question?._id || question;
      const response = responses[questionId];
      const isMarked = markedForReview.has(localIndex);
      const isVisited = visitedQuestions.has(localIndex);
      const hasAnswer =
        response &&
        (typeof response === "string" ? response.trim() !== "" : true);

      if (isVisited) visitedCount++;

      if (hasAnswer && isMarked) {
        answeredAndMarked++;
        answered++;
        markedCount++;
      } else if (hasAnswer) {
        answered++;
      } else if (isMarked) {
        markedCount++;
      }
    });

    const notAnswered = visitedCount - answered;
    const notVisited = sectionQuestions.length - visitedCount;

    return {
      sectionName: section.name,
      totalQuestions: sectionQuestions.length,
      answered: answered - answeredAndMarked,
      notAnswered: Math.max(0, notAnswered),
      markedForReview: markedCount - answeredAndMarked,
      answeredAndMarked,
      notVisited: Math.max(0, notVisited),
      correct: 0,
      incorrect: 0,
      score: answered * 3,
      maxScore: sectionQuestions.length * 3,
    };
  };

  const calculateAllSectionsStats = () => {
    if (!testData?.sections) return [];

    return testData.sections.map((section, index) => {
      const sectionQuestions = section.questions || [];

      let status = "yet_to_attempt";
      if (index < currentSection) status = "completed";
      else if (index === currentSection) status = "current";

      // For completed sections, use saved stats from completedSections
      if (status === "completed") {
        const savedStats = completedSections.find(
          (s) => s.sectionName === section.name,
        );
        if (savedStats) {
          return {
            sectionName: section.name,
            totalQuestions: sectionQuestions.length,
            answered: savedStats.answered,
            notAnswered: savedStats.notAnswered,
            markedForReview: savedStats.markedForReview,
            answeredAndMarked: savedStats.answeredAndMarked || 0,
            notVisited: savedStats.notVisited,
            status,
          };
        }
      }

      // For yet to attempt sections, show all as not visited
      if (status === "yet_to_attempt") {
        return {
          sectionName: section.name,
          totalQuestions: sectionQuestions.length,
          answered: 0,
          notAnswered: 0,
          markedForReview: 0,
          answeredAndMarked: 0,
          notVisited: sectionQuestions.length,
          status,
        };
      }

      // For current section, calculate live stats
      let answered = 0;
      let markedCount = 0;
      let answeredAndMarked = 0;
      let visitedCount = 0;

      sectionQuestions.forEach((question, localIndex) => {
        const questionId = question?._id || question;
        const response = responses[questionId];
        const isMarked = markedForReview.has(localIndex);
        const isVisited = visitedQuestions.has(localIndex);
        const hasAnswer =
          response &&
          (typeof response === "string" ? response.trim() !== "" : true);

        if (isVisited) visitedCount++;

        if (hasAnswer && isMarked) {
          answeredAndMarked++;
          answered++;
          markedCount++;
        } else if (hasAnswer) {
          answered++;
        } else if (isMarked) {
          markedCount++;
        }
      });

      const notAnswered = visitedCount - answered;
      const notVisited = sectionQuestions.length - visitedCount;

      return {
        sectionName: section.name,
        totalQuestions: sectionQuestions.length,
        answered: answered - answeredAndMarked,
        notAnswered: Math.max(0, notAnswered),
        markedForReview: markedCount - answeredAndMarked,
        answeredAndMarked,
        notVisited: Math.max(0, notVisited),
        status,
      };
    });
  };

  const handleSubmitClick = () => {
    const stats = calculateAllSectionsStats();
    setAllSectionsStats(stats);
    setShowExamSummary(true);
  };

  const confirmSectionSubmit = () => {
    setShowExamSummary(false);
    handleNextSection();
  };

  const confirmFinalSubmit = () => {
    setShowExamSummary(false);
    setShowSubmitConfirm(true);
  };

  const cancelSubmit = () => {
    setShowExamSummary(false);
    setShowSubmitConfirm(false);
  };

  const proceedWithFinalSubmit = () => {
    setShowSubmitConfirm(false);
    handleSubmitTest();
  };

  const handleNextSection = async () => {
    const sectionResult = calculateSectionResult(currentSection);
    setCurrentSectionResult(sectionResult);
    setCompletedSections((prev) => [...prev, sectionResult]);

    setSectionStates((prevStates) =>
      prevStates.map((state, idx) =>
        idx === currentSection
          ? {
              ...state,
              isCompleted: true,
              completedAt: new Date().toISOString(),
            }
          : { ...state },
      ),
    );

    setShowSectionResult(true);
  };

  const proceedToNextSection = async () => {
    setShowSectionResult(false);
    setCurrentSectionResult(null);

    if (currentSection < testData?.sections?.length - 1) {
      try {
        const authToken = localStorage.getItem("authToken");
        await fetch(
          `/api/mock-tests/attempt/${currentAttemptIdRef.current}/transition-section`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${authToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fromSection: testData.sections[currentSection].name,
              toSection: testData.sections[currentSection + 1].name,
            }),
          },
        );
      } catch (error) {
        console.error("Error transitioning section:", error);
      }

      setSectionStates((prevStates) =>
        prevStates.map((state, idx) =>
          idx === currentSection + 1
            ? { ...state, startedAt: new Date().toISOString() }
            : { ...state },
        ),
      );

      setCurrentSection((prev) => prev + 1);
      setCurrentQuestion(0);
      setVisitedQuestions(new Set([0]));
    } else {
      handleSubmitTest();
    }
  };

  const handleSubmitTest = async () => {
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);

      await syncProgress();

      if (
        currentSectionResult === null ||
        currentSectionResult.sectionName !==
          testData.sections[currentSection].name
      ) {
        const sectionResult = calculateSectionResult(currentSection);
        setCompletedSections((prev) => {
          const updated = [...prev];
          const existingIndex = updated.findIndex(
            (s) => s.sectionName === sectionResult.sectionName,
          );
          if (existingIndex >= 0) {
            updated[existingIndex] = sectionResult;
          } else {
            updated.push(sectionResult);
          }
          return updated;
        });
      }

      const authToken = localStorage.getItem("authToken");
      const response = await fetch(
        `/api/mock-tests/attempt/${currentAttemptIdRef.current}/submit`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setFinalResult(result.result);
          setShowFeedbackForm(true);
        }
      }
    } catch (error) {
      console.error("Error submitting test:", error);
      alert("Failed to submit test. Please try again.");
    }
  };

  const handleFeedbackSubmit = async (feedbackResponses) => {
    try {
      const authToken = localStorage.getItem("authToken");
      await fetch("/api/mock-test-feedback/submit", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          attemptId: currentAttemptIdRef.current,
          testId,
          responses: feedbackResponses,
        }),
      });
    } catch (error) {
      console.error("Error submitting feedback:", error);
    }
    navigate("/student/dashboard?section=analysis");
  };

  const handleFeedbackSkip = () => {
    navigate("/student/dashboard?section=analysis");
  };

  const getCurrentQuestion = () => {
    return testData?.sections[currentSection]?.questions?.[currentQuestion];
  };

  const getQuestionStatus = (questionIndex) => {
    const question =
      testData?.sections[currentSection]?.questions?.[questionIndex];
    const questionId = question?._id;
    const isAnswered = questionId && responses[questionId];
    const isMarked = markedForReview.has(questionIndex);
    const isVisited = visitedQuestions.has(questionIndex);

    if (isAnswered && isMarked) return "answered-marked";
    if (isMarked) return "marked";
    if (isAnswered) return "answered";
    if (isVisited) return "visited";
    return "not-visited";
  };

  const getSectionQuestionCounts = (sectionIndex) => {
    const section = testData?.sections?.[sectionIndex];
    if (!section) return { answered: 0, total: 0 };

    let answered = 0;
    section.questions?.forEach((q) => {
      if (responses[q._id]) answered++;
    });

    return { answered, total: section.questions?.length || 0 };
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 2));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.75));
  };

  const handleCalculatorInput = (value) => {
    switch (value) {
      case "C":
        setCalculatorValue("0");
        setCalculatorExpression("");
        break;
      case "←":
        setCalculatorValue((prev) =>
          prev.length > 1 ? prev.slice(0, -1) : "0",
        );
        break;
      case "+/-":
        setCalculatorValue((prev) =>
          prev.startsWith("-") ? prev.slice(1) : "-" + prev,
        );
        break;
      case "sqrt":
        try {
          const num = parseFloat(calculatorValue);
          setCalculatorValue(Math.sqrt(num).toString());
        } catch {
          setCalculatorValue("Error");
        }
        break;
      case "1/x":
        try {
          const num = parseFloat(calculatorValue);
          setCalculatorValue((1 / num).toString());
        } catch {
          setCalculatorValue("Error");
        }
        break;
      case "%":
        try {
          const num = parseFloat(calculatorValue);
          setCalculatorValue((num / 100).toString());
        } catch {
          setCalculatorValue("Error");
        }
        break;
      case "MC":
        setCalculatorMemory(0);
        break;
      case "MR":
        setCalculatorValue(calculatorMemory.toString());
        break;
      case "MS":
        setCalculatorMemory(parseFloat(calculatorValue) || 0);
        break;
      case "M+":
        setCalculatorMemory(
          (prev) => prev + (parseFloat(calculatorValue) || 0),
        );
        break;
      case "M-":
        setCalculatorMemory(
          (prev) => prev - (parseFloat(calculatorValue) || 0),
        );
        break;
      case "=":
        try {
          const expr = calculatorExpression + calculatorValue;
          const sanitizedExpr = expr.replace(/[^0-9+\-*/.()]/g, "");
          const result = eval(sanitizedExpr);
          setCalculatorValue(result.toString());
          setCalculatorExpression("");
        } catch {
          setCalculatorValue("Error");
        }
        break;
      case "+":
      case "-":
      case "*":
      case "/":
        setCalculatorExpression((prev) => prev + calculatorValue + value);
        setCalculatorValue("0");
        break;
      case ".":
        if (!calculatorValue.includes(".")) {
          setCalculatorValue((prev) => prev + ".");
        }
        break;
      default:
        if (/[0-9]/.test(value)) {
          setCalculatorValue((prev) => (prev === "0" ? value : prev + value));
        }
    }
  };

  if (loading) {
    return (
      <div className="cat-exam-loading">
        <div className="loading-spinner"></div>
        <p>{isResuming ? "Resuming your test..." : "Loading test..."}</p>
      </div>
    );
  }

  if (loadingError || !testData) {
    return (
      <div className="cat-exam-error">
        <h2>Error</h2>
        <p>{loadingError || "Failed to load test data"}</p>
        <button onClick={() => navigate("/student/dashboard")}>
          Go to Dashboard
        </button>
      </div>
    );
  }

  if (showFeedbackForm) {
    return (
      <div className="cat-exam-interface feedback-page">
        <div className="cat-header">
          <div className="cat-header-top">
            <div className="cat-logos">
              <img
                src="https://upload.wikimedia.org/wikipedia/en/thumb/4/49/Anna_University_Logo.svg/1200px-Anna_University_Logo.svg.png"
                alt="IIM"
                className="iim-logo"
              />
              <img
                src="https://upload.wikimedia.org/wikipedia/en/a/a3/IIM_Calcutta_Logo.svg"
                alt="IIM"
                className="iim-logo"
              />
              <img
                src="https://upload.wikimedia.org/wikipedia/en/5/5f/IIM_Bangalore_Logo.svg"
                alt="IIM"
                className="iim-logo"
              />
              <img
                src="https://upload.wikimedia.org/wikipedia/en/b/bd/IIM_Lucknow_Logo.png"
                alt="IIM"
                className="iim-logo"
              />
            </div>
            <div className="cat-title-center">
              <span className="cat-2025">CAT 2025</span>
            </div>
            <div className="cat-logos">
              <img
                src="https://upload.wikimedia.org/wikipedia/en/thumb/f/f3/IIM_Kozhikode_Logo.svg/1200px-IIM_Kozhikode_Logo.svg.png"
                alt="IIM"
                className="iim-logo"
              />
              <img
                src="https://upload.wikimedia.org/wikipedia/en/a/a3/IIM_Calcutta_Logo.svg"
                alt="IIM"
                className="iim-logo"
              />
              <img
                src="https://upload.wikimedia.org/wikipedia/en/5/5f/IIM_Bangalore_Logo.svg"
                alt="IIM"
                className="iim-logo"
              />
              <img
                src="https://upload.wikimedia.org/wikipedia/en/b/bd/IIM_Lucknow_Logo.png"
                alt="IIM"
                className="iim-logo"
              />
            </div>
          </div>
        </div>
        <div className="feedback-form-wrapper">
          <div className="feedback-student-info">
            <img
              src="https://cdn-icons-png.flaticon.com/512/149/149071.png"
              alt="Student"
              className="student-avatar"
            />
            <span className="student-name-display">{studentInfo.name}</span>
          </div>
          <CandidateFeedbackForm
            onSubmit={handleFeedbackSubmit}
            onSkip={handleFeedbackSkip}
            studentName={studentInfo.name}
            testTitle={testData?.title}
          />
        </div>
      </div>
    );
  }

  if (showFinalResult && finalResult) {
    return (
      <div className="cat-final-result">
        <div className="result-container">
          <h2>Test Completed!</h2>
          <div className="result-summary">
            <div className="result-card">
              <h3>Total Score</h3>
              <p className="score">{finalResult.totalScore || 0}</p>
            </div>
            <div className="result-card">
              <h3>Correct Answers</h3>
              <p className="correct">{finalResult.correct || 0}</p>
            </div>
            <div className="result-card">
              <h3>Incorrect Answers</h3>
              <p className="incorrect">{finalResult.incorrect || 0}</p>
            </div>
            <div className="result-card">
              <h3>Unattempted</h3>
              <p className="unattempted">{finalResult.unattempted || 0}</p>
            </div>
          </div>
          <button
            className="dashboard-btn"
            onClick={() => navigate("/student/dashboard")}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQuestionData = getCurrentQuestion();
  const totalQuestions =
    testData?.sections[currentSection]?.questions?.length || 0;
  const isCurrentSectionLocked = isSectionLocked(currentSection);
  const currentSectionTimeRemaining = getCurrentSectionTime();

  return (
    <div
      className="cat-exam-interface"
      style={{
        transform: `scale(${zoomLevel})`,
        transformOrigin: "top left",
        width: `${100 / zoomLevel}%`,
        height: `${100 / zoomLevel}vh`,
      }}
    >
      <div className="cat-header">
        {/* <div className="timer-top-bar">
          <div className="timer-left">
            <span className="timer-label-text">Time Left:</span>
            <span className="timer-value-large">{formatTime(currentSectionTimeRemaining)}</span>
          </div>
          <div className="timer-right">
            <span className="total-time-label">Total:</span>
            <span className="total-time-value">{formatTime(getTotalTimeRemaining())}</span>
          </div>
        </div> */}
        <div className="cat-header-top">
          <img
            src="/cat-iim-banner.png"
            alt="CAT 2025 - IIM Logos"
            className="cat-iim-banner"
          />
        </div>
        <div className="cat-header-bar">
          <span className="exam-title">CAT 2025 Mock Exam</span>
          <div className="header-tools">
            {/* <button
              className="header-tool-btn screen-magnifier-btn"
              onClick={() => {}}
            >
              <span className="tool-icon-circle orange">🔍</span> Screen
              Magnifier
            </button>
            <div className="magnifier-popup">
              <button
                className="mag-icon-btn"
                onClick={() => setZoomLevel(1)}
                title="Reset"
              >
                <span className="mag-reset-icon">▶</span>
              </button>
              <button
                className="mag-icon-btn"
                onClick={handleZoomIn}
                title="Zoom In"
              >
                <span className="mag-zoom-icon">🔍+</span>
              </button>
              <button
                className="mag-icon-btn"
                onClick={handleZoomOut}
                title="Zoom Out"
              >
                <span className="mag-zoom-icon">🔍-</span>
              </button>
            </div> */}
            <button
              className="header-tool-btn"
              onClick={() => setShowInstructions(true)}
            >
              <span className="tool-icon-circle blue">ℹ️</span> Instructions
            </button>
            <div className="header-floating-tools">
              <button
                className="floating-tool-btn calculator-btn"
                onClick={() => setShowCalculator(true)}
                title="Calculator"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <rect x="4" y="2" width="16" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
                  <rect x="6" y="4" width="12" height="4" rx="1" fill="currentColor"/>
                  <circle cx="8" cy="12" r="1.5" fill="currentColor"/>
                  <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                  <circle cx="16" cy="12" r="1.5" fill="currentColor"/>
                  <circle cx="8" cy="16" r="1.5" fill="currentColor"/>
                  <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
                  <circle cx="16" cy="16" r="1.5" fill="currentColor"/>
                  <circle cx="8" cy="20" r="1.5" fill="currentColor"/>
                  <circle cx="12" cy="20" r="1.5" fill="currentColor"/>
                  <circle cx="16" cy="20" r="1.5" fill="currentColor"/>
                </svg>
              </button>
              <button
                className="floating-tool-btn scratchpad-btn"
                onClick={() => setShowScratchPad(true)}
                title="Scratch Pad"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </button>
              <button
                className="floating-tool-btn zoom-btn"
                onClick={handleZoomIn}
                title="Zoom In"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="2"/>
                  <line x1="16" y1="16" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="7" y1="10" x2="13" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="10" y1="7" x2="10" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
              <button
                className="floating-tool-btn zoom-btn"
                onClick={handleZoomOut}
                title="Zoom Out"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="2"/>
                  <line x1="16" y1="16" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="7" y1="10" x2="13" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <button
              className="header-tool-btn"
              onClick={() => setShowQuestionPaper(true)}
            >
              <span className="tool-icon-circle blue">📄</span> Question Paper
            </button>
          </div>
        </div>
      </div>

      <div className="cat-exam-content">
        <div className="cat-question-panel">
          <div className="section-tabs-row">
            <button
              className="nav-arrow"
              onClick={handlePreviousQuestion}
              disabled={currentQuestion === 0}
            >
              ◀
            </button>
            {testData.sections.map((section, index) => {
              const counts = getSectionQuestionCounts(index);
              return (
                <button
                  key={index}
                  className={`section-tab-btn ${currentSection === index ? "active" : ""}`}
                  onClick={() => {
                    if (
                      canNavigateToSection(index) &&
                      !isSectionLocked(index)
                    ) {
                      setCurrentSection(index);
                      setCurrentQuestion(0);
                      setVisitedQuestions(new Set([0]));
                    }
                  }}
                >
                  {section.name}{" "}
                  <span className="section-count">{counts.total}</span>
                </button>
              );
            })}
            <button
              className="nav-arrow"
              onClick={handleNextQuestion}
              disabled={currentQuestion === totalQuestions - 1}
            >
              ▶
            </button>
            <div className="timer-display">
              Time Left :{" "}
              <span className="timer-value">
                {formatTime(currentSectionTimeRemaining)}
              </span>
            </div>
          </div>

          <div className="sections-label-row">
            <span className="sections-label">Sections</span>
            <div className="current-section-badge">
              {testData.sections[currentSection].name}
            </div>
          </div>

          <div className="marks-info-row">
            <span>Marks for correct answer: 3</span>
            <span className="separator">|</span>
            <span>Negative Marks: 1</span>
          </div>

          <div
            className={`question-content-area ${currentQuestionData?.passage ? "has-passage" : ""}`}
            style={{ fontSize: `${14 * zoomLevel}px` }}
          >
            {currentQuestionData?.passage && (
              <div className="passage-panel">
                <div className="passage-header">Passage</div>
                <div
                  className="passage-content"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(currentQuestionData.passage),
                  }}
                />
              </div>
            )}

            <div className="question-sections">
              <div className="question-numbers">
                Question No. {currentQuestion + 1}
              </div>
              

              <div className="question-text">
                {currentQuestionData?.questionText ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(currentQuestionData.questionText),
                    }}
                  />
                ) : (
                  <p>Loading question...</p>
                )}
              </div>

              {currentQuestionData?.images?.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`Question ${index + 1}`}
                  className="question-image"
                />
              ))}

              <div className="question-options">
                {/* TITA/NUMERIC Question Input - CAT-style Keypad Only */}
                {currentQuestionData?.questionType === "TITA" ||
                currentQuestionData?.questionType === "NUMERIC" ? (
                  <div className="tita-input-section">
                    {/* CAT-style Numeric Keypad */}
                    <div className="numeric-keypad">
                      <div className="keypad-display">
                        <input
                          type="text"
                          className="keypad-display-input"
                          value={responses[currentQuestionData?._id] || ""}
                          readOnly
                        />
                      </div>
                      <div className="keypad-row">
                        <button
                          type="button"
                          className="keypad-btn keypad-fn"
                          onClick={() => handleKeypadInput("Backspace")}
                        >
                          Backspace
                        </button>
                      </div>
                      <div className="keypad-row">
                        <button
                          type="button"
                          className="keypad-btn"
                          onClick={() => handleKeypadInput("7")}
                        >
                          7
                        </button>
                        <button
                          type="button"
                          className="keypad-btn"
                          onClick={() => handleKeypadInput("8")}
                        >
                          8
                        </button>
                        <button
                          type="button"
                          className="keypad-btn"
                          onClick={() => handleKeypadInput("9")}
                        >
                          9
                        </button>
                      </div>
                      <div className="keypad-row">
                        <button
                          type="button"
                          className="keypad-btn"
                          onClick={() => handleKeypadInput("4")}
                        >
                          4
                        </button>
                        <button
                          type="button"
                          className="keypad-btn"
                          onClick={() => handleKeypadInput("5")}
                        >
                          5
                        </button>
                        <button
                          type="button"
                          className="keypad-btn"
                          onClick={() => handleKeypadInput("6")}
                        >
                          6
                        </button>
                      </div>
                      <div className="keypad-row">
                        <button
                          type="button"
                          className="keypad-btn"
                          onClick={() => handleKeypadInput("1")}
                        >
                          1
                        </button>
                        <button
                          type="button"
                          className="keypad-btn"
                          onClick={() => handleKeypadInput("2")}
                        >
                          2
                        </button>
                        <button
                          type="button"
                          className="keypad-btn"
                          onClick={() => handleKeypadInput("3")}
                        >
                          3
                        </button>
                      </div>
                      <div className="keypad-row">
                        <button
                          type="button"
                          className="keypad-btn"
                          onClick={() => handleKeypadInput("0")}
                        >
                          0
                        </button>
                        <button
                          type="button"
                          className="keypad-btn"
                          onClick={() => handleKeypadInput(".")}
                        >
                          .
                        </button>
                        <button
                          type="button"
                          className="keypad-btn"
                          onClick={() => handleKeypadInput("-")}
                        >
                          -
                        </button>
                      </div>
                      <div className="keypad-row">
                        <button
                          type="button"
                          className="keypad-btn keypad-arrow"
                          onClick={() => handleKeypadInput("Left")}
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          className="keypad-btn keypad-arrow"
                          onClick={() => handleKeypadInput("Right")}
                        >
                          →
                        </button>
                      </div>
                      <div className="keypad-row">
                        <button
                          type="button"
                          className="keypad-btn keypad-fn keypad-clear"
                          onClick={() => handleKeypadInput("Clear")}
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                  </div>
                ) : currentQuestionData?.options ? (
                  (() => {
                    if (
                      typeof currentQuestionData.options === "object" &&
                      !Array.isArray(currentQuestionData.options)
                    ) {
                      return ["A", "B", "C", "D"]
                        .map((optionKey) => {
                          const optionText =
                            currentQuestionData.options[optionKey];
                          if (!optionText) return null;

                          const questionId = currentQuestionData._id;
                          const isSelected =
                            responses[questionId] === optionKey;

                          return (
                            <label
                              key={optionKey}
                              className={`option-label ${isSelected ? "selected" : ""}`}
                            >
                              <input
                                type="radio"
                                name={`question-${questionId}`}
                                value={optionKey}
                                checked={isSelected}
                                onChange={() => handleAnswerSelect(optionKey)}
                                disabled={isCurrentSectionLocked}
                              />
                              <span className="radio-circle"></span>
                              <span className="option-text">
                                <div
                                  dangerouslySetInnerHTML={{
                                    __html: sanitizeHtml(optionText),
                                  }}
                                />
                              </span>
                            </label>
                          );
                        })
                        .filter(Boolean);
                    }

                    if (Array.isArray(currentQuestionData.options)) {
                      return currentQuestionData.options.map(
                        (option, index) => {
                          const questionId = currentQuestionData._id;

                          if (
                            typeof option === "object" &&
                            option.label &&
                            option.value !== undefined
                          ) {
                            const optionLabel = option.label;
                            const optionText = option.value;
                            const isSelected =
                              responses[questionId] === optionLabel;

                            return (
                              <label
                                key={index}
                                className={`option-label ${isSelected ? "selected" : ""}`}
                              >
                                <input
                                  type="radio"
                                  name={`question-${questionId}`}
                                  value={optionLabel}
                                  checked={isSelected}
                                  onChange={() =>
                                    handleAnswerSelect(optionLabel)
                                  }
                                  disabled={isCurrentSectionLocked}
                                />
                                <span className="radio-circle"></span>
                                <span className="option-text">
                                  <div
                                    dangerouslySetInnerHTML={{
                                      __html: sanitizeHtml(optionText),
                                    }}
                                  />
                                </span>
                              </label>
                            );
                          }

                          const optionLabel = String.fromCharCode(65 + index);
                          const optionText =
                            typeof option === "object"
                              ? option.optionText || option.value || option.text || ""
                              : option;
                          const isSelected =
                            responses[questionId] === optionLabel ||
                            responses[questionId] === optionText;

                          return (
                            <label
                              key={index}
                              className={`option-label ${isSelected ? "selected" : ""}`}
                            >
                              <input
                                type="radio"
                                name={`question-${questionId}`}
                                value={optionLabel}
                                checked={isSelected}
                                onChange={() => handleAnswerSelect(optionLabel)}
                                disabled={isCurrentSectionLocked}
                              />
                              <span className="radio-circle"></span>
                              <span className="option-text">
                                <div
                                  dangerouslySetInnerHTML={{
                                    __html: sanitizeHtml(optionText),
                                  }}
                                />
                              </span>
                            </label>
                          );
                        },
                      );
                    }

                    return <p>No options available</p>;
                  })()
                ) : (
                  <p>Loading options...</p>
                )}
              </div>
            </div>
          </div>

          <div className="bottom-action-bar">
            <div className="left-actions">
              <button
                className="action-btn mark-review"
                onClick={handleMarkForReview}
              >
                Mark for Review
              </button>
              <button
                className="action-btn clear-response"
                onClick={handleClearResponse}
              >
                Clear Response
              </button>
            </div>
            <div className="right-actions">
              <button
                className="action-btn save-next"
                onClick={handleSaveAndNext}
              >
                Save & Next
              </button>
            </div>
          </div>
        </div>

        <div className="cat-sidebar-panel">
          <div className="profile-section">
            <div className="profile-avatar">
              <svg viewBox="0 0 100 100" className="avatar-svg">
                <circle cx="50" cy="35" r="22" fill="#4a90a4" />
                <ellipse cx="50" cy="85" rx="35" ry="25" fill="#4a90a4" />
              </svg>
            </div>
            <div className="profile-name">{studentInfo.name}</div>
          </div>

          <div className="question-legend">
            <div className="legend-row">
              <div className="legend-item">
                <span className="legend-box answered">
                  {Object.keys(responses).length}
                </span>
                <span className="legend-text">Answ...</span>
              </div>
              <div className="legend-item">
                <span className="legend-box not-answered">
                  {totalQuestions -
                    Object.keys(responses).filter((id) =>
                      testData.sections[currentSection].questions.some(
                        (q) => q._id === id,
                      ),
                    ).length}
                </span>
                <span className="legend-text">Not Answered</span>
              </div>
            </div>
            <div className="legend-row">
              <div className="legend-item">
                <span className="legend-box not-visited">
                  {totalQuestions - visitedQuestions.size}
                </span>
                <span className="legend-text">Not Visited</span>
              </div>
              <div className="legend-item">
                <span className="legend-box marked">
                  {markedForReview.size}
                </span>
                <span className="legend-text">Marked for Review</span>
              </div>
            </div>
            <div className="legend-row full-width">
              <div className="legend-item">
                <span className="legend-box answered-marked">0</span>
                <span className="legend-text">
                  Answered & Marked for Review (will also be evaluated)
                </span>
              </div>
            </div>
          </div>

          <div className="section-name-bar">
            {testData.sections[currentSection].name}
          </div>

          <div className="question-palette">
            <div className="palette-title">Choose a Question</div>
            <div className="palette-grid">
              {testData.sections[currentSection]?.questions?.map((_, index) => (
                <button
                  key={index}
                  className={`palette-btn ${getQuestionStatus(index)} ${currentQuestion === index ? "current" : ""}`}
                  onClick={() => handleQuestionSelect(index)}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
          
          <div className="sidebar-submit-section">
            <button className="sidebar-submit-btn" onClick={handleSubmitClick}>
              Submit
            </button>
          </div>
        </div>
      </div>

      {showCalculator && (
        <div className="modal-overlay" onClick={() => setShowCalculator(false)}>
          <div
            className="calculator-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="calculator-header">
              <h4>Calculator</h4>
              <button onClick={() => setShowCalculator(false)}>×</button>
            </div>
            <div className="calculator-body">
              <div className="calculator-expression">
                {calculatorExpression}
              </div>
              <div className="calculator-display">{calculatorValue}</div>
              <div className="calculator-buttons">
                <div className="calculator-row memory-row">
                  {["MC", "MR", "MS", "M+", "M-"].map((btn) => (
                    <button
                      key={btn}
                      className="calc-btn memory"
                      onClick={() => handleCalculatorInput(btn)}
                    >
                      {btn}
                    </button>
                  ))}
                </div>
                <div className="calculator-row">
                  <button
                    className="calc-btn function-red"
                    onClick={() => handleCalculatorInput("←")}
                  >
                    ←
                  </button>
                  <button
                    className="calc-btn function-red"
                    onClick={() => handleCalculatorInput("C")}
                  >
                    C
                  </button>
                  <button
                    className="calc-btn function"
                    onClick={() => handleCalculatorInput("+/-")}
                  >
                    +/-
                  </button>
                  <button
                    className="calc-btn function"
                    onClick={() => handleCalculatorInput("sqrt")}
                  >
                    √
                  </button>
                </div>
                <div className="calculator-row">
                  {["7", "8", "9", "/"].map((btn) => (
                    <button
                      key={btn}
                      className={`calc-btn ${btn === "/" ? "operator" : "number"}`}
                      onClick={() => handleCalculatorInput(btn)}
                    >
                      {btn}
                    </button>
                  ))}
                  <button
                    className="calc-btn operator"
                    onClick={() => handleCalculatorInput("%")}
                  >
                    %
                  </button>
                </div>
                <div className="calculator-row">
                  {["4", "5", "6", "*"].map((btn) => (
                    <button
                      key={btn}
                      className={`calc-btn ${btn === "*" ? "operator" : "number"}`}
                      onClick={() => handleCalculatorInput(btn)}
                    >
                      {btn === "*" ? "×" : btn}
                    </button>
                  ))}
                  <button
                    className="calc-btn operator"
                    onClick={() => handleCalculatorInput("1/x")}
                  >
                    1/x
                  </button>
                </div>
                <div className="calculator-row">
                  {["1", "2", "3", "-"].map((btn) => (
                    <button
                      key={btn}
                      className={`calc-btn ${btn === "-" ? "operator" : "number"}`}
                      onClick={() => handleCalculatorInput(btn)}
                    >
                      {btn}
                    </button>
                  ))}
                  <button
                    className="calc-btn equals"
                    rowSpan="2"
                    onClick={() => handleCalculatorInput("=")}
                  >
                    =
                  </button>
                </div>
                <div className="calculator-row">
                  <button
                    className="calc-btn number wide"
                    onClick={() => handleCalculatorInput("0")}
                  >
                    0
                  </button>
                  <button
                    className="calc-btn number"
                    onClick={() => handleCalculatorInput(".")}
                  >
                    .
                  </button>
                  <button
                    className="calc-btn operator"
                    onClick={() => handleCalculatorInput("+")}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showScratchPad && (
        <div className="modal-overlay" onClick={() => setShowScratchPad(false)}>
          <div
            className="scratchpad-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="scratchpad-header">
              <h4>Scratch Pad</h4>
              <div className="scratchpad-controls">
                <button
                  className={`mode-btn ${!drawingMode ? "active" : ""}`}
                  onClick={() => setDrawingMode(false)}
                >
                  Text
                </button>
                <button
                  className={`mode-btn ${drawingMode ? "active" : ""}`}
                  onClick={() => setDrawingMode(true)}
                >
                  Draw
                </button>
              </div>
              <button onClick={() => setShowScratchPad(false)}>×</button>
            </div>
            {drawingMode ? (
              <canvas
                ref={canvasRef}
                className="scratchpad-canvas"
                width={460}
                height={300}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
            ) : (
              <textarea
                className="scratchpad-textarea"
                value={scratchPadContent}
                onChange={(e) => setScratchPadContent(e.target.value)}
                placeholder="Use this space for rough work..."
              />
            )}
            <div className="scratchpad-actions">
              {drawingMode ? (
                <button onClick={clearCanvas}>Clear Drawing</button>
              ) : (
                <button onClick={() => setScratchPadContent("")}>
                  Clear Text
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showInstructions && (
        <div
          className="modal-overlay"
          onClick={() => setShowInstructions(false)}
        >
          <div
            className="instructions-modal instructions-modal-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="instructions-header">
              <h4>Test Instructions</h4>
              <button onClick={() => setShowInstructions(false)}>×</button>
            </div>
            <div className="instructions-content instructions-content-full">
              <div className="instruction-section">
                <h5>General Instructions:</h5>
                <ol>
                  <li>
                    Total duration of examination is{" "}
                    <strong>120 minutes</strong>.
                  </li>
                  <li>
                    The clock will be set at the server. The countdown timer at
                    the top right corner of screen will display the remaining
                    time available for you to complete the examination. When the
                    timer reaches zero, the examination will end by itself. You
                    need not terminate the examination or submit your answers.
                  </li>
                  <li>
                    The Question Palette displayed on the right side of screen
                    will show the status of each question using one of the
                    following symbols:
                    <div className="legend-grid">
                      <div className="legend-item">
                        <span className="legend-box not-visited"></span> You
                        have not visited the question yet.
                      </div>
                      <div className="legend-item">
                        <span className="legend-box not-answered"></span> You
                        have not answered the question.
                      </div>
                      <div className="legend-item">
                        <span className="legend-box answered"></span> You have
                        answered the question.
                      </div>
                      <div className="legend-item">
                        <span className="legend-box marked-review"></span> You
                        have NOT answered the question, but have marked the
                        question for review.
                      </div>
                      <div className="legend-item">
                        <span className="legend-box answered-marked"></span> You
                        have answered the question, but marked it for review.
                      </div>
                    </div>
                  </li>
                </ol>
              </div>

              <div className="instruction-section">
                <h5>Navigating to a Question:</h5>
                <ol>
                  <li>
                    To answer a question, do the following:
                    <ul>
                      <li>
                        Click on the question number in the Question Palette at
                        the right of your screen to go to that numbered question
                        directly. Note that using this option does NOT save your
                        answer to the current question.
                      </li>
                      <li>
                        Click on <strong>Save & Next</strong> to save your
                        answer for the current question and then go to the next
                        question.
                      </li>
                      <li>
                        Click on <strong>Mark for Review</strong> to save
                        your answer for the current question and also mark it
                        for review.
                      </li>
                    </ul>
                  </li>
                  <li>
                    You can shuffle between sections and questions anytime
                    during the examination as per the rules of the test.
                  </li>
                </ol>
              </div>

              <div className="instruction-section">
                <h5>Answering a Question:</h5>
                <ol>
                  <li>
                    For Multiple Choice Questions (MCQ):
                    <ul>
                      <li>
                        To select your answer, click on the button of one of the
                        options.
                      </li>
                      <li>
                        To deselect your chosen answer, click on the button of
                        the chosen option again or click on the{" "}
                        <strong>Clear Response</strong> button.
                      </li>
                      <li>
                        To change your chosen answer, click on the button of
                        another option.
                      </li>
                    </ul>
                  </li>
                  <li>
                    For Numerical Answer Type Questions:
                    <ul>
                      <li>
                        To enter a number as your answer, use the virtual
                        numerical keypad.
                      </li>
                      <li>
                        A fraction (e.g., -0.3 or -.3) can be entered as an
                        answer with or without "0" before the decimal point.
                      </li>
                      <li>
                        To clear your answer, click on the{" "}
                        <strong>Clear All</strong> button.
                      </li>
                      <li>
                        To change your answer, use Backspace or Clear All and
                        re-enter a new answer.
                      </li>
                    </ul>
                  </li>
                  <li>
                    To mark a question for review, click on the{" "}
                    <strong>Mark for Review</strong> button.
                  </li>
                </ol>
              </div>

              <div className="instruction-section">
                <h5>Marking Scheme:</h5>
                <ul className="marking-list">
                  <li>
                    <strong>MCQ Questions:</strong> +3 marks for correct answer,
                    -1 for incorrect answer
                  </li>
                  <li>
                    <strong>Non-MCQ Questions (TITA/Numeric):</strong> +3 marks
                    for correct answer, No negative marking
                  </li>
                  <li>
                    Questions that are not attempted will result in zero marks.
                  </li>
                </ul>
              </div>

              <div className="instruction-section">
                <h5>Section-wise Time Limit:</h5>
                <ul className="marking-list">
                  <li>
                    Each section has a time limit of <strong>40 minutes</strong>
                    .
                  </li>
                  <li>
                    Once a section's time expires, you will be automatically
                    moved to the next section.
                  </li>
                  <li>
                    You <strong>cannot</strong> go back to a previous section
                    once its time is over.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {showQuestionPaper && (
        <div
          className="modal-overlay"
          onClick={() => setShowQuestionPaper(false)}
        >
          <div
            className="question-paper-modal cat-qp-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="question-paper-header cat-qp-header">
              <span>Question Paper</span>
              <button onClick={() => setShowQuestionPaper(false)}>
                Close ×
              </button>
            </div>
            <div className="question-paper-content cat-qp-content">
              {testData.sections[currentSection]?.questions?.map((q, index) => (
                <div key={index} className="cat-qp-question-block">
                  <div className="cat-qp-question-header">
                    <span className="cat-qp-qnum">Q.{index + 1})</span>
                    <span className="cat-qp-question-type">
                      {q?.questionType === 'SINGLE_CORRECT_MCQ' ? 'Single Correct MCQ' :
                       q?.questionType === 'MULTI_CORRECT_MCQ' ? 'Multi Correct MCQ' :
                       q?.questionType === 'TITA' ? 'TITA' :
                       q?.questionType === 'NUMERIC' ? 'Numeric' : 'MCQ'}
                    </span>
                  </div>
                  <div className="cat-qp-marks-info">
                    <span>
                      Marks for correct answer:{" "}
                      <strong className="green-text">{q?.marks?.positive || 3}</strong>
                    </span>
                    <span>
                      {" "}
                      ; Negative Marks: <strong className="red-text">{Math.abs(q?.marks?.negative) || 1}</strong>
                    </span>
                  </div>
                  <div className="cat-qp-question-content">
                    <div
                      className="cat-qp-question-text"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(
                          q?.questionText || `Question ${index + 1}`,
                        ),
                      }}
                    />
                  </div>
                  {q?.options && (
                    <div className="cat-qp-options">
                      {typeof q.options === "object" &&
                      !Array.isArray(q.options)
                        ? ["A", "B", "C", "D"].map(
                            (key, optIndex) =>
                              q.options[key] && (
                                <div key={key} className="cat-qp-option">
                                  <span className="cat-qp-option-num">
                                    {optIndex + 1}
                                  </span>
                                  <div
                                    className="cat-qp-option-text"
                                    dangerouslySetInnerHTML={{
                                      __html: sanitizeHtml(q.options[key]),
                                    }}
                                  />
                                </div>
                              ),
                          )
                        : Array.isArray(q.options)
                          ? q.options.map((opt, optIndex) => (
                              <div key={optIndex} className="cat-qp-option">
                                <span className="cat-qp-option-num">
                                  {optIndex + 1}
                                </span>
                                <div
                                  className="cat-qp-option-text"
                                  dangerouslySetInnerHTML={{
                                    __html: sanitizeHtml(
                                      typeof opt === "string"
                                        ? opt
                                        : opt?.value || opt?.optionText || opt?.text || "",
                                    ),
                                  }}
                                />
                              </div>
                            ))
                          : null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showSectionLockedModal && lockedSectionInfo && (
        <div className="modal-overlay">
          <div className="section-locked-modal">
            <div className="section-locked-header">
              <h3>Section Time Complete</h3>
            </div>
            <div className="section-locked-content">
              <div className="time-up-icon">⏰</div>
              <p>{lockedSectionInfo.message}</p>
              <p className="section-locked-note">
                Your answers have been saved. You cannot return to this section.
              </p>
            </div>
            <div className="section-locked-actions">
              <button
                className="continue-btn"
                onClick={handleSectionLockedContinue}
              >
                {currentSection < testData.sections.length - 1
                  ? "Continue to Next Section"
                  : "View Results"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSectionResult && currentSectionResult && (
        <div className="modal-overlay">
          <div className="section-result-modal">
            <div className="section-result-header">
              <h3>Section Complete - {currentSectionResult.sectionName}</h3>
            </div>
            <div className="section-result-content">
              <div className="result-stats">
                <div className="stat-item">
                  <span>Total Questions:</span>
                  <span>{currentSectionResult.totalQuestions}</span>
                </div>
                <div className="stat-item">
                  <span>Answered:</span>
                  <span className="answered">
                    {currentSectionResult.answered}
                  </span>
                </div>
                <div className="stat-item">
                  <span>Not Answered:</span>
                  <span className="not-answered">
                    {currentSectionResult.notAnswered}
                  </span>
                </div>
                <div className="stat-item">
                  <span>Marked for Review:</span>
                  <span className="marked">
                    {currentSectionResult.markedForReview}
                  </span>
                </div>
              </div>
            </div>
            <div className="section-result-actions">
              <button className="continue-btn" onClick={proceedToNextSection}>
                {currentSection < testData.sections.length - 1
                  ? "Continue to Next Section"
                  : "Submit Test"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showExamSummary && (
        <div className="modal-overlay">
          <div className="exam-summary-modal cat-exam-summary">
            <div className="exam-summary-header cat-summary-header">
              <h2>Exam Summary</h2>
            </div>
            <div className="exam-summary-content cat-summary-content">
              {allSectionsStats.map((section, index) => (
                <div
                  key={index}
                  className={`section-summary-block cat-section-block ${section.status}`}
                >
                  {section.status === "yet_to_attempt" ? (
                    <div className="cat-section-yet-to-attempt">
                      <strong>{section.sectionName}</strong> : ( Yet to attempt
                      )
                    </div>
                  ) : (
                    <>
                      <div
                        className={`cat-section-header ${section.status === "current" ? "current-header" : "completed-header"}`}
                      >
                        <strong>{section.sectionName}</strong> :
                        <span className="section-status-text">
                          {section.status === "current"
                            ? " ( Current Group )"
                            : " ( Attempted Group ; View not allowed; Edit not allowed)"}
                        </span>
                      </div>
                      <table className="summary-table cat-summary-table">
                        <thead>
                          <tr>
                            <th>Section Name</th>
                            <th>No. of Questions</th>
                            <th>Answered</th>
                            <th>Not Answered</th>
                            <th>Marked for Review</th>
                            <th>
                              Answered & Marked for Review (will also be
                              evaluated)
                            </th>
                            <th>Not Visited</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>{section.sectionName}</td>
                            <td>{section.totalQuestions}</td>
                            <td>{section.answered}</td>
                            <td>{section.notAnswered}</td>
                            <td>{section.markedForReview}</td>
                            <td>{section.answeredAndMarked}</td>
                            <td>{section.notVisited}</td>
                          </tr>
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              ))}

              <div className="exam-summary-warning cat-summary-warning">
                <p>
                  Are you sure to submit this Group? Click 'Yes' to proceed;
                  Click 'No' to go back.
                </p>
                <p className="warning-note">
                  Dear Candidate, Once the Group is submitted, you cannot
                  revisit and edit your responses.
                </p>
              </div>
            </div>
            <div className="exam-summary-actions cat-summary-actions">
              <button
                className="summary-btn yes-btn"
                onClick={
                  currentSection < testData.sections.length - 1
                    ? confirmSectionSubmit
                    : confirmFinalSubmit
                }
              >
                Yes
              </button>
              <button className="summary-btn no-btn" onClick={cancelSubmit}>
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {showSubmitConfirm && (
        <div className="modal-overlay">
          <div className="submit-confirm-modal">
            <div className="submit-confirm-content">
              <p className="submit-warning">
                Dear Candidate, Thank you. Please note that your Exam is about
                to be submitted. Click on 'OK' to proceed further.
              </p>
              <p className="submit-question">
                Are you sure to submit the exam?
              </p>
            </div>
            <div className="submit-confirm-actions">
              <button
                className="confirm-btn ok-btn"
                onClick={proceedWithFinalSubmit}
              >
                OK
              </button>
              <button className="confirm-btn cancel-btn" onClick={cancelSubmit}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MockTestAttempt;

const MockTestSeries = require('../models/MockTestSeries');
const MockTest = require('../models/MockTest');
const MockTestQuestion = require('../models/MockTestQuestion');
const MockTestAttempt = require('../models/MockTestAttempt');
const User = require('../models/UserSchema');



// Get all published mock test series for students
const getPublishedSeries = async (req, res) => {
  try {
    console.log('📚 Fetching published mock test series');
    const { category = 'all', page = 1, limit = 10 } = req.query;

    const filter = {
      isActive: true,
      isPublished: true
    };

    if (category && category !== 'all') {
      filter.category = category;
    }

    const series = await MockTestSeries.find(filter)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await MockTestSeries.countDocuments(filter);

    console.log(`✅ Found ${series.length} published mock test series`);
    res.status(200).json({
      success: true,
      series,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching mock test series:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mock test series',
      error: error.message
    });
  }
};

// Get tests in a specific series
const getTestsInSeries = async (req, res) => {
  try {
    const { seriesId } = req.params;
    const { examCategoryId, examYearId, examSlotId } = req.query;
    const userId = req.user ? req.user.id : null;

    console.log(`📋 Fetching tests for series: ${seriesId}${userId ? ` (authenticated user: ${userId})` : ' (guest user)'}`);

    const series = await MockTestSeries.findById(seriesId);
    if (!series || !series.isActive || !series.isPublished) {
      return res.status(404).json({
        success: false,
        message: 'Mock test series not found'
      });
    }

    const filter = {
      seriesId: seriesId,
      isActive: true,
      isPublished: true
    };
    
    // Filter by exam hierarchy for previous year papers
    const mongoose = require('mongoose');
    if (examCategoryId && examCategoryId !== 'all') {
      if (mongoose.Types.ObjectId.isValid(examCategoryId)) {
        filter.previousYearExamCategoryId = examCategoryId;
      }
    }
    if (examYearId && examYearId !== 'all') {
      if (mongoose.Types.ObjectId.isValid(examYearId)) {
        filter.previousYearExamYearId = examYearId;
      }
    }
    if (examSlotId && examSlotId !== 'all') {
      if (mongoose.Types.ObjectId.isValid(examSlotId)) {
        filter.previousYearExamSlotId = examSlotId;
      }
    }

    const tests = await MockTest.find(filter).sort({ testNumber: 1 });

    let testWithStatus;

    if (userId) {
      // For authenticated users, check which tests they have attempted
      let attempts = [];
      try {
        // Only query if userId is a valid ObjectId
        const mongoose = require('mongoose');
        if (mongoose.Types.ObjectId.isValid(userId)) {
          attempts = await MockTestAttempt.find({
            userId: userId,
            seriesId: seriesId
          });
        } else {
          console.log(`⚠️ Invalid userId format: ${userId}, treating as guest user`);
        }
      } catch (error) {
        console.log(`⚠️ Error querying attempts for user ${userId}:`, error.message);
        attempts = [];
      }

      testWithStatus = tests.map(test => {
        const attempt = attempts.find(att => att.testId.toString() === test._id.toString());
        return {
          ...test.toObject(),
          hasAttempted: !!attempt,
          isCompleted: attempt ? attempt.isCompleted : false,
          score: attempt ? attempt.score.total : null,
          attemptDate: attempt ? attempt.createdAt : null
        };
      });
    } else {
      // For guest users, show basic test info without attempt status
      testWithStatus = tests.map(test => ({
        ...test.toObject(),
        hasAttempted: false,
        isCompleted: false,
        score: null,
        attemptDate: null
      }));
    }

    console.log(`✅ Found ${tests.length} tests in series`);
    res.status(200).json({
      success: true,
      series,
      tests: testWithStatus
    });
  } catch (error) {
    console.error('❌ Error fetching tests in series:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tests',
      error: error.message
    });
  }
};

// Get test details and instructions
const getTestDetails = async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req.user ? req.user.id : null;

    console.log(
      `📖 Fetching test details: ${testId}${
        userId ? ` (authenticated user: ${userId})` : " (guest user)"
      }`
    );

    // First try MockTest model
    let test = await MockTest.findById(testId)
      .populate("seriesId", "title category enrolledStudents")
      .populate("createdBy", "name");
    
    let isCourseTest = false;

    // If not found in MockTest, try Test model (course content tests)
    if (!test) {
      console.log("📚 Test not found in MockTest, checking course content Tests...");
      const CourseTest = require("../models/course/Test");
      const Question = require("../models/course/Question");
      
      test = await CourseTest.findById(testId)
        .populate("course", "name")
        .populate("subject", "name")
        .populate("chapter", "name")
        .populate("topic", "name");
      
      if (test) {
        isCourseTest = true;
        console.log("✅ Found test in course content");
        
        // Get question count for this test
        const questionCount = await Question.countDocuments({ testId: testId });
        
        // Transform to match MockTest format for frontend compatibility
        test = {
          _id: test._id,
          title: test.title,
          duration: test.duration,
          totalMarks: test.totalMarks,
          instructions: test.instructions || "Please read all questions carefully before answering.",
          questionCount: questionCount,
          isActive: test.isActive,
          isPublished: true,
          isFree: true, // Course tests are accessible if user has course access
          isCourseTest: true,
          course: test.course,
          subject: test.subject,
          chapter: test.chapter,
          topic: test.topic
        };
      }
    }

    if (!test || (!isCourseTest && (!test.isActive || !test.isPublished))) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }
    
    // For course tests, skip mock test series enrollment check
    if (isCourseTest) {
      console.log("✅ Course test details fetched successfully");
      return res.status(200).json({
        success: true,
        test,
        hasAttempted: false,
        attempt: null,
        requiresPurchase: false,
        isCourseTest: true
      });
    }

    // ================= ENROLLMENT CHECK =================
    const series = test.seriesId;
    let isEnrolled = false;

    if (userId) {
      try {
        const mongoose = require("mongoose");

        // Dev user ko full access de do
        if (userId === "507f1f77bcf86cd799439011") {
          isEnrolled = true;
        } else if (
          mongoose.Types.ObjectId.isValid(userId) &&
          series?.enrolledStudents
        ) {
          isEnrolled = series.enrolledStudents.some(
            (enrollment) =>
              enrollment.studentId &&
              enrollment.studentId.toString() === userId
          );
        }
      } catch (error) {
        console.log(
          `⚠️ Error checking enrollment for user ${userId}:`,
          error.message
        );
      }
    }

    console.log(
      `📊 Enrollment check: userId=${userId}, isFree=${test.isFree}, isEnrolled=${isEnrolled}`
    );

    // Pehle yahin se 403 aa raha tha.
    // Naya logic:
    //  - Agar user GUEST hai aur test paid hai → 403
    //  - Agar user LOGIN hai, to details de do (sirf flag bhej denge)
    const requiresPurchase = !test.isFree && !isEnrolled;

    if (!userId && requiresPurchase) {
      return res.status(403).json({
        success: false,
        message:
          "You need to purchase this mock test series to access this test",
      });
    }

    // ================= EXISTING ATTEMPT CHECK =================
    let existingAttempt = null;
    if (userId) {
      try {
        const mongoose = require("mongoose");
        if (userId === "507f1f77bcf86cd799439011") {
          // Dev user ke liye multiple attempts allow
          existingAttempt = null;
        } else if (mongoose.Types.ObjectId.isValid(userId)) {
          existingAttempt = await MockTestAttempt.findOne({
            userId: userId,
            testPaperId: testId,
          });
        }
      } catch (error) {
        console.log(
          `⚠️ Error checking existing attempt for user ${userId}:`,
          error.message
        );
      }
    }

    console.log("✅ Test details fetched successfully");
    return res.status(200).json({
      success: true,
      test,
      hasAttempted: !!existingAttempt,
      attempt: existingAttempt,
      requiresPurchase, // front-end chaahe to isse UI block kar sakta hai
    });
  } catch (error) {
    console.error("❌ Error fetching test details:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch test details",
      error: error.message,
    });
  }
};


// Start a mock test attempt
const startTestAttempt = async (req, res) => {
  try {
    console.log('🔍 startTestAttempt called');
    console.log('Request params:', req.params);
    console.log('Request user:', req.user);
    console.log('Request headers authorization:', req.headers.authorization);

    const { testId } = req.params;
    const userId = req.user ? req.user.id : 'no-user';
    const mongoose = require('mongoose');

    console.log(`🚀 Starting test attempt for test: ${testId}, user: ${userId}`);

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(testId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid test ID format'
      });
    }

    // Validate ObjectId format for all users now (including dev user with proper ObjectId)
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // First try MockTest model
    let test = await MockTest.findById(testId).populate('seriesId');
    let isCourseTest = false;
    let courseTestData = null;
    
    // If not found in MockTest, try Test model (course content tests)
    if (!test) {
      console.log("📚 Test not found in MockTest, checking course content Tests...");
      const CourseTest = require("../models/course/Test");
      const Question = require("../models/course/Question");
      
      courseTestData = await CourseTest.findById(testId)
        .populate("course", "name")
        .populate("subject", "name")
        .populate("chapter", "name")
        .populate("topic", "name");
      
      if (courseTestData && courseTestData.isActive) {
        isCourseTest = true;
        console.log("✅ Found test in course content, starting course test attempt");
        
        // Get questions for this test
        const questions = await Question.find({ testId: testId }).sort({ createdAt: 1 });
        
        // Create a simple attempt for course test
        const attemptId = new mongoose.Types.ObjectId();
        
        // Create single section for course tests
        const singleSection = {
          name: courseTestData.topic?.name || 'General',
          duration: courseTestData.duration || 30,
          questionCount: questions.length
        };
        
        // Create new attempt for course test
        const newAttempt = new MockTestAttempt({
          _id: attemptId,
          userId: userId,
          testPaperId: testId,
          seriesId: null, // No series for course tests
          totalDuration: courseTestData.duration || 30,
          startedAt: new Date(),
          status: 'IN_PROGRESS',
          currentSectionKey: singleSection.name,
          currentSectionIndex: 0,
          currentQuestionIndex: 0,
          sectionStates: [{
            sectionKey: singleSection.name,
            startedAt: new Date(),
            remainingSeconds: (courseTestData.duration || 30) * 60,
            isLocked: false,
            isCompleted: false,
            completedAt: null
          }],
          lastSyncedAt: new Date(),
          responses: [],
          isCourseTest: true
        });

        await newAttempt.save();
        
        // Format questions for frontend
        const formattedQuestions = questions.map((q, idx) => ({
          _id: q._id,
          questionText: q.questionText,
          questionType: q.questionType || 'MCQ',
          section: singleSection.name,
          options: {
            A: q.options?.A || q.optionA || '',
            B: q.options?.B || q.optionB || '',
            C: q.options?.C || q.optionC || '',
            D: q.options?.D || q.optionD || ''
          },
          marks: q.marks || 3,
          sequenceNumber: idx + 1,
          images: []
        }));

        return res.status(200).json({
          success: true,
          message: 'Course test attempt started',
          attempt: newAttempt,
          test: {
            _id: courseTestData._id,
            title: courseTestData.title,
            duration: courseTestData.duration,
            totalMarks: courseTestData.totalMarks,
            sections: [singleSection],
            isCourseTest: true
          },
          questions: formattedQuestions,
          resuming: false
        });
      }
    }
    
    if (!test || !test.isActive || !test.isPublished) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Check if student has access (for MockTest only)
    const series = test.seriesId;
    let isEnrolled = false;

    // For development user (using fixed ObjectId), allow access to free tests
    if (userId === '507f1f77bcf86cd799439011') {
      isEnrolled = test.isFree;
    } else if (series?.enrolledStudents && series.enrolledStudents.length > 0) {
      isEnrolled = series.enrolledStudents.some(
        enrollment => enrollment.studentId.toString() === userId
      );
    }

    // Also check if user has access via course enrollment
    if (!isEnrolled && test.courseId && userId) {
      try {
        const User = require('../models/UserSchema');
        const user = await User.findById(userId).select('enrolledCourses');
        if (user && user.enrolledCourses) {
          const courseIdStr = test.courseId.toString();
          isEnrolled = user.enrolledCourses.some(
            enrollment => enrollment.courseId && enrollment.courseId.toString() === courseIdStr
          );
          if (isEnrolled) {
            console.log(`✅ User has access via course enrollment: ${courseIdStr}`);
          }
        }
      } catch (courseCheckError) {
        console.error('Error checking course enrollment:', courseCheckError.message);
      }
    }

    if (!test.isFree && !isEnrolled) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Please purchase the mock test series.'
      });
    }

    // Check if already attempted (skip for development user to allow multiple attempts)
    let existingAttempt = null;
    if (userId !== '507f1f77bcf86cd799439011') {
      existingAttempt = await MockTestAttempt.findOne({
        userId: userId,
        testPaperId: testId
      });

      if (existingAttempt) {
        // Check if the attempt is completed/submitted - if so, reset for re-attempt
        if (existingAttempt.status === 'COMPLETED' || existingAttempt.status === 'EXPIRED') {
          console.log('🔄 Previous attempt was completed, resetting for re-attempt');
          
          // Reset the attempt for a fresh re-attempt
          const resetSectionStates = test.sections.map((section, index) => ({
            sectionKey: section.name,
            startedAt: index === 0 ? new Date() : null,
            remainingSeconds: section.duration * 60,
            isLocked: false,
            isCompleted: false,
            completedAt: null
          }));
          
          existingAttempt.status = 'IN_PROGRESS';
          existingAttempt.startedAt = new Date();
          existingAttempt.completedAt = null;
          existingAttempt.currentSectionKey = test.sections[0]?.name || 'VARC';
          existingAttempt.currentSectionIndex = 0;
          existingAttempt.currentQuestionIndex = 0;
          existingAttempt.sectionStates = resetSectionStates;
          existingAttempt.lastSyncedAt = new Date();
          existingAttempt.responses = [];
          existingAttempt.totalScore = 0;
          existingAttempt.totalMaxScore = 0;
          existingAttempt.totalTimeTakenSeconds = 0;
          existingAttempt.sectionWiseStats = [];
          existingAttempt.rank = null;
          existingAttempt.percentile = null;
          
          await existingAttempt.save();
          
          // Don't return here - continue to fetch questions and return fresh test data
        } else {
          // Return the existing attempt for resume (in-progress attempt)
          return res.status(200).json({
            success: true,
            message: 'Resuming existing attempt',
            attempt: existingAttempt,
            resuming: true
          });
        }
      }
    }

    // Use existing reset attempt or create new attempt
    let attemptToUse = existingAttempt; // Will be set if we reset an existing completed attempt
    
    if (!attemptToUse) {
      // Initialize section states for session persistence
      const initialSectionStates = test.sections.map((section, index) => ({
        sectionKey: section.name,
        startedAt: index === 0 ? new Date() : null, // Only first section starts immediately
        remainingSeconds: section.duration * 60, // Convert minutes to seconds
        isLocked: false,
        isCompleted: false,
        completedAt: null
      }));

      // Create new attempt
      attemptToUse = new MockTestAttempt({
        userId: userId,
        testPaperId: testId,
        seriesId: test.seriesId?._id || null,
        totalDuration: test.duration,
        startedAt: new Date(),
        status: 'IN_PROGRESS',
        currentSectionKey: test.sections[0]?.name || 'VARC',
        currentSectionIndex: 0,
        currentQuestionIndex: 0,
        sectionStates: initialSectionStates,
        lastSyncedAt: new Date(),
        responses: []
      });

      await attemptToUse.save();
    }

    // Get questions for the test
    const questionsWithSections = [];
    
    // First, get ALL questions for this test as a fallback pool
    const allTestQuestions = await MockTestQuestion.find({
      testPaperId: testId,
      isActive: true
    }).select('_id questionText passage questionType section images options marks sequenceNumber correctOptionIds').sort({ sequenceNumber: 1 });
    
    console.log(`📚 Total questions for test: ${allTestQuestions.length}`);
    
    let usedQuestionIds = new Set();
    
    for (const section of test.sections) {
      let questions = [];
      
      // First try to get questions from section.questions array
      if (section.questions && section.questions.length > 0) {
        questions = await MockTestQuestion.find({
          _id: { $in: section.questions }
        }).select('_id questionText passage questionType section images options marks sequenceNumber correctOptionIds').sort({ sequenceNumber: 1 });
      }
      
      // Fallback 1: Query by testPaperId and section name
      if (questions.length === 0) {
        console.log(`🔄 Fallback 1: Querying questions for section ${section.name} by testPaperId`);
        questions = await MockTestQuestion.find({
          testPaperId: testId,
          section: section.name,
          isActive: true
        }).select('_id questionText passage questionType section images options marks sequenceNumber correctOptionIds').sort({ sequenceNumber: 1 });
      }
      
      // Fallback 2: If still no questions and this is first section, use all test questions
      if (questions.length === 0 && allTestQuestions.length > 0) {
        console.log(`🔄 Fallback 2: Using all test questions for section ${section.name}`);
        // For first section, assign all unused questions
        questions = allTestQuestions.filter(q => !usedQuestionIds.has(q._id.toString()));
        // Mark these as used
        questions.forEach(q => usedQuestionIds.add(q._id.toString()));
      }
      
      // Update the test's section with these question IDs for future use
      if (questions.length > 0 && (!section.questions || section.questions.length === 0)) {
        const sectionIndex = test.sections.findIndex(s => s.name === section.name);
        if (sectionIndex !== -1) {
          // Use updateOne to avoid triggering full document validation on potentially corrupted data
          try {
            await MockTest.updateOne(
              { _id: test._id },
              { 
                $set: { 
                  [`sections.${sectionIndex}.questions`]: questions.map(q => q._id),
                  [`sections.${sectionIndex}.totalQuestions`]: questions.length
                }
              }
            );
            console.log(`✅ Updated section ${section.name} with ${questions.length} question IDs`);
          } catch (updateError) {
            console.warn(`⚠️ Could not update section ${section.name}:`, updateError.message);
          }
        }
      }
      
      console.log(`📝 Section ${section.name}: Found ${questions.length} questions`);
      
      questionsWithSections.push({
        name: section.name,
        duration: section.duration,
        questions: questions
      });
    }

    console.log('✅ Test attempt started successfully');
    res.status(201).json({
      success: true,
      message: 'Test attempt started successfully',
      attempt: attemptToUse,
      resuming: false, // Always false for new/reset attempts - frontend should treat as fresh start
      test: {
        _id: test._id,
        title: test.title,
        duration: test.duration,
        sections: questionsWithSections,
        instructions: (() => {
          if (!test.instructions) return [];

          // If it's already an array, return it
          if (Array.isArray(test.instructions)) return test.instructions;

          // If it's an object with general/sectionSpecific properties
          if (typeof test.instructions === 'object') {
            const flattened = [];
            if (test.instructions.general && Array.isArray(test.instructions.general)) {
              flattened.push(...test.instructions.general);
            }
            if (test.instructions.sectionSpecific && Array.isArray(test.instructions.sectionSpecific)) {
              flattened.push(...test.instructions.sectionSpecific);
            }
            // If no general/sectionSpecific, try to convert the object to string
            if (flattened.length === 0) {
              flattened.push(JSON.stringify(test.instructions));
            }
            return flattened;
          }

          // If it's a string, wrap in array
          return [test.instructions];
        })()
      }
    });
  } catch (error) {
    console.error('❌ Error starting test attempt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start test attempt',
      error: error.message
    });
  }
};

// Save student response
const saveResponse = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { questionId, selectedAnswer, isMarkedForReview } = req.body;
    const userId = req.user.id;

    console.log(`💾 Saving response for attempt: ${attemptId}, question: ${questionId}`);

    const attempt = await MockTestAttempt.findOne({
      _id: attemptId,
      userId: userId
    }).populate('testPaperId');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Test attempt not found'
      });
    }

    if (attempt.isCompleted || attempt.isSubmitted) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify completed test'
      });
    }
    
    // SERVER-SIDE TIME ENFORCEMENT: Check if the question's section has expired
    const test = attempt.testPaperId;
    if (test && test.sections) {
      const currentTime = new Date();
      
      // Find which section this question belongs to
      // First try looking in section.questions array (ObjectIds)
      let questionSection = test.sections.find(section => 
        section.questions?.some(q => q.toString() === questionId)
      );
      
      // If not found in section.questions, query MockTestQuestion directly
      if (!questionSection) {
        const questionDoc = await MockTestQuestion.findById(questionId).select('section');
        if (questionDoc && questionDoc.section) {
          questionSection = test.sections.find(section => section.name === questionDoc.section);
        }
      }
      
      // SECURITY: If we can't determine the section, REJECT the response (fail-closed)
      if (!questionSection) {
        console.log(`⚠️ Rejected response: cannot determine section for question ${questionId}`);
        return res.status(403).json({
          success: false,
          message: 'Cannot save response: question section not found',
          error: 'SECTION_NOT_FOUND'
        });
      }
      
      // Section found - check if it's locked
      // Find the section state for this section
      const sectionState = attempt.sectionStates?.find(s => s.sectionKey === questionSection.name);
      
      // Check if section is already locked
      if (sectionState?.isLocked || sectionState?.isCompleted) {
        console.log(`⚠️ Rejected response: section ${questionSection.name} is locked`);
        return res.status(403).json({
          success: false,
          message: 'Cannot save response: section time has expired',
          sectionLocked: true
        });
      }
      
      // If section was started, calculate if it has expired
      if (sectionState?.startedAt) {
        const sectionStartTime = new Date(sectionState.startedAt);
        const sectionTotalSeconds = (questionSection.duration || 60) * 60;
        const elapsedSeconds = Math.floor((currentTime - sectionStartTime) / 1000);
        const serverRemaining = Math.max(0, sectionTotalSeconds - elapsedSeconds);
        
        // If time has expired, lock the section and reject the response
        if (serverRemaining === 0) {
          console.log(`⚠️ Rejected response: section ${questionSection.name} has expired (server-side calculation)`);
          
          // Update sectionState to locked
          const stateIndex = attempt.sectionStates?.findIndex(s => s.sectionKey === questionSection.name);
          if (stateIndex >= 0) {
            attempt.sectionStates[stateIndex].isLocked = true;
            attempt.sectionStates[stateIndex].isCompleted = true;
            attempt.sectionStates[stateIndex].remainingSeconds = 0;
            attempt.sectionStates[stateIndex].completedAt = currentTime.toISOString();
            await attempt.save();
          }
          
          return res.status(403).json({
            success: false,
            message: 'Cannot save response: section time has expired',
            sectionLocked: true
          });
        }
      }
    }

    // Find existing response or create new one
    let responseIndex = attempt.responses.findIndex(
      resp => resp.questionId.toString() === questionId
    );

    if (responseIndex >= 0) {
      // Update existing response
      attempt.responses[responseIndex].selectedAnswer = selectedAnswer;
      attempt.responses[responseIndex].isAnswered = !!selectedAnswer;
      attempt.responses[responseIndex].isMarkedForReview = isMarkedForReview || false;
      attempt.responses[responseIndex].answeredAt = new Date();
    } else {
      // Add new response
      attempt.responses.push({
        questionId,
        selectedAnswer,
        isAnswered: !!selectedAnswer,
        isMarkedForReview: isMarkedForReview || false,
        isVisited: true,
        answeredAt: new Date()
      });
    }

    await attempt.save();

    console.log('✅ Response saved successfully');
    res.status(200).json({
      success: true,
      message: 'Response saved successfully'
    });
  } catch (error) {
    console.error('❌ Error saving response:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save response',
      error: error.message
    });
  }
};

// Sync session progress (heartbeat endpoint for session persistence)
const syncProgress = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { 
      currentSectionIndex, 
      currentQuestionIndex, 
      currentSectionKey,
      sectionStates,
      responses 
    } = req.body;
    const userId = req.user.id;

    console.log(`🔄 Syncing progress for attempt: ${attemptId}`);

    const attempt = await MockTestAttempt.findOne({
      _id: attemptId,
      userId: userId
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Test attempt not found'
      });
    }

    if (attempt.status === 'COMPLETED' || attempt.status === 'EXPIRED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot sync progress for completed/expired test'
      });
    }

    // Server-side validation for section states - STRICT enforcement, don't trust client data
    const currentTime = new Date();
    let test = await MockTest.findById(attempt.testPaperId);
    
    // Check if this is a course test
    if (!test || attempt.isCourseTest) {
      console.log(`📚 Sync: Course test detected, using simplified sync`);
      
      // For course tests, just update basic progress without section validation
      if (currentQuestionIndex !== undefined) attempt.currentQuestionIndex = currentQuestionIndex;
      if (responses && Array.isArray(responses)) {
        for (const resp of responses) {
          if (!resp.questionId) continue;
          const existingIdx = attempt.responses.findIndex(
            r => r.questionId.toString() === resp.questionId
          );
          if (existingIdx >= 0) {
            attempt.responses[existingIdx] = {
              ...attempt.responses[existingIdx],
              selectedAnswer: resp.selectedAnswer,
              isAnswered: !!resp.selectedAnswer,
              isMarkedForReview: resp.isMarkedForReview || false,
              isVisited: true,
              answeredAt: new Date()
            };
          } else {
            attempt.responses.push({
              questionId: resp.questionId,
              selectedAnswer: resp.selectedAnswer,
              isAnswered: !!resp.selectedAnswer,
              isMarkedForReview: resp.isMarkedForReview || false,
              isVisited: true,
              answeredAt: new Date()
            });
          }
        }
      }
      
      attempt.lastSyncedAt = new Date();
      await attempt.save();
      
      return res.status(200).json({
        success: true,
        message: 'Course test progress synced',
        sectionStates: attempt.sectionStates,
        currentSectionKey: attempt.currentSectionKey,
        currentSectionIndex: attempt.currentSectionIndex
      });
    }
    
    // STRICT SECTION NAVIGATION ENFORCEMENT
    // Client cannot jump to sections that haven't been properly started via transitionSection
    const serverCurrentSectionKey = attempt.currentSectionKey;
    const serverCurrentSectionIdx = attempt.currentSectionIndex || 0;
    
    // Validate client's claimed section is allowed
    if (currentSectionKey && currentSectionKey !== serverCurrentSectionKey) {
      // Client trying to switch sections - check if this is valid
      const targetSectionState = attempt.sectionStates?.find(s => s.sectionKey === currentSectionKey);
      const targetSectionIdx = test.sections.findIndex(s => s.name === currentSectionKey);
      
      // Can only navigate to:
      // 1. Section that was previously started (has startedAt)
      // 2. Section index <= current index (back navigation only, forward requires transitionSection)
      // 3. Section that isn't locked (unless viewing completed sections is allowed)
      const isValidBackNav = targetSectionState?.startedAt && targetSectionIdx <= serverCurrentSectionIdx;
      const isLockedSection = targetSectionState?.isLocked || targetSectionState?.isCompleted;
      
      if (!isValidBackNav) {
        console.log(`⚠️ Rejected section jump from ${serverCurrentSectionKey} to ${currentSectionKey}`);
        return res.status(400).json({
          success: false,
          message: 'Invalid section navigation. Use section transition API to advance.',
          currentSectionKey: serverCurrentSectionKey
        });
      }
      
      // If navigating to a locked section, they can view but not modify responses
      if (isLockedSection) {
        console.log(`ℹ️ Client viewing locked section ${currentSectionKey} (read-only)`);
      }
    }
    
    // Update session state (only within allowed sections)
    if (currentQuestionIndex !== undefined) attempt.currentQuestionIndex = currentQuestionIndex;
    // Only update section if validated above
    if (currentSectionIndex !== undefined && currentSectionKey === serverCurrentSectionKey) {
      attempt.currentSectionIndex = currentSectionIndex;
    }
    if (currentSectionKey && currentSectionKey === serverCurrentSectionKey) {
      attempt.currentSectionKey = currentSectionKey;
    }
    
    // Build validated section states based on SERVER-SIDE section definitions only
    // Ignore unknown sections from client, enforce timing strictly
    const validatedStates = test.sections.map((sectionDef, idx) => {
      // Get existing server state by section name (not by index)
      const existingState = attempt.sectionStates?.find(s => s.sectionKey === sectionDef.name);
      // Get client state if provided (matched by section name, not index)
      const clientState = sectionStates?.find(s => s.sectionKey === sectionDef.name);
      
      // If section is already locked/completed server-side, ALWAYS keep it locked
      if (existingState?.isLocked || existingState?.isCompleted) {
        return {
          sectionKey: sectionDef.name,
          startedAt: existingState.startedAt,
          remainingSeconds: 0,
          isLocked: true,
          isCompleted: true,
          completedAt: existingState.completedAt
        };
      }
      
      // Use server's startedAt, ignore client's startedAt to prevent manipulation
      const startedAt = existingState?.startedAt;
      
      if (startedAt) {
        // Calculate remaining time strictly from server data
        const sectionStartTime = new Date(startedAt);
        const sectionTotalSeconds = sectionDef.duration * 60;
        const elapsedSeconds = Math.floor((currentTime - sectionStartTime) / 1000);
        const serverCalculatedRemaining = Math.max(0, sectionTotalSeconds - elapsedSeconds);
        
        // If time has expired server-side, lock the section regardless of client state
        if (serverCalculatedRemaining === 0) {
          return {
            sectionKey: sectionDef.name,
            startedAt: startedAt,
            remainingSeconds: 0,
            isCompleted: true,
            isLocked: true,
            completedAt: currentTime.toISOString()
          };
        }
        
        // Return server-calculated remaining (ignore client's remaining time completely)
        return {
          sectionKey: sectionDef.name,
          startedAt: startedAt,
          remainingSeconds: serverCalculatedRemaining,
          isLocked: false,
          isCompleted: false,
          completedAt: null
        };
      }
      
      // Section not started yet - preserve existing state or create new
      if (existingState) {
        return existingState;
      }
      
      return {
        sectionKey: sectionDef.name,
        startedAt: null,
        remainingSeconds: sectionDef.duration * 60,
        isLocked: false,
        isCompleted: false,
        completedAt: null
      };
    });
    
    attempt.sectionStates = validatedStates;
    
    // CRITICAL: Identify which sections are now expired/locked based on server calculation
    // Build a set of expired section keys for response filtering
    const expiredSectionKeys = new Set(
      validatedStates.filter(s => s.isLocked || s.isCompleted).map(s => s.sectionKey)
    );
    
    // Update responses if provided - only update selectedAnswer, preserve other fields
    // REJECT responses for questions in expired/locked sections
    if (responses && Array.isArray(responses)) {
      for (const resp of responses) {
        if (!resp.questionId) continue;
        
        // Find which section this question belongs to
        // Method 1: Try to find in section.questions (ObjectIds)
        let questionSectionName = null;
        for (const section of test.sections) {
          if (section.questions?.some(q => q.toString() === resp.questionId)) {
            questionSectionName = section.name;
            break;
          }
        }
        
        // Method 2: If not found, query MockTestQuestion directly
        if (!questionSectionName) {
          const questionDoc = await MockTestQuestion.findById(resp.questionId).select('section');
          if (questionDoc && questionDoc.section) {
            questionSectionName = questionDoc.section;
          }
        }
        
        // SECURITY: If we can't determine the section, REJECT the response (fail-closed)
        if (!questionSectionName) {
          console.log(`⚠️ Rejected response: cannot determine section for question ${resp.questionId}`);
          continue; // Skip this response - fail-closed security
        }
        
        // Reject response if section is expired/locked
        if (expiredSectionKeys.has(questionSectionName)) {
          console.log(`⚠️ Rejected response for expired section ${questionSectionName}, question ${resp.questionId}`);
          continue; // Skip this response
        }
        
        const existingIndex = attempt.responses.findIndex(
          r => r.questionId && r.questionId.toString() === resp.questionId
        );
        
        if (existingIndex >= 0) {
          // Only update specific fields, preserve existing response data
          if (resp.selectedAnswer !== undefined) {
            attempt.responses[existingIndex].selectedAnswer = resp.selectedAnswer;
            attempt.responses[existingIndex].isAnswered = !!resp.selectedAnswer;
          }
          if (resp.isMarkedForReview !== undefined) {
            attempt.responses[existingIndex].isMarkedForReview = resp.isMarkedForReview;
          }
          attempt.responses[existingIndex].answeredAt = new Date();
        } else if (resp.selectedAnswer) {
          // Only add new response if there's actually an answer
          attempt.responses.push({
            questionId: resp.questionId,
            selectedAnswer: resp.selectedAnswer,
            isAnswered: true,
            isMarkedForReview: resp.isMarkedForReview || false,
            isVisited: true,
            answeredAt: new Date()
          });
        }
      }
    }
    
    attempt.lastSyncedAt = new Date();
    attempt.status = 'IN_PROGRESS';

    await attempt.save();

    console.log('✅ Progress synced successfully');
    res.status(200).json({
      success: true,
      message: 'Progress synced successfully',
      lastSyncedAt: attempt.lastSyncedAt,
      // Return server-validated section states so frontend can sync
      sectionStates: attempt.sectionStates
    });
  } catch (error) {
    console.error('❌ Error syncing progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync progress',
      error: error.message
    });
  }
};

// Transition to next section (with strict time enforcement)
const transitionSection = async (req, res) => {
  try {
    const { attemptId } = req.params;
    // Support both payload formats (fromSection/toSection and currentSectionKey/nextSectionKey)
    const fromSection = req.body.fromSection || req.body.currentSectionKey;
    const toSection = req.body.toSection || req.body.nextSectionKey;
    const sectionTimeSpent = req.body.sectionTimeSpent;
    const userId = req.user.id;

    console.log(`🔀 Section transition for attempt: ${attemptId} from ${fromSection} to ${toSection}`);

    const attempt = await MockTestAttempt.findOne({
      _id: attemptId,
      userId: userId
    }).populate('testPaperId');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Test attempt not found'
      });
    }

    if (attempt.status === 'COMPLETED' || attempt.status === 'EXPIRED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot transition section for completed/expired test'
      });
    }

    // Find and update current section state
    let currentSectionState = attempt.sectionStates.find(s => s.sectionKey === fromSection);
    if (currentSectionState) {
      currentSectionState.isCompleted = true;
      currentSectionState.completedAt = new Date();
      currentSectionState.isLocked = true;
      currentSectionState.remainingSeconds = 0;
    } else {
      // Create section state if it doesn't exist
      attempt.sectionStates.push({
        sectionKey: fromSection,
        isCompleted: true,
        completedAt: new Date(),
        isLocked: true,
        remainingSeconds: 0
      });
    }

    // Find next section index
    const test = attempt.testPaperId;
    const nextSectionIndex = test.sections.findIndex(s => s.name === toSection);
    
    if (nextSectionIndex === -1 && toSection) {
      return res.status(400).json({
        success: false,
        message: 'Next section not found'
      });
    }

    // Initialize next section state if exists
    if (toSection) {
      const nextSection = test.sections[nextSectionIndex];
      let nextSectionState = attempt.sectionStates.find(s => s.sectionKey === toSection);
      
      if (!nextSectionState) {
        attempt.sectionStates.push({
          sectionKey: toSection,
          startedAt: new Date(),
          remainingSeconds: nextSection.duration * 60, // Convert minutes to seconds
          isLocked: false,
          isCompleted: false
        });
      } else if (!nextSectionState.startedAt) {
        nextSectionState.startedAt = new Date();
        nextSectionState.remainingSeconds = nextSection.duration * 60;
      }

      attempt.currentSectionKey = toSection;
      attempt.currentSectionIndex = nextSectionIndex;
      attempt.currentQuestionIndex = 0;
    }

    attempt.lastSyncedAt = new Date();
    await attempt.save();

    console.log('✅ Section transition completed successfully');
    res.status(200).json({
      success: true,
      message: 'Section transition completed',
      currentSectionKey: attempt.currentSectionKey,
      currentSectionIndex: attempt.currentSectionIndex,
      sectionStates: attempt.sectionStates
    });
  } catch (error) {
    console.error('❌ Error transitioning section:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to transition section',
      error: error.message
    });
  }
};

// Submit test
const submitTest = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id;

    console.log(`📤 Submitting test attempt: ${attemptId}`);

    const attempt = await MockTestAttempt.findOne({
      _id: attemptId,
      userId: userId
    }).populate('testPaperId');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Test attempt not found'
      });
    }

    if (attempt.isSubmitted) {
      return res.status(400).json({
        success: false,
        message: 'Test already submitted'
      });
    }

    // Get test sections
    let test = attempt.testPaperId;
    
    // Check if this is a course test
    if (!test || attempt.isCourseTest) {
      console.log(`📚 Submit: Course test detected, using simplified scoring`);
      const CourseTest = require("../models/course/Test");
      const Question = require("../models/course/Question");
      
      const courseTest = await CourseTest.findById(attempt.testPaperId);
      if (!courseTest) {
        return res.status(404).json({
          success: false,
          message: 'Course test not found'
        });
      }
      
      // Get all questions for scoring
      const questions = await Question.find({ testId: attempt.testPaperId });
      const questionMap = {};
      questions.forEach(q => {
        questionMap[q._id.toString()] = q;
      });
      
      let totalScore = 0;
      let positiveMarks = 0;
      let negativeMarks = 0;
      let totalCorrect = 0;
      let totalIncorrect = 0;
      let totalAnswered = 0;
      
      for (const response of attempt.responses) {
        if (!response.isAnswered) continue;
        totalAnswered++;
        
        const question = questionMap[response.questionId.toString()];
        if (!question) continue;
        
        const isCorrect = response.selectedAnswer === question.correctOption;
        const marks = question.marks || 3;
        const negMarks = question.negativeMarks || 1;
        
        if (isCorrect) {
          totalScore += marks;
          positiveMarks += marks;
          totalCorrect++;
        } else {
          totalScore -= negMarks;
          negativeMarks += negMarks;
          totalIncorrect++;
        }
      }
      
      // Update attempt
      attempt.isCompleted = true;
      attempt.isSubmitted = true;
      attempt.status = 'COMPLETED';
      attempt.endTime = new Date();
      attempt.submittedAt = new Date();
      attempt.timeSpent = Math.floor((attempt.endTime - attempt.startedAt) / (1000 * 60));
      attempt.score = { total: totalScore };
      attempt.marks = { total: totalScore, positive: positiveMarks, negative: negativeMarks };
      
      await attempt.save();
      
      console.log('✅ Course test submitted successfully');
      return res.status(200).json({
        success: true,
        message: 'Test submitted successfully',
        score: totalScore,
        timeSpent: attempt.timeSpent,
        results: {
          totalQuestions: questions.length,
          totalAnswered,
          totalCorrect,
          totalIncorrect,
          totalNotAnswered: questions.length - totalAnswered,
          totalScore,
          positiveMarks,
          negativeMarks,
          percentage: questions.length > 0 ? ((totalCorrect / questions.length) * 100).toFixed(2) : 0,
          sections: [{
            sectionName: courseTest.topic?.name || 'General',
            totalQuestions: questions.length,
            answered: totalAnswered,
            correct: totalCorrect,
            incorrect: totalIncorrect,
            notAnswered: questions.length - totalAnswered,
            score: totalScore,
            positiveMarks,
            negativeMarks
          }]
        },
        attemptId: attempt._id
      });
    }
    
    // Calculate section-wise results (MockTest flow)
    const sectionResults = {};
    let totalScore = 0;
    let positiveMarks = 0;
    let negativeMarks = 0;
    let totalCorrect = 0;
    let totalIncorrect = 0;
    let totalAnswered = 0;
    let totalQuestions = 0;

    // Initialize section results
    for (const section of test.sections) {
      sectionResults[section.name] = {
        sectionName: section.name,
        totalQuestions: 0,
        answered: 0,
        correct: 0,
        incorrect: 0,
        notAnswered: 0,
        score: 0,
        positiveMarks: 0,
        negativeMarks: 0
      };
    }

    // Get all questions for this test
    const allQuestions = await MockTestQuestion.find({
      testPaperId: test._id,
      isActive: true
    });

    // Map question IDs to sections
    const questionSectionMap = {};
    for (const question of allQuestions) {
      questionSectionMap[question._id.toString()] = question.section;
      if (sectionResults[question.section]) {
        sectionResults[question.section].totalQuestions++;
        totalQuestions++;
      }
    }

    // Calculate scores per response
    for (const response of attempt.responses) {
      const questionId = response.questionId.toString();
      const sectionName = questionSectionMap[questionId];
      
      if (!sectionName || !sectionResults[sectionName]) continue;

      if (response.isAnswered) {
        totalAnswered++;
        sectionResults[sectionName].answered++;
        
        const question = allQuestions.find(q => q._id.toString() === questionId);
        
        if (question) {
          // Check if answer is correct based on question type
          let isCorrect = false;
          const qType = question.questionType;
          
          if (qType === 'SINGLE_CORRECT_MCQ' || qType === 'MCQ') {
            // For single correct MCQ, compare selected option with correctOptionIds
            const correctIds = question.correctOptionIds || [question.correctAnswer];
            isCorrect = correctIds.includes(response.selectedAnswer);
          } else if (qType === 'MULTI_CORRECT_MCQ' || qType === 'MSQ') {
            // For multiple correct MCQ
            const userAnswers = Array.isArray(response.selectedAnswer) ? response.selectedAnswer : [response.selectedAnswer];
            const correctIds = question.correctOptionIds || [];
            isCorrect = JSON.stringify(userAnswers.sort()) === JSON.stringify(correctIds.sort());
          } else if (qType === 'TITA') {
            // For TITA, compare text answers (case-insensitive)
            const userAnswer = String(response.selectedAnswer || '').toLowerCase().trim();
            const correctAnswer = String(question.textAnswer || '').toLowerCase().trim();
            isCorrect = userAnswer === correctAnswer;
          } else if (qType === 'NUMERIC' || qType === 'NAT') {
            // For numeric answers, compare numbers with tolerance
            const userAnswer = parseFloat(response.selectedAnswer);
            const correctAnswer = parseFloat(question.numericAnswer);
            if (!isNaN(userAnswer) && !isNaN(correctAnswer)) {
              // Allow small tolerance for floating point comparison
              isCorrect = Math.abs(userAnswer - correctAnswer) < 0.01;
            }
          }

          if (isCorrect) {
            totalScore += question.marks?.positive || 3;
            positiveMarks += question.marks?.positive || 3;
            totalCorrect++;
            sectionResults[sectionName].correct++;
            sectionResults[sectionName].score += question.marks?.positive || 3;
            sectionResults[sectionName].positiveMarks += question.marks?.positive || 3;
          } else {
            totalScore += question.marks?.negative || -1;
            negativeMarks += Math.abs(question.marks?.negative || 1);
            totalIncorrect++;
            sectionResults[sectionName].incorrect++;
            sectionResults[sectionName].score += question.marks?.negative || -1;
            sectionResults[sectionName].negativeMarks += Math.abs(question.marks?.negative || 1);
          }
        }
      }
    }

    // Calculate not answered for each section
    for (const sectionName of Object.keys(sectionResults)) {
      sectionResults[sectionName].notAnswered = 
        sectionResults[sectionName].totalQuestions - sectionResults[sectionName].answered;
    }

    // Update attempt
    attempt.status = 'COMPLETED';
    attempt.completedAt = new Date();
    attempt.totalTimeTakenSeconds = Math.floor((new Date() - attempt.startedAt) / 1000);
    attempt.totalScore = totalScore;

    await attempt.save();

    console.log('✅ Test submitted successfully');
    res.status(200).json({
      success: true,
      message: 'Test submitted successfully',
      score: totalScore,
      timeSpent: attempt.timeSpent,
      results: {
        totalQuestions,
        totalAnswered,
        totalCorrect,
        totalIncorrect,
        totalNotAnswered: totalQuestions - totalAnswered,
        totalScore,
        positiveMarks,
        negativeMarks,
        percentage: totalQuestions > 0 ? ((totalCorrect / totalQuestions) * 100).toFixed(2) : 0,
        sections: Object.values(sectionResults)
      },
      attemptId: attempt._id
    });
  } catch (error) {
    console.error('❌ Error submitting test:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit test',
      error: error.message
    });
  }
};

// Get student's test history
const getTestHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    console.log(`📜 Fetching test history for user: ${userId}`);

    const attempts = await MockTestAttempt.find({ userId: userId })
      .populate('testPaperId', 'title testNumber')
      .populate('seriesId', 'title category')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await MockTestAttempt.countDocuments({ userId: userId });

    console.log(`✅ Found ${attempts.length} test attempts`);
    res.status(200).json({
      success: true,
      attempts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching test history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test history',
      error: error.message
    });
  }
};

// Get attempt data for resuming
const getAttemptData = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id;

    console.log(`📖 Getting attempt data: ${attemptId} for user: ${userId}`);

    // First fetch attempt without populate to preserve testPaperId
    const attemptRaw = await MockTestAttempt.findOne({
      _id: attemptId,
      userId: userId
    });

    if (!attemptRaw) {
      return res.status(404).json({
        success: false,
        message: 'Test attempt not found'
      });
    }

    // Store the raw testPaperId before any populate
    const testPaperIdRaw = attemptRaw.testPaperId;
    
    // Get test data with questions
    const questionsWithSections = [];

    // Check if this is a course test (isCourseTest flag or check MockTest doesn't have it)
    const mockTest = await MockTest.findById(testPaperIdRaw);
    
    if (!mockTest || attemptRaw.isCourseTest) {
      console.log(`📚 Attempt is for course test, fetching from Test model...`);
      const CourseTest = require("../models/course/Test");
      const Question = require("../models/course/Question");
      
      const courseTest = await CourseTest.findById(testPaperIdRaw)
        .populate("topic", "name");
      
      if (!courseTest) {
        return res.status(404).json({
          success: false,
          message: 'Course test not found'
        });
      }
      
      // Get questions for this test
      const questions = await Question.find({ testId: testPaperIdRaw }).sort({ createdAt: 1 });
      console.log(`📝 Found ${questions.length} questions for course test`);
      
      // Format questions for frontend
      const formattedQuestions = questions.map((q, idx) => ({
        _id: q._id,
        questionText: q.questionText,
        questionType: q.questionType || 'MCQ',
        section: courseTest.topic?.name || 'General',
        options: {
          A: q.options?.A || q.optionA || '',
          B: q.options?.B || q.optionB || '',
          C: q.options?.C || q.optionC || '',
          D: q.options?.D || q.optionD || ''
        },
        marks: q.marks || 3,
        sequenceNumber: idx + 1,
        images: []
      }));
      
      const sectionName = courseTest.topic?.name || 'General';
      questionsWithSections.push({
        name: sectionName,
        duration: courseTest.duration || 30,
        questions: formattedQuestions
      });
      
      // Calculate remaining time
      const startTime = new Date(attemptRaw.startedAt);
      const currentTime = new Date();
      const elapsedMinutes = Math.floor((currentTime - startTime) / (1000 * 60));
      const totalDurationMinutes = attemptRaw.totalDuration || courseTest.duration || 30;
      const remainingMinutes = Math.max(0, totalDurationMinutes - elapsedMinutes);
      
      // Convert responses to frontend format
      const responseMap = {};
      attemptRaw.responses.forEach(resp => {
        if (resp.selectedAnswer) {
          responseMap[resp.questionId.toString()] = resp.selectedAnswer;
        }
      });
      
      console.log('✅ Course test attempt data retrieved successfully');
      return res.status(200).json({
        success: true,
        test: {
          _id: courseTest._id,
          title: courseTest.title,
          duration: courseTest.duration,
          sections: questionsWithSections,
          instructions: [],
          isCourseTest: true
        },
        attempt: attemptRaw.toObject(),
        timeRemaining: remainingMinutes * 60,
        responses: responseMap
      });
    }

    // MockTest flow (with sections) - now populate to get test data
    const attempt = await MockTestAttempt.findOne({
      _id: attemptId,
      userId: userId
    }).populate('testPaperId');
    
    const test = attempt.testPaperId;
    
    // First, get ALL questions for this test as a fallback pool
    const allTestQuestions = await MockTestQuestion.find({
      testPaperId: test._id,
      isActive: true
    }).select('_id questionText passage questionType section images options marks sequenceNumber correctOptionIds').sort({ sequenceNumber: 1 });
    
    console.log(`📚 Resume - Total questions for test: ${allTestQuestions.length}`);
    
    let usedQuestionIds = new Set();
    
    for (const section of test.sections) {
      let questions = [];
      
      // First try to get questions from section.questions array
      if (section.questions && section.questions.length > 0) {
        questions = await MockTestQuestion.find({
          _id: { $in: section.questions }
        }).select('_id questionText passage questionType section images options marks sequenceNumber correctOptionIds').sort({ sequenceNumber: 1 });
      }
      
      // Fallback 1: If no questions found in section.questions, query by testPaperId and section name
      if (questions.length === 0) {
        console.log(`🔄 Resume fallback 1: Querying questions for section ${section.name} by testPaperId`);
        questions = await MockTestQuestion.find({
          testPaperId: test._id,
          section: section.name,
          isActive: true
        }).select('_id questionText passage questionType section images options marks sequenceNumber correctOptionIds').sort({ sequenceNumber: 1 });
      }
      
      // Fallback 2: If still no questions, use all test questions
      if (questions.length === 0 && allTestQuestions.length > 0) {
        console.log(`🔄 Resume fallback 2: Using all test questions for section ${section.name}`);
        questions = allTestQuestions.filter(q => !usedQuestionIds.has(q._id.toString()));
        questions.forEach(q => usedQuestionIds.add(q._id.toString()));
      }
      
      // Update the test's section with these question IDs for future use
      if (questions.length > 0 && (!section.questions || section.questions.length === 0)) {
        const sectionIndex = test.sections.findIndex(s => s.name === section.name);
        if (sectionIndex !== -1) {
          // Use updateOne to avoid triggering full document validation on potentially corrupted data
          try {
            await MockTest.updateOne(
              { _id: test._id },
              { 
                $set: { 
                  [`sections.${sectionIndex}.questions`]: questions.map(q => q._id),
                  [`sections.${sectionIndex}.totalQuestions`]: questions.length
                }
              }
            );
            console.log(`✅ Updated section ${section.name} with ${questions.length} question IDs`);
          } catch (updateError) {
            console.warn(`⚠️ Could not update section ${section.name}:`, updateError.message);
            // Continue without failing - questions are still available in memory
          }
        }
      }
      
      console.log(`📝 Resume - Section ${section.name}: Found ${questions.length} questions`);

      questionsWithSections.push({
        name: section.name,
        duration: section.duration,
        questions: questions
      });
    }

    // Calculate remaining time
    const startTime = new Date(attempt.startedAt);
    const currentTime = new Date();
    const elapsedMinutes = Math.floor((currentTime - startTime) / (1000 * 60));
    const totalDurationMinutes = attempt.totalDuration;
    const remainingMinutes = Math.max(0, totalDurationMinutes - elapsedMinutes);

    // Server-side validation for expired sections on resume
    // Validate sectionStates based on startedAt + duration to enforce strict time limits
    let validatedSectionStates = attempt.sectionStates || [];
    let needsSave = false;
    
    if (validatedSectionStates.length > 0) {
      validatedSectionStates = validatedSectionStates.map((state) => {
        // Find section by sectionKey instead of index to be more robust
        const sectionDef = test.sections.find(s => s.name === state.sectionKey);
        
        // If section is already marked as completed/locked, keep it that way
        if (state.isCompleted || state.isLocked) {
          return {
            ...state,
            remainingSeconds: 0,
            isLocked: true,
            isCompleted: true
          };
        }
        
        // If section was started, check if it has expired
        if (state.startedAt && sectionDef) {
          const sectionStartTime = new Date(state.startedAt);
          const sectionDuration = sectionDef.duration || 60; // minutes
          const sectionElapsedSeconds = Math.floor((currentTime - sectionStartTime) / 1000);
          const sectionTotalSeconds = sectionDuration * 60;
          const calculatedRemaining = Math.max(0, sectionTotalSeconds - sectionElapsedSeconds);
          
          // If time has expired, lock the section regardless of stored state
          if (calculatedRemaining === 0) {
            needsSave = true;
            return {
              ...state,
              remainingSeconds: 0,
              isCompleted: true,
              isLocked: true,
              completedAt: state.completedAt || currentTime.toISOString()
            };
          }
          
          // Use the lesser of stored and calculated remaining (prevent time manipulation)
          const validatedRemaining = Math.min(state.remainingSeconds || sectionTotalSeconds, calculatedRemaining);
          if (validatedRemaining !== state.remainingSeconds) {
            needsSave = true;
          }
          return {
            ...state,
            remainingSeconds: validatedRemaining
          };
        }
        
        return state;
      });
      
      // Save updated section states if modified
      if (needsSave) {
        attempt.sectionStates = validatedSectionStates;
        await attempt.save();
        console.log('🔒 Updated section states with server-validated times');
      }
    }

    // Convert responses to frontend format
    const responseMap = {};
    attempt.responses.forEach(resp => {
      if (resp.selectedAnswer) {
        responseMap[resp.questionId.toString()] = resp.selectedAnswer;
      }
    });

    // Include validated section states in the response
    const attemptWithValidatedStates = {
      ...attempt.toObject(),
      sectionStates: validatedSectionStates
    };

    console.log('✅ Attempt data retrieved successfully');
    res.status(200).json({
      success: true,
      test: {
        _id: test._id,
        title: test.title,
        duration: test.duration,
        sections: questionsWithSections,
        instructions: (() => {
          if (!test.instructions) return [];

          // If it's already an array, return it
          if (Array.isArray(test.instructions)) return test.instructions;

          // If it's an object with general/sectionSpecific properties
          if (typeof test.instructions === 'object') {
            const flattened = [];
            if (test.instructions.general && Array.isArray(test.instructions.general)) {
              flattened.push(...test.instructions.general);
            }
            if (test.instructions.sectionSpecific && Array.isArray(test.instructions.sectionSpecific)) {
              flattened.push(...test.instructions.sectionSpecific);
            }
            // If no general/sectionSpecific, try to convert the object to string
            if (flattened.length === 0) {
              flattened.push(JSON.stringify(test.instructions));
            }
            return flattened;
          }

          // If it's a string, wrap in array
          return [test.instructions];
        })()
      },
      attempt: attemptWithValidatedStates,
      timeRemaining: remainingMinutes * 60, // Convert to seconds
      responses: responseMap
    });
  } catch (error) {
    console.error('❌ Error getting attempt data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get attempt data',
      error: error.message
    });
  }
};
// Student Mock Test dashboard ke liye – complete tree banane wala API
const getMockTestTree = async (req, res) => {
  try {
    console.log('🌲 Building mock test tree for student dashboard');
    const ExamCategory = require('../models/ExamCategory');
    const ExamYear = require('../models/ExamYear');
    const ExamSlot = require('../models/ExamSlot');

    const tests = await MockTest.find({
      isActive: true,
      isPublished: true
    })
    .populate('previousYearExamCategoryId')
    .populate('previousYearExamYearId')
    .populate('previousYearExamSlotId')
    .sort({ createdAt: -1 });

    const tree = {
      previousYear: {
        paperWise: {},
        topicWise: {}
      },
      fullTests: [],
      seriesTests: [],
      moduleTests: [],
      sessionalTests: {},
      freeTests: []
    };

    tests.forEach((test) => {
      const hasNoCourse = !test.courseId || test.courseId === null;
      const hasNoSeries = !test.seriesId || test.seriesId === null;
      const isFreeTest = test.isFree && hasNoCourse && hasNoSeries;
      
      const common = {
        id: test._id,
        title: test.title,
        description: test.description,
        durationMinutes: test.duration,
        totalQuestions: test.totalQuestions,
        totalMarks: test.totalMarks,
        isFree: isFreeTest
      };

      const type = test.testType || 'full';

      switch (type) {
        case 'previousYear': {
          if (test.paperType === 'paperWise') {
            const categoryName = test.previousYearExamCategoryId?.name || test.exam || 'OTHER';
            const yearLabel = test.previousYearExamYearId?.label || test.yearLabel || 'Unknown Year';
            const slotLabel = test.previousYearExamSlotId?.label || '';
            
            // Initialize category if doesn't exist
            if (!tree.previousYear.paperWise[categoryName]) {
              tree.previousYear.paperWise[categoryName] = { 
                exams: [],  // Backward compatibility
                years: {}   // New hierarchical structure
              };
            }
            
            // Legacy format for backward compatibility
            const legacyTestData = {
              id: test._id,
              yearLabel,
              declaration: test.description || '',
              durationMinutes: test.duration,
              totalMarks: test.totalMarks
            };
            
            // Enhanced format with filtering metadata
            const enrichedTestData = {
              ...legacyTestData,
              title: test.title,
              slotLabel,
              description: test.description || '',
              categoryId: test.previousYearExamCategoryId?._id,
              yearId: test.previousYearExamYearId?._id,
              slotId: test.previousYearExamSlotId?._id
            };
            
            // Add to legacy exams array using legacy format
            tree.previousYear.paperWise[categoryName].exams.push(legacyTestData);
            
            // Add to new hierarchical structure using enriched format
            if (test.previousYearExamCategoryId) {
              if (!tree.previousYear.paperWise[categoryName].years[yearLabel]) {
                tree.previousYear.paperWise[categoryName].years[yearLabel] = { slots: {} };
              }
              if (slotLabel) {
                if (!tree.previousYear.paperWise[categoryName].years[yearLabel].slots[slotLabel]) {
                  tree.previousYear.paperWise[categoryName].years[yearLabel].slots[slotLabel] = { tests: [] };
                }
                tree.previousYear.paperWise[categoryName].years[yearLabel].slots[slotLabel].tests.push(enrichedTestData);
              }
            }
          } else if (test.paperType === 'topicWise') {
            const subject = test.subject || 'General';
            if (!tree.previousYear.topicWise[subject]) {
              tree.previousYear.topicWise[subject] = { topics: [] };
            }
            tree.previousYear.topicWise[subject].topics.push({
              id: test._id,
              topic: test.topic || '',
              title: test.title,
              description: test.description || '',
              durationMinutes: test.duration
            });
          }
          break;
        }

        case 'full': {
          tree.fullTests.push({
            ...common,
            name: test.title
          });
          break;
        }

        case 'series': {
          tree.seriesTests.push({
            ...common,
            name: test.title
          });
          break;
        }

        case 'module': {
          tree.moduleTests.push({
            ...common,
            name: test.title
          });
          break;
        }

        case 'sessional': {
          const year = test.sessionYear || 'Other';
          if (!tree.sessionalTests[year]) {
            tree.sessionalTests[year] = [];
          }
          tree.sessionalTests[year].push({
            ...common,
            name: test.title
          });
          break;
        }

        default: {
          tree.fullTests.push({
            ...common,
            name: test.title
          });
        }
      }
    });

    console.log('✅ Mock test tree built successfully');
    return res.status(200).json({
      success: true,
      data: tree
    });
  } catch (error) {
    console.error('❌ Error building mock test tree:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load mock test tree',
      error: error.message
    });
  }
};
// Get attempt review data (for reviewing completed test with correct answers)
const getAttemptReview = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id;

    console.log(`📖 Getting attempt review: ${attemptId} for user: ${userId}`);

    const attempt = await MockTestAttempt.findOne({
      _id: attemptId,
      userId: userId
    }).populate('testPaperId');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Test attempt not found'
      });
    }

    if (!attempt.isSubmitted) {
      return res.status(400).json({
        success: false,
        message: 'Test has not been submitted yet. Complete the test to view review.'
      });
    }

    const test = attempt.testPaperId;
    
    // Get all questions with correct answers and explanations
    const allQuestions = await MockTestQuestion.find({
      testPaperId: test._id,
      isActive: true
    }).select('_id questionText passage questionType section images options marks sequenceNumber correctAnswer correctOptionIds explanation solution').sort({ sequenceNumber: 1 });

    // Build response data with user answers and correct answers
    const responseMap = {};
    for (const response of attempt.responses) {
      responseMap[response.questionId.toString()] = {
        selectedAnswer: response.selectedAnswer,
        isAnswered: response.isAnswered
      };
    }

    // Organize by sections
    const sections = test.sections.map(section => {
      const sectionQuestions = allQuestions.filter(q => q.section === section.name);
      
      return {
        name: section.name,
        questions: sectionQuestions.map(q => {
          const userResponse = responseMap[q._id.toString()];
          let isCorrect = false;
          
          if (userResponse?.isAnswered) {
            if (q.questionType === 'MCQ') {
              isCorrect = userResponse.selectedAnswer === q.correctAnswer;
            } else if (q.questionType === 'MSQ') {
              isCorrect = JSON.stringify(userResponse.selectedAnswer?.sort?.() || []) === 
                         JSON.stringify(q.correctAnswer?.sort?.() || []);
            } else if (q.questionType === 'NAT') {
              isCorrect = parseFloat(userResponse.selectedAnswer) === parseFloat(q.correctAnswer);
            }
          }

          return {
            _id: q._id,
            questionText: q.questionText,
            passage: q.passage,
            questionType: q.questionType,
            options: q.options,
            images: q.images,
            marks: q.marks,
            correctAnswer: q.correctAnswer,
            correctOptionIds: q.correctOptionIds,
            explanation: q.explanation,
            solution: q.solution,
            userAnswer: userResponse?.selectedAnswer || null,
            isAnswered: userResponse?.isAnswered || false,
            isCorrect: isCorrect
          };
        })
      };
    });

    // Calculate summary statistics
    let totalCorrect = 0;
    let totalIncorrect = 0;
    let totalAnswered = 0;
    let totalQuestions = 0;

    sections.forEach(section => {
      section.questions.forEach(q => {
        totalQuestions++;
        if (q.isAnswered) {
          totalAnswered++;
          if (q.isCorrect) {
            totalCorrect++;
          } else {
            totalIncorrect++;
          }
        }
      });
    });

    console.log('✅ Attempt review data fetched successfully');
    res.status(200).json({
      success: true,
      test: {
        _id: test._id,
        title: test.title,
        testNumber: test.testNumber
      },
      attempt: {
        _id: attempt._id,
        score: attempt.score,
        marks: attempt.marks,
        timeSpent: attempt.timeSpent,
        startTime: attempt.startTime,
        endTime: attempt.endTime
      },
      sections,
      summary: {
        totalQuestions,
        totalAnswered,
        totalCorrect,
        totalIncorrect,
        totalNotAnswered: totalQuestions - totalAnswered,
        accuracy: totalAnswered > 0 ? ((totalCorrect / totalAnswered) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('❌ Error fetching attempt review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attempt review',
      error: error.message
    });
  }
};

// Get student's mock test reports summary
const getStudentReportsSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`📊 Fetching reports summary for user: ${userId}`);

    const allAttempts = await MockTestAttempt.find({ userId });
    console.log(`📊 Total attempts for user: ${allAttempts.length}`);
    allAttempts.forEach(a => console.log(`  - Attempt ${a._id}: status=${a.status}, testPaperId=${a.testPaperId}`));

    const attempts = await MockTestAttempt.find({ 
      userId, 
      status: 'COMPLETED' 
    })
    .populate('testPaperId', 'title testNumber')
    .populate('seriesId', 'title')
    .sort({ completedAt: -1 });
    
    console.log(`📊 Completed attempts: ${attempts.length}`);

    if (attempts.length === 0) {
      return res.json({
        success: true,
        summary: {
          totalAttempts: 0,
          averageScore: 0,
          bestScore: 0,
          averagePercentile: 0,
          averageTimeMinutes: 0
        },
        attempts: [],
        performanceTrend: []
      });
    }

    const scores = attempts.map(a => a.totalScore || 0);
    const percentiles = attempts.filter(a => a.percentile).map(a => a.percentile);
    const times = attempts.map(a => Math.floor((a.totalTimeTakenSeconds || 0) / 60));

    const summary = {
      totalAttempts: attempts.length,
      averageScore: scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 0,
      bestScore: Math.max(...scores),
      averagePercentile: percentiles.length > 0 ? (percentiles.reduce((a, b) => a + b, 0) / percentiles.length).toFixed(2) : 0,
      averageTimeMinutes: times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0
    };

    const formattedAttempts = attempts.map(attempt => ({
      _id: attempt._id,
      testName: attempt.testPaperId?.title || 'Unknown Test',
      testId: attempt.testPaperId?._id,
      seriesName: attempt.seriesId?.title,
      score: attempt.totalScore || 0,
      maxScore: attempt.totalMaxScore || 150,
      percentile: attempt.percentile || 0,
      rank: attempt.rank || 0,
      timeTakenMinutes: Math.floor((attempt.totalTimeTakenSeconds || 0) / 60),
      completedAt: attempt.completedAt,
      sectionWiseStats: attempt.sectionWiseStats || []
    }));

    const performanceTrend = attempts.slice(0, 10).reverse().map(a => ({
      testName: a.testPaperId?.title?.substring(0, 15) || 'Test',
      score: a.totalScore || 0,
      date: a.completedAt
    }));

    res.json({
      success: true,
      summary,
      attempts: formattedAttempts,
      performanceTrend
    });
  } catch (error) {
    console.error('❌ Error fetching reports summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports summary',
      error: error.message
    });
  }
};

// Get leaderboard for a specific test
const getTestLeaderboard = async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req.user.id;
    console.log(`🏆 Fetching leaderboard for test: ${testId}`);

    const allAttempts = await MockTestAttempt.find({
      testPaperId: testId,
      status: 'COMPLETED'
    })
    .populate('userId', 'name email')
    .sort({ totalScore: -1 })
    .limit(100);

    const uniqueAttempts = [];
    const seenUsers = new Set();
    for (const attempt of allAttempts) {
      const uId = attempt.userId?._id?.toString();
      if (uId && !seenUsers.has(uId)) {
        seenUsers.add(uId);
        uniqueAttempts.push(attempt);
      }
    }

    const topTen = uniqueAttempts.slice(0, 10).map((attempt, index) => ({
      rank: index + 1,
      studentName: attempt.userId?.name || 'Anonymous',
      score: attempt.totalScore || 0,
      timeTakenMinutes: Math.floor((attempt.totalTimeTakenSeconds || 0) / 60),
      completedAt: attempt.completedAt,
      isCurrentUser: attempt.userId?._id?.toString() === userId
    }));

    const userAttempt = uniqueAttempts.find(a => a.userId?._id?.toString() === userId);
    let userRank = null;
    if (userAttempt) {
      userRank = uniqueAttempts.findIndex(a => a.userId?._id?.toString() === userId) + 1;
    }

    res.json({
      success: true,
      testId,
      totalParticipants: uniqueAttempts.length,
      topTen,
      currentUserRank: userRank,
      currentUserScore: userAttempt?.totalScore || null
    });
  } catch (error) {
    console.error('❌ Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard',
      error: error.message
    });
  }
};

// Get section-wise performance comparison with top 10 comparison
const getSectionWiseAnalysis = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`📈 Fetching section-wise analysis for user: ${userId}`);

    const attempts = await MockTestAttempt.find({
      userId,
      status: 'COMPLETED'
    }).sort({ completedAt: -1 }).limit(10);

    const sectionAverages = { VARC: [], DILR: [], QA: [] };
    
    attempts.forEach(attempt => {
      (attempt.sectionWiseStats || []).forEach(stat => {
        const section = stat.section?.toUpperCase();
        if (sectionAverages[section]) {
          sectionAverages[section].push({
            score: stat.score || 0,
            accuracy: stat.accuracy || 0,
            timeSpent: stat.timeSpent || 0
          });
        }
      });
    });

    // Get top 10 performers' section-wise averages for comparison
    const allCompletedAttempts = await MockTestAttempt.find({
      status: 'COMPLETED'
    }).sort({ totalScore: -1 }).limit(100);

    // Get unique top 10 users
    const seenUsers = new Set();
    const topTenAttempts = [];
    for (const attempt of allCompletedAttempts) {
      const uId = attempt.userId?.toString();
      if (uId && !seenUsers.has(uId) && uId !== userId) {
        seenUsers.add(uId);
        topTenAttempts.push(attempt);
        if (topTenAttempts.length >= 10) break;
      }
    }

    // Calculate top 10 section averages
    const top10SectionAverages = { VARC: [], DILR: [], QA: [] };
    topTenAttempts.forEach(attempt => {
      (attempt.sectionWiseStats || []).forEach(stat => {
        const section = stat.section?.toUpperCase();
        if (top10SectionAverages[section]) {
          top10SectionAverages[section].push({
            score: stat.score || 0,
            accuracy: stat.accuracy || 0,
            timeSpent: stat.timeSpent || 0
          });
        }
      });
    });

    const analysis = Object.entries(sectionAverages).map(([section, stats]) => {
      const top10Stats = top10SectionAverages[section] || [];
      const userAvgScore = stats.length > 0 
        ? (stats.reduce((a, b) => a + b.score, 0) / stats.length) 
        : 0;
      const top10AvgScore = top10Stats.length > 0 
        ? (top10Stats.reduce((a, b) => a + b.score, 0) / top10Stats.length) 
        : 0;
      const userAvgAccuracy = stats.length > 0 
        ? (stats.reduce((a, b) => a + b.accuracy, 0) / stats.length) 
        : 0;
      const top10AvgAccuracy = top10Stats.length > 0 
        ? (top10Stats.reduce((a, b) => a + b.accuracy, 0) / top10Stats.length) 
        : 0;
      
      return {
        section,
        averageScore: userAvgScore.toFixed(2),
        averageAccuracy: userAvgAccuracy.toFixed(2),
        averageTimeMinutes: stats.length > 0 
          ? Math.round(stats.reduce((a, b) => a + b.timeSpent, 0) / stats.length / 60) 
          : 0,
        attempts: stats.length,
        top10AverageScore: top10AvgScore.toFixed(2),
        top10AverageAccuracy: top10AvgAccuracy.toFixed(2),
        scoreDifference: (userAvgScore - top10AvgScore).toFixed(2),
        accuracyDifference: (userAvgAccuracy - top10AvgAccuracy).toFixed(2)
      };
    });

    // Get user's current rank
    let userRank = null;
    const allUserScores = await MockTestAttempt.aggregate([
      { $match: { status: 'COMPLETED' } },
      { $group: { _id: '$userId', avgScore: { $avg: '$totalScore' } } },
      { $sort: { avgScore: -1 } }
    ]);
    const userIndex = allUserScores.findIndex(u => u._id?.toString() === userId);
    if (userIndex >= 0) {
      userRank = userIndex + 1;
    }

    res.json({
      success: true,
      analysis,
      userRank,
      totalParticipants: allUserScores.length,
      top10Count: topTenAttempts.length
    });
  } catch (error) {
    console.error('❌ Error fetching section analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch section analysis',
      error: error.message
    });
  }
};

module.exports = {
  getPublishedSeries,
  getTestsInSeries,
  getTestDetails,
  startTestAttempt,
  getAttemptData,
  saveResponse,
  syncProgress,
  transitionSection,
  submitTest,
  getTestHistory,
  getMockTestTree,
  getAttemptReview,
  getStudentReportsSummary,
  getTestLeaderboard,
  getSectionWiseAnalysis
};

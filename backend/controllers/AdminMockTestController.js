// backend/controllers/AdminMockTestController.js
const MockTestSeries = require('../models/MockTestSeries');
const MockTest = require('../models/MockTest');
const MockTestQuestion = require('../models/MockTestQuestion');
const MockTestAttempt = require('../models/MockTestAttempt');
const mongoose = require('mongoose');

// ---------------------------------------------------------------------
// SERIES
// ---------------------------------------------------------------------

// Create new mock test series
const createSeries = async (req, res) => {
  try {
    console.log('🆕 Creating new mock test series');
    const { title, description, category, freeTests, price, validity, tags, courseId } = req.body;

    const adminId = req.user?.id;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required',
      });
    }

    const seriesData = {
      title,
      description,
      category: category || 'CAT',
      freeTests: freeTests || 0,
      price: price || 0,
      validity: validity || 365,
      tags: tags || [],
      isPublished: false,
      createdBy: adminId || null,
    };

    if (courseId) {
      seriesData.courseId = courseId;
    }

    const series = new MockTestSeries(seriesData);

    await series.save();

    console.log('✅ Mock test series created successfully');
    res.status(201).json({
      success: true,
      message: 'Mock test series created successfully',
      series,
    });
  } catch (error) {
    console.error('❌ Error creating mock test series:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create mock test series',
      error: error.message,
    });
  }
};

// Get all series for admin
const getAllSeries = async (req, res) => {
  try {
    console.log('📚 Admin fetching all mock test series');
    const { page = 1, limit = 10, category, search, courseId } = req.query;

    const filter = {};
    if (category && category !== 'all') {
      filter.category = category;
    }
    if (courseId && courseId !== 'all') {
      if (mongoose.Types.ObjectId.isValid(courseId)) {
        filter.courseId = courseId;
      }
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    const series = await MockTestSeries.find(filter)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const total = await MockTestSeries.countDocuments(filter);

    // Get series with test counts & enrollment count
    const seriesWithCounts = await Promise.all(
      series.map(async (s) => {
        const testCount = await MockTest.countDocuments({ seriesId: s._id });
        const enrolledCount = (s.enrolledStudents || []).length;

        return {
          ...s.toObject(),
          actualTestCount: testCount,
          enrolledCount,
        };
      })
    );

    console.log(`✅ Found ${series.length} mock test series`);
    res.status(200).json({
      success: true,
      series: seriesWithCounts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('❌ Error fetching mock test series:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mock test series',
      error: error.message,
    });
  }
};

// Delete series (used by frontend DELETE /series/:id)
const deleteSeries = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑 Deleting series:', id);

    const series = await MockTestSeries.findById(id);
    if (!series) {
      return res.status(404).json({
        success: false,
        message: 'Mock test series not found',
      });
    }

    // Find tests under this series
    const tests = await MockTest.find({ seriesId: id }).select('_id');
    const testIds = tests.map((t) => t._id);

    await Promise.all([
      MockTestAttempt.deleteMany({ seriesId: id }),
      MockTestAttempt.deleteMany({ testId: { $in: testIds } }),
      MockTest.deleteMany({ seriesId: id }),
      MockTestSeries.findByIdAndDelete(id),
    ]);

    console.log('✅ Series and related tests/attempts deleted');
    res.status(200).json({
      success: true,
      message: 'Series (and related tests/attempts) deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error deleting series:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete mock test series',
      error: error.message,
    });
  }
};

// Publish/Unpublish series
const toggleSeriesPublication = async (req, res) => {
  try {
    const { seriesId } = req.params;
    const { publish } = req.body;

    console.log(`📢 ${publish ? 'Publishing' : 'Unpublishing'} series: ${seriesId}`);

    const series = await MockTestSeries.findById(seriesId);
    if (!series) {
      return res.status(404).json({
        success: false,
        message: 'Mock test series not found',
      });
    }

    series.isPublished = !!publish;
    series.publishedAt = publish ? new Date() : null;
    await series.save();

    console.log(`✅ Series ${publish ? 'published' : 'unpublished'} successfully`);
    res.status(200).json({
      success: true,
      message: `Series ${publish ? 'published' : 'unpublished'} successfully`,
      series,
    });
  } catch (error) {
    console.error('❌ Error toggling series publication:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update series publication status',
      error: error.message,
    });
  }
};

// ---------------------------------------------------------------------
// TESTS
// ---------------------------------------------------------------------

// Create new mock test
const createTest = async (req, res) => {
  try {
    console.log('🆕 Creating new mock test');

    const {
      title,
      description,
      seriesId,
      courseId,
      duration,
      totalQuestions,
      sections = [],
      instructions,
      isFree,
      price,
      difficulty,
      positiveMarks = 3,
      negativeMarks = -1,
      testType,
      paperType,
      previousYearExamCategoryId,
      previousYearExamYearId,
      previousYearExamSlotId,
      topicCategoryId,
      topicTestGroupId,
      visibility,
      liveFrom,
      liveTill,
      orderIndex,
    } = req.body;

    const adminId = req.user?.id;

    if (!title || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Title and duration are required',
      });
    }

    if (!courseId && !seriesId && !isFree) {
      return res.status(400).json({
        success: false,
        message: 'Either courseId, seriesId or isFree flag is required',
      });
    }

    let testNumber = 1;
    
    if (courseId) {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid courseId',
        });
      }
      const existingTestsCount = await MockTest.countDocuments({ courseId });
      testNumber = existingTestsCount + 1;
    } else if (seriesId) {
      if (!mongoose.Types.ObjectId.isValid(seriesId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid seriesId',
        });
      }
      const series = await MockTestSeries.findById(seriesId);
      if (!series) {
        return res.status(404).json({
          success: false,
          message: 'Series not found',
        });
      }
      const existingTestsCount = await MockTest.countDocuments({ seriesId });
      testNumber = existingTestsCount + 1;
    } else if (isFree) {
      const existingFreeTestsCount = await MockTest.countDocuments({ 
        isFree: true, 
        $or: [{ courseId: { $exists: false } }, { courseId: null }],
        $and: [{ $or: [{ seriesId: { $exists: false } }, { seriesId: null }] }]
      });
      testNumber = existingFreeTestsCount + 1;
    }

    // Map frontend sections -> schema sections
    // frontend: [{ name, questions, duration }]
    let computedTotalQuestions = 0;

    const mappedSections = (sections || []).map((sec) => {
      const qCount = sec.totalQuestions || sec.questions || 0;
      const secDuration = sec.duration || 0;
      computedTotalQuestions += qCount;

      return {
        name: sec.name,
        duration: secDuration,
        totalQuestions: qCount,
        totalMarks: qCount * positiveMarks,
        questions: [], // abhi question mapping alag API se karege
      };
    });

    const finalTotalQuestions = totalQuestions || computedTotalQuestions;
    const totalMarks = finalTotalQuestions * positiveMarks;

    const testData = {
      title,
      description,
      testNumber,
      duration,
      totalQuestions: finalTotalQuestions,
      totalMarks,
      sections: mappedSections,
      instructions,
      isFree: isFree || false,
      price: isFree ? null : (price || null),
      difficulty: difficulty || 'Medium',
      positiveMarks,
      negativeMarks,
      isPublished: true,
      publishedAt: new Date(),
      createdBy: adminId || null,
    };

    if (courseId) testData.courseId = courseId;
    if (seriesId) testData.seriesId = seriesId;

    if (testType) testData.testType = testType;
    if (paperType) testData.paperType = paperType;
    
    if (previousYearExamCategoryId) testData.previousYearExamCategoryId = previousYearExamCategoryId;
    if (previousYearExamYearId) testData.previousYearExamYearId = previousYearExamYearId;
    if (previousYearExamSlotId) testData.previousYearExamSlotId = previousYearExamSlotId;
    
    if (topicCategoryId) testData.topicCategoryId = topicCategoryId;
    if (topicTestGroupId) testData.topicTestGroupId = topicTestGroupId;
    
    if (visibility) testData.visibility = visibility;
    if (liveFrom) testData.liveFrom = liveFrom;
    if (liveTill) testData.liveTill = liveTill;
    if (orderIndex !== undefined) testData.orderIndex = orderIndex;

    const test = new MockTest(testData);

    await test.save();

    if (seriesId) {
      await MockTestSeries.findByIdAndUpdate(seriesId, {
        $inc: { totalTests: 1 },
      });
    }

    console.log('✅ Mock test created successfully');
    res.status(201).json({
      success: true,
      message: 'Mock test created successfully',
      test,
    });
  } catch (error) {
    console.error('❌ Error creating mock test:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create mock test',
      error: error.message,
    });
  }
};

// Get tests for admin (used by frontend GET /tests)
const getTests = async (req, res) => {
  try {
    console.log('📚 Admin fetching tests');
    const { 
      page = 1, 
      limit = 20, 
      seriesId,
      courseId, 
      search, 
      testType,
      examCategoryId, 
      examYearId, 
      examSlotId,
      topicCategoryId,
      topicTestGroupId
    } = req.query;

    const filter = {};
    
    // Filter by free tests (no courseId, no seriesId)
    if (courseId === 'free') {
      filter.isFree = true;
      filter.$or = [
        { courseId: { $exists: false } },
        { courseId: null }
      ];
      filter.$and = [
        { $or: [{ seriesId: { $exists: false } }, { seriesId: null }] }
      ];
    } else if (courseId && courseId !== 'all') {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid courseId',
        });
      }
      filter.courseId = courseId;
    }
    
    // Filter by series
    if (seriesId && seriesId !== 'all') {
      if (!mongoose.Types.ObjectId.isValid(seriesId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid seriesId',
        });
      }
      filter.seriesId = seriesId;
    }
    
    // Filter by test type (critical for separation)
    if (testType && testType !== 'all') {
      filter.testType = testType;
    }
    
    // Filter by exam hierarchy for previous year papers
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
    
    // Filter by topic hierarchy for topic-wise tests
    if (topicCategoryId && topicCategoryId !== 'all') {
      if (mongoose.Types.ObjectId.isValid(topicCategoryId)) {
        filter.topicCategoryId = topicCategoryId;
      }
    }
    if (topicTestGroupId && topicTestGroupId !== 'all') {
      if (mongoose.Types.ObjectId.isValid(topicTestGroupId)) {
        filter.topicTestGroupId = topicTestGroupId;
      }
    }
    
    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const tests = await MockTest.find(filter)
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const total = await MockTest.countDocuments(filter);

    // attach attempt count
    const testsWithStats = await Promise.all(
      tests.map(async (t) => {
        const attemptCount = await MockTestAttempt.countDocuments({ testId: t._id });
        return {
          ...t.toObject(),
          attemptCount,
        };
      })
    );

    console.log(`✅ Found ${tests.length} tests`);
    res.status(200).json({
      success: true,
      tests: testsWithStats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('❌ Error fetching tests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tests',
      error: error.message,
    });
  }
};

// Delete test (used by frontend DELETE /tests/:id)
const deleteTest = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑 Deleting test:', id);

    const test = await MockTest.findById(id);
    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Mock test not found',
      });
    }

    await Promise.all([
      MockTestAttempt.deleteMany({ testId: id }),
      MockTest.findByIdAndDelete(id),
      MockTestSeries.findByIdAndUpdate(test.seriesId, { $inc: { totalTests: -1 } }),
    ]);

    console.log('✅ Test deleted successfully');
    res.status(200).json({
      success: true,
      message: 'Test deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error deleting test:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete mock test',
      error: error.message,
    });
  }
};

// Publish/Unpublish test
const toggleTestPublication = async (req, res) => {
  try {
    const { testId } = req.params;
    const { publish } = req.body;

    console.log(`📢 ${publish ? 'Publishing' : 'Unpublishing'} test: ${testId}`);

    const test = await MockTest.findById(testId);
    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Mock test not found',
      });
    }

    test.isPublished = !!publish;
    test.publishedAt = publish ? new Date() : null;
    await test.save();

    console.log(`✅ Test ${publish ? 'published' : 'unpublished'} successfully`);
    res.status(200).json({
      success: true,
      message: `Test ${publish ? 'published' : 'unpublished'} successfully`,
      test,
    });
  } catch (error) {
    console.error('❌ Error toggling test publication:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update test publication status',
      error: error.message,
    });
  }
};

// Get test analytics
const getTestAnalytics = async (req, res) => {
  try {
    const { testId } = req.params;

    console.log(`📊 Fetching analytics for test: ${testId}`);

    const test = await MockTest.findById(testId).populate('seriesId', 'title');
    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found',
      });
    }

    const attempts = await MockTestAttempt.find({ testId }).populate(
      'studentId',
      'name email'
    );

    const analytics = {
      test: {
        title: test.title,
        series: test.seriesId.title,
        totalQuestions: test.totalQuestions,
        duration: test.duration,
      },
      participation: {
        totalAttempts: attempts.length,
        completedAttempts: attempts.filter((a) => a.isCompleted).length,
        averageScore:
          attempts.length > 0
            ? attempts.reduce((sum, a) => sum + a.score.total, 0) / attempts.length
            : 0,
        averageTime:
          attempts.length > 0
            ? attempts.reduce((sum, a) => sum + a.timeSpent, 0) / attempts.length
            : 0,
      },
      scoreDistribution: {
        excellent: attempts.filter((a) => a.score.total >= 80).length,
        good: attempts.filter(
          (a) => a.score.total >= 60 && a.score.total < 80
        ).length,
        average: attempts.filter(
          (a) => a.score.total >= 40 && a.score.total < 60
        ).length,
        needsImprovement: attempts.filter((a) => a.score.total < 40).length,
      },
      recentAttempts: attempts.slice(0, 10),
    };

    console.log('✅ Analytics fetched successfully');
    res.status(200).json({
      success: true,
      analytics,
    });
  } catch (error) {
    console.error('❌ Error fetching test analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test analytics',
      error: error.message,
    });
  }
};

// ---------------------------------------------------------------------
// QUESTIONS
// ---------------------------------------------------------------------

// Create new question
const createQuestion = async (req, res) => {
  try {
    console.log('🆕 Creating new mock test question');
    const {
      testPaperId,
      sequenceNumber,
      questionText,
      questionType,
      section,
      passage,
      images,
      options,
      correctOptionIds,
      numericAnswer,
      textAnswer,
      explanation,
      marks,
      difficulty,
      timeSuggestionSeconds,
      topicTag,
      subTopicTag,
      tags,
    } = req.body;

    const adminId = req.user?.id;

    if (!questionText || !section || !testPaperId) {
      return res.status(400).json({
        success: false,
        message: 'Question text, section, and testPaperId are required',
      });
    }

    // Validate testPaperId
    if (!mongoose.Types.ObjectId.isValid(testPaperId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid testPaperId',
      });
    }

    // Check if test exists
    const test = await MockTest.findById(testPaperId);
    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found',
      });
    }

    // Always auto-assign the next sequence number to avoid duplicates
    const maxQuestion = await MockTestQuestion.findOne({ testPaperId })
      .sort({ sequenceNumber: -1 })
      .select('sequenceNumber');
    const finalSequenceNumber = maxQuestion ? maxQuestion.sequenceNumber + 1 : 1;
    console.log(`📊 Auto-assigned sequence number: ${finalSequenceNumber} for test ${testPaperId}`);

    const question = new MockTestQuestion({
      testPaperId,
      sequenceNumber: finalSequenceNumber,
      questionText,
      questionType: questionType || 'SINGLE_CORRECT_MCQ',
      section,
      passage,
      images: images || [],
      options: options || [],
      correctOptionIds: correctOptionIds || [],
      numericAnswer,
      textAnswer,
      explanation,
      marks: marks || { positive: 3, negative: -1 },
      difficulty: difficulty || 'MEDIUM',
      timeSuggestionSeconds,
      topicTag,
      subTopicTag,
      tags: tags || [],
      isActive: true,
      createdBy: adminId || null,
    });

    await question.save();

    // Link question to the test's section
    const sectionIndex = test.sections.findIndex(s => s.name === section);
    if (sectionIndex !== -1) {
      // Add question ObjectId to the section's questions array
      if (!test.sections[sectionIndex].questions) {
        test.sections[sectionIndex].questions = [];
      }
      test.sections[sectionIndex].questions.push(question._id);
      await test.save();
      console.log(`✅ Question linked to section ${section} in test`);
    } else {
      console.log(`⚠️ Section ${section} not found in test, question created but not linked`);
    }

    console.log('✅ Mock test question created successfully');
    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      question,
    });
  } catch (error) {
    console.error('❌ Error creating question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create question',
      error: error.message,
    });
  }
};

// Get questions for admin
const getQuestions = async (req, res) => {
  try {
    console.log('📚 Admin fetching questions');
    const {
      page = 1,
      limit = 1000,
      testPaperId,
      section,
      topic,
      difficulty,
      search,
    } = req.query;

    const filter = { isActive: true };

    if (testPaperId && mongoose.Types.ObjectId.isValid(testPaperId)) {
      filter.testPaperId = testPaperId;
    }
    if (section && section !== 'all') {
      filter.section = section;
    }
    if (topic) {
      filter.topicTag = { $regex: topic, $options: 'i' };
    }
    if (difficulty && difficulty !== 'all') {
      filter.difficulty = difficulty;
    }
    if (search) {
      filter.$or = [
        { questionText: { $regex: search, $options: 'i' } },
        { topicTag: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 1000;

    const questions = await MockTestQuestion.find(filter)
      .populate('createdBy', 'name')
      .sort({ sequenceNumber: 1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const total = await MockTestQuestion.countDocuments(filter);

    console.log(`✅ Found ${questions.length} questions`);
    res.status(200).json({
      success: true,
      questions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('❌ Error fetching questions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch questions',
      error: error.message,
    });
  }
};

// Update test (used by frontend PUT /tests/:id)
const updateTest = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📝 Updating test:', id);

    const {
      title,
      description,
      duration,
      totalQuestions,
      sections,
      instructions,
      isFree,
      price,
      difficulty,
      positiveMarks = 3,
      negativeMarks = -1,
      testType,
      paperType,
      // Previous Year Papers - Paper Wise Mapping
      previousYearExamCategoryId,
      previousYearExamYearId,
      previousYearExamSlotId,
      // Topic Wise Mapping
      topicCategoryId,
      topicTestGroupId,
      // Legacy fields
      exam,
      yearLabel,
      subject,
      topic,
      sessionYear,
      // Other fields
      visibility,
      liveFrom,
      liveTill,
      orderIndex
    } = req.body;

    const test = await MockTest.findById(id);
    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Mock test not found',
      });
    }

    const finalTotalQuestions = totalQuestions || test.totalQuestions;
    const totalMarks = finalTotalQuestions * positiveMarks;

    const updateData = {
      title: title || test.title,
      description,
      duration: duration || test.duration,
      totalQuestions: finalTotalQuestions,
      totalMarks,
      sections: sections || test.sections,
      instructions,
      isFree,
      price: isFree ? null : (price !== undefined ? price : test.price),
      difficulty,
      testType,
      paperType,
      previousYearExamCategoryId,
      previousYearExamYearId,
      previousYearExamSlotId,
      topicCategoryId,
      topicTestGroupId,
      exam,
      yearLabel,
      subject,
      topic,
      sessionYear,
      visibility,
      liveFrom,
      liveTill,
      orderIndex
    };

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        test[key] = updateData[key];
      }
    });

    await test.save();

    console.log('✅ Test updated successfully');
    res.status(200).json({
      success: true,
      message: 'Test updated successfully',
      test,
    });
  } catch (error) {
    console.error('❌ Error updating test:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update mock test',
      error: error.message,
    });
  }
};

// Update question
const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📝 Updating question:', id);

    const question = await MockTestQuestion.findById(id);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    const {
      questionText,
      questionType,
      section,
      passage,
      images,
      options,
      correctOptionIds,
      numericAnswer,
      textAnswer,
      explanation,
      marks,
      difficulty,
      timeSuggestionSeconds,
      topicTag,
      subTopicTag,
      tags,
      sequenceNumber,
    } = req.body;

    // Update fields
    if (questionText) question.questionText = questionText;
    if (questionType) question.questionType = questionType;
    if (section) question.section = section;
    if (passage !== undefined) question.passage = passage;
    if (images) question.images = images;
    if (options) question.options = options;
    if (correctOptionIds) question.correctOptionIds = correctOptionIds;
    if (numericAnswer !== undefined) question.numericAnswer = numericAnswer;
    if (textAnswer !== undefined) question.textAnswer = textAnswer;
    if (explanation !== undefined) question.explanation = explanation;
    if (marks) question.marks = marks;
    if (difficulty) question.difficulty = difficulty;
    if (timeSuggestionSeconds !== undefined) question.timeSuggestionSeconds = timeSuggestionSeconds;
    if (topicTag !== undefined) question.topicTag = topicTag;
    if (subTopicTag !== undefined) question.subTopicTag = subTopicTag;
    if (tags) question.tags = tags;
    if (sequenceNumber) question.sequenceNumber = sequenceNumber;

    await question.save();

    console.log('✅ Question updated successfully');
    res.status(200).json({
      success: true,
      message: 'Question updated successfully',
      question,
    });
  } catch (error) {
    console.error('❌ Error updating question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update question',
      error: error.message,
    });
  }
};

// Delete question
const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑 Deleting question:', id);

    const question = await MockTestQuestion.findByIdAndDelete(id);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    console.log('✅ Question deleted successfully');
    res.status(200).json({
      success: true,
      message: 'Question deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error deleting question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete question',
      error: error.message,
    });
  }
};

// Bulk upload questions
const bulkUploadQuestions = async (req, res) => {
  try {
    console.log('📤 Bulk uploading questions');
    const { testPaperId, questions } = req.body;

    if (!testPaperId || !mongoose.Types.ObjectId.isValid(testPaperId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid testPaperId is required',
      });
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Questions array is required and must not be empty',
      });
    }

    // Check if test exists
    const test = await MockTest.findById(testPaperId);
    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found',
      });
    }

    const adminId = req.user?.id;

    // Get the current max sequence number for this test
    const maxQuestion = await MockTestQuestion.findOne({ testPaperId })
      .sort({ sequenceNumber: -1 })
      .select('sequenceNumber');
    
    let nextSequenceNumber = maxQuestion ? maxQuestion.sequenceNumber + 1 : 1;

    // Helper function to normalize section values
    const normalizeSection = (section) => {
      if (!section) return 'GENERAL';
      const sectionUpper = String(section).toUpperCase().trim();
      
      // Direct matches
      if (['VARC', 'DILR', 'QA', 'GENERAL'].includes(sectionUpper)) {
        return sectionUpper;
      }
      
      // Variations for QA
      if (sectionUpper.includes('QUANT') || sectionUpper.includes('QA') || 
          sectionUpper === 'Q' || sectionUpper === 'MATHS' || sectionUpper === 'MATH') {
        return 'QA';
      }
      
      // Variations for VARC
      if (sectionUpper.includes('VARC') || sectionUpper.includes('VERBAL') || 
          sectionUpper.includes('RC') || sectionUpper === 'V') {
        return 'VARC';
      }
      
      // Variations for DILR
      if (sectionUpper.includes('DILR') || sectionUpper.includes('DI') || 
          sectionUpper.includes('LR') || sectionUpper.includes('LOGIC')) {
        return 'DILR';
      }
      
      return 'GENERAL';
    };

    // Helper function to normalize difficulty values
    const normalizeDifficulty = (difficulty) => {
      if (!difficulty) return 'MEDIUM';
      const diffUpper = String(difficulty).toUpperCase().trim();
      
      // Direct matches
      if (['EASY', 'MEDIUM', 'HARD'].includes(diffUpper)) {
        return diffUpper;
      }
      
      // Numeric mappings
      if (difficulty === 1 || diffUpper === '1' || diffUpper === 'LOW') return 'EASY';
      if (difficulty === 2 || diffUpper === '2' || diffUpper === 'MED') return 'MEDIUM';
      if (difficulty === 3 || diffUpper === '3' || diffUpper === 'HIGH') return 'HARD';
      
      return 'MEDIUM';
    };

    // Prepare questions for insertion
    const questionsToInsert = questions.map((q, index) => ({
      testPaperId,
      sequenceNumber: q.sequenceNumber || nextSequenceNumber++,
      questionText: q.questionText,
      questionType: q.questionType || 'SINGLE_CORRECT_MCQ',
      section: normalizeSection(q.section),
      passage: q.passage,
      images: q.images || [],
      options: q.options || [],
      correctOptionIds: q.correctOptionIds || [],
      numericAnswer: q.numericAnswer,
      textAnswer: q.textAnswer,
      explanation: q.explanation,
      marks: q.marks || { positive: 3, negative: -1 },
      difficulty: normalizeDifficulty(q.difficulty),
      timeSuggestionSeconds: q.timeSuggestionSeconds,
      topicTag: q.topicTag,
      subTopicTag: q.subTopicTag,
      tags: q.tags || [],
      isActive: true,
      createdBy: adminId || null,
    }));

    const insertedQuestions = await MockTestQuestion.insertMany(questionsToInsert);

    console.log(`✅ Bulk uploaded ${insertedQuestions.length} questions`);
    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${insertedQuestions.length} questions`,
      count: insertedQuestions.length,
      questions: insertedQuestions,
    });
  } catch (error) {
    console.error('❌ Error bulk uploading questions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk upload questions',
      error: error.message,
    });
  }
};

// Get student performance for admin view
const getStudentPerformance = async (req, res) => {
  try {
    const { studentId } = req.params;
    console.log(`📊 Admin fetching performance for student: ${studentId}`);

    const User = require('../models/User');
    const student = await User.findById(studentId).select('name email phoneNumber');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const attempts = await MockTestAttempt.find({
      userId: studentId,
      status: 'COMPLETED'
    })
    .populate('testPaperId', 'title')
    .sort({ completedAt: -1 })
    .limit(50);

    const summary = {
      totalAttempts: attempts.length,
      averageScore: attempts.length > 0 
        ? Math.round(attempts.reduce((sum, a) => sum + (a.totalScore || 0), 0) / attempts.length) 
        : 0,
      bestScore: attempts.length > 0 
        ? Math.max(...attempts.map(a => a.totalScore || 0)) 
        : 0,
      averagePercentile: attempts.length > 0 
        ? Math.round(attempts.reduce((sum, a) => sum + (a.percentile || 0), 0) / attempts.length) 
        : 0
    };

    const sectionAverages = {};
    attempts.forEach(attempt => {
      (attempt.sectionWiseStats || []).forEach(stat => {
        const section = stat.section || 'General';
        if (!sectionAverages[section]) sectionAverages[section] = [];
        sectionAverages[section].push({
          score: stat.score || 0,
          accuracy: stat.accuracy || 0
        });
      });
    });

    const sectionAnalysis = Object.entries(sectionAverages).map(([section, stats]) => ({
      section,
      averageScore: stats.length > 0 
        ? parseFloat((stats.reduce((a, b) => a + b.score, 0) / stats.length).toFixed(1)) 
        : 0,
      averageAccuracy: stats.length > 0 
        ? parseFloat((stats.reduce((a, b) => a + b.accuracy, 0) / stats.length).toFixed(1)) 
        : 0
    }));

    const CourseTest = require("../models/course/Test");
    const courseTestIds = attempts
      .filter(a => !a.testPaperId?.title)
      .map(a => a.testPaperId?._id || a.testPaperId);
    let courseTestMap = {};
    if (courseTestIds.length > 0) {
      const courseTests = await CourseTest.find({ _id: { $in: courseTestIds } })
        .populate('course', 'name').populate('topic', 'name').select('title course topic');
      courseTests.forEach(ct => { courseTestMap[ct._id.toString()] = ct; });
    }

    const formattedAttempts = attempts.map(a => {
      let testName = a.testPaperId?.title;
      if (!testName) {
        const tpId = (a.testPaperId?._id || a.testPaperId)?.toString();
        const ct = courseTestMap[tpId];
        testName = ct ? (ct.title || `${ct.course?.name || ''} - ${ct.topic?.name || ''}`) : 'Test';
      }
      return {
        testId: a.testPaperId?._id || a.testPaperId,
        testName,
        score: a.totalScore || 0,
        rank: a.rank || null,
        percentile: a.percentile || 0,
        timeTakenMinutes: Math.floor((a.totalTimeTakenSeconds || 0) / 60),
        completedAt: a.completedAt
      };
    });

    res.json({
      success: true,
      student: { name: student.name, email: student.email },
      summary,
      sectionAnalysis,
      attempts: formattedAttempts
    });
  } catch (error) {
    console.error('❌ Error fetching student performance:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch performance', error: error.message });
  }
};

// Get test leaderboard for admin view
const getTestLeaderboardAdmin = async (req, res) => {
  try {
    const { testId } = req.params;
    console.log(`🏆 Admin fetching leaderboard for test: ${testId}`);

    const test = await MockTest.findById(testId).select('title');
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    const allAttempts = await MockTestAttempt.find({
      testPaperId: testId,
      status: 'COMPLETED'
    })
    .populate('userId', 'name email phoneNumber')
    .sort({ totalScore: -1 })
    .limit(200);

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
      email: attempt.userId?.email || '',
      score: attempt.totalScore || 0,
      timeTakenMinutes: Math.floor((attempt.totalTimeTakenSeconds || 0) / 60),
      percentile: uniqueAttempts.length > 1 
        ? ((1 - (index / uniqueAttempts.length)) * 100).toFixed(1) 
        : 100,
      completedAt: attempt.completedAt
    }));

    const allFormatted = uniqueAttempts.map((attempt, index) => ({
      rank: index + 1,
      studentName: attempt.userId?.name || 'Anonymous',
      score: attempt.totalScore || 0,
      completedAt: attempt.completedAt
    }));

    const averageScore = uniqueAttempts.length > 0 
      ? Math.round(uniqueAttempts.reduce((sum, a) => sum + (a.totalScore || 0), 0) / uniqueAttempts.length)
      : 0;
    const highestScore = uniqueAttempts.length > 0 
      ? Math.max(...uniqueAttempts.map(a => a.totalScore || 0))
      : 0;

    res.json({
      success: true,
      testId,
      testName: test.title,
      totalParticipants: uniqueAttempts.length,
      averageScore,
      highestScore,
      topTen,
      allAttempts: allFormatted
    });
  } catch (error) {
    console.error('❌ Error fetching test leaderboard:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch leaderboard', error: error.message });
  }
};

const copySectionQuestions = async (req, res) => {
  try {
    const { sourceTestId, sectionName, targetTestId } = req.body;

    if (!sourceTestId || !sectionName || !targetTestId) {
      return res.status(400).json({
        success: false,
        message: 'Source test ID, section name, and target test ID are required'
      });
    }

    const sourceTest = await MockTest.findById(sourceTestId);
    if (!sourceTest) {
      return res.status(404).json({
        success: false,
        message: 'Source test not found'
      });
    }

    const targetTest = await MockTest.findById(targetTestId);
    if (!targetTest) {
      return res.status(404).json({
        success: false,
        message: 'Target test not found'
      });
    }

    const sectionExists = targetTest.sections?.find(s => s.name === sectionName);
    if (!sectionExists) {
      return res.status(400).json({
        success: false,
        message: `Section "${sectionName}" does not exist in the target test`
      });
    }

    const sourceQuestions = await MockTestQuestion.find({
      testPaperId: sourceTestId,
      section: sectionName
    }).lean();

    if (sourceQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: `No questions found in "${sectionName}" section of the source test`
      });
    }

    const existingMaxOrder = await MockTestQuestion.find({ testPaperId: targetTestId })
      .sort({ order: -1 })
      .limit(1)
      .lean();
    let startOrder = existingMaxOrder.length > 0 ? (existingMaxOrder[0].order || 0) + 1 : 1;

    const copiedQuestions = sourceQuestions.map((q, index) => {
      const { _id, __v, createdAt, updatedAt, ...questionData } = q;
      return {
        ...questionData,
        testPaperId: targetTestId,
        section: sectionName,
        order: startOrder + index
      };
    });

    await MockTestQuestion.insertMany(copiedQuestions);

    console.log(`✅ Copied ${copiedQuestions.length} questions from ${sectionName} section`);
    res.status(200).json({
      success: true,
      message: `Successfully copied ${copiedQuestions.length} questions`,
      copiedCount: copiedQuestions.length
    });
  } catch (error) {
    console.error('❌ Error copying section questions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to copy section questions',
      error: error.message
    });
  }
};

const getDashboardAnalytics = async (req, res) => {
  try {
    console.log('📊 Admin fetching dashboard analytics');
    const User = require('../models/User');

    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalAttempts = await MockTestAttempt.countDocuments({ status: 'COMPLETED' });
    const CourseTestModel = require("../models/course/Test");
    const mockTestCount = await MockTest.countDocuments({ isActive: true });
    const courseTestCount = await CourseTestModel.countDocuments({ isPublished: true });
    const totalTests = mockTestCount + courseTestCount;

    const recentAttempts = await MockTestAttempt.find({ status: 'COMPLETED' })
      .populate('userId', 'name')
      .populate('testPaperId', 'title')
      .sort({ completedAt: -1 })
      .limit(20);

    const CourseTest = require("../models/course/Test");
    const courseTestIds = recentAttempts
      .filter(a => !a.testPaperId?.title)
      .map(a => a.testPaperId?._id || a.testPaperId);
    let courseTestMap = {};
    if (courseTestIds.length > 0) {
      const courseTests = await CourseTest.find({ _id: { $in: courseTestIds } })
        .populate('course', 'name').populate('topic', 'name').select('title course topic');
      courseTests.forEach(ct => { courseTestMap[ct._id.toString()] = ct; });
    }

    const formattedRecent = recentAttempts.map(a => {
      let testName = a.testPaperId?.title;
      if (!testName) {
        const tpId = (a.testPaperId?._id || a.testPaperId)?.toString();
        const ct = courseTestMap[tpId];
        testName = ct ? (ct.title || `${ct.course?.name || ''} - ${ct.topic?.name || ''}`) : 'Test';
      }
      return {
        studentName: a.userId?.name || 'Unknown',
        testName,
        score: a.totalScore || 0,
        completedAt: a.completedAt || a.updatedAt,
        timeTakenMinutes: Math.floor((a.totalTimeTakenSeconds || 0) / 60)
      };
    });

    const topPerformers = await MockTestAttempt.aggregate([
      { $match: { status: 'COMPLETED' } },
      { $group: { _id: '$userId', avgScore: { $avg: '$totalScore' }, totalTests: { $sum: 1 }, bestScore: { $max: '$totalScore' } } },
      { $sort: { avgScore: -1 } },
      { $limit: 10 }
    ]);

    const topUserIds = topPerformers.map(t => t._id);
    const topUsers = await User.find({ _id: { $in: topUserIds } }).select('name email phoneNumber');
    const userMap = {};
    topUsers.forEach(u => { userMap[u._id.toString()] = u; });

    const topPerformersFormatted = topPerformers.map((p, idx) => ({
      rank: idx + 1,
      name: userMap[p._id?.toString()]?.name || 'Unknown',
      email: userMap[p._id?.toString()]?.email || '',
      avgScore: Math.round(p.avgScore || 0),
      totalTests: p.totalTests,
      bestScore: p.bestScore || 0
    }));

    const scoreDistribution = await MockTestAttempt.aggregate([
      { $match: { status: 'COMPLETED', totalScore: { $gt: 0 } } },
      { $bucket: {
        groupBy: '$totalScore',
        boundaries: [0, 25, 50, 75, 100, 125, 150, 200, 300],
        default: '300+',
        output: { count: { $sum: 1 } }
      }}
    ]);

    const dailyAttempts = await MockTestAttempt.aggregate([
      { $match: { status: 'COMPLETED', completedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
        count: { $sum: 1 },
        avgScore: { $avg: '$totalScore' }
      }},
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      overview: { totalStudents, totalAttempts, totalTests },
      recentAttempts: formattedRecent,
      topPerformers: topPerformersFormatted,
      scoreDistribution,
      dailyAttempts
    });
  } catch (error) {
    console.error('❌ Error fetching dashboard analytics:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createSeries,
  getAllSeries,
  deleteSeries,
  createTest,
  getTests,
  deleteTest,
  updateTest,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getQuestions,
  bulkUploadQuestions,
  toggleSeriesPublication,
  toggleTestPublication,
  getTestAnalytics,
  getStudentPerformance,
  getTestLeaderboardAdmin,
  copySectionQuestions,
  getDashboardAnalytics
};

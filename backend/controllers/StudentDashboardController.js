const MockTestAttempt = require('../models/MockTestAttempt');
const User = require('../models/UserSchema');
const LiveClass = require('../models/LiveClass');
const LiveSession = require('../models/LiveSession');
const VideoContent = require('../models/course/VideoContent');
const Course = require('../models/course/Course');
const UserProgress = require('../models/UserProgress');
const mongoose = require('mongoose');

exports.getDashboardMetrics = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const enrolledCourseIds = (user.enrolledCourses || [])
      .filter(e => e.status === 'unlocked')
      .map(e => e.courseId);

    const testsTaken = await MockTestAttempt.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      status: { $in: ['completed', 'submitted', 'COMPLETED', 'SUBMITTED'] }
    });

    const completedAttempts = await MockTestAttempt.find({
      userId: new mongoose.Types.ObjectId(userId),
      status: { $in: ['completed', 'submitted', 'COMPLETED', 'SUBMITTED'] }
    }).lean();

    let totalScore = 0;
    let totalMaxScore = 0;
    completedAttempts.forEach(attempt => {
      if (attempt.score !== undefined && attempt.totalMarks) {
        totalScore += attempt.score;
        totalMaxScore += attempt.totalMarks;
      }
    });
    const averageScore = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyTestActivity = await MockTestAttempt.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      }
    ]);

    const allProgress = await UserProgress.find({
      userId: new mongoose.Types.ObjectId(userId),
      courseId: { $in: enrolledCourseIds }
    }).lean();

    const lessonActivityMap = {};
    for (const prog of allProgress) {
      for (const lesson of (prog.lessonProgress || [])) {
        const accessDate = lesson.lastAccessedAt || lesson.completedAt;
        if (accessDate && new Date(accessDate) >= sevenDaysAgo) {
          const dateKey = new Date(accessDate).toISOString().split('T')[0];
          lessonActivityMap[dateKey] = (lessonActivityMap[dateKey] || 0) + 1;
        }
      }
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const learningProgress = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];

      const testCount = weeklyTestActivity.find(a => a._id === dateKey)?.count || 0;
      const lessonCount = lessonActivityMap[dateKey] || 0;

      learningProgress.push({
        day: dayNames[date.getDay()],
        activities: testCount + lessonCount
      });
    }

    let totalCourseItems = 0;
    let completedItems = 0;
    let totalVideos = 0;
    let totalLessonsCompleted = 0;

    for (const courseId of enrolledCourseIds) {
      try {
        const course = await Course.findById(courseId).lean();
        if (course) {
          const videoCount = await VideoContent.countDocuments({ courseId });
          totalVideos += videoCount;

          const progress = allProgress.find(
            p => p.courseId.toString() === courseId.toString()
          );
          if (progress) {
            const completed = (progress.lessonProgress || []).filter(
              l => l.status === 'completed'
            ).length;
            totalLessonsCompleted += completed;
          }
        }
      } catch (e) {
        console.warn('Error counting course items:', e.message);
      }
    }

    totalCourseItems = totalVideos > 0 ? totalVideos : enrolledCourseIds.length * 10;
    completedItems = totalLessonsCompleted + testsTaken;

    const completionRate = totalCourseItems > 0
      ? Math.round((completedItems / totalCourseItems) * 100)
      : 0;

    const coursesEnrolled = enrolledCourseIds.length;

    let totalTimeSpent = 0;
    for (const prog of allProgress) {
      totalTimeSpent += prog.totalTimeSpent || 0;
      for (const lesson of (prog.lessonProgress || [])) {
        totalTimeSpent += lesson.timeSpent || 0;
      }
    }

    res.json({
      success: true,
      data: {
        testsTaken,
        averageScore,
        completionRate: Math.min(completionRate, 100),
        coursesEnrolled,
        learningProgress,
        streak: user.streak || 0,
        lessonsCompleted: totalLessonsCompleted,
        totalTimeSpentMinutes: Math.round(totalTimeSpent / 60)
      }
    });

  } catch (error) {
    console.error('getDashboardMetrics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard metrics' });
  }
};

exports.getCourseProgress = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const enrolledCourses = (user.enrolledCourses || [])
      .filter(e => e.status === 'unlocked');

    const allProgress = await UserProgress.find({
      userId: new mongoose.Types.ObjectId(userId),
      courseId: { $in: enrolledCourses.map(e => e.courseId) }
    }).lean();

    const courseProgressData = [];
    let totalCompleted = 0;
    let totalInProgress = 0;
    let totalNotStarted = 0;

    for (const enrollment of enrolledCourses) {
      try {
        const course = await Course.findById(enrollment.courseId).lean();
        if (!course) continue;

        const videoCount = await VideoContent.countDocuments({ courseId: enrollment.courseId });

        const testAttempts = await MockTestAttempt.countDocuments({
          userId: new mongoose.Types.ObjectId(userId),
          courseId: enrollment.courseId,
          status: { $in: ['completed', 'submitted', 'COMPLETED', 'SUBMITTED'] }
        });

        const progress = allProgress.find(
          p => p.courseId.toString() === enrollment.courseId.toString()
        );

        const lessonsCompleted = progress
          ? (progress.lessonProgress || []).filter(l => l.status === 'completed').length
          : 0;
        const lessonsInProgress = progress
          ? (progress.lessonProgress || []).filter(l => l.status === 'in_progress').length
          : 0;
        const overallProgress = progress?.overallProgress || 0;

        const totalItems = videoCount > 0 ? videoCount : 10;
        const completedItems = lessonsCompleted + testAttempts;
        const progressPercent = overallProgress > 0
          ? overallProgress
          : (totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0);

        if (progressPercent >= 80) {
          totalCompleted++;
        } else if (progressPercent > 0 || lessonsInProgress > 0 || testAttempts > 0) {
          totalInProgress++;
        } else {
          totalNotStarted++;
        }

        courseProgressData.push({
          courseId: course._id,
          courseName: course.name,
          thumbnail: course.thumbnail,
          totalVideos: videoCount,
          watchedVideos: lessonsCompleted,
          lessonsInProgress,
          testsCompleted: testAttempts,
          progressPercent: Math.min(progressPercent, 100),
          overallProgress
        });

      } catch (e) {
        console.warn('Error calculating course progress:', e.message);
      }
    }

    const total = totalCompleted + totalInProgress + totalNotStarted;
    const chartData = total > 0
      ? [totalCompleted, totalInProgress, totalNotStarted]
      : [0, 0, enrolledCourses.length || 1];

    res.json({
      success: true,
      data: {
        courses: courseProgressData,
        summary: {
          completed: totalCompleted,
          inProgress: totalInProgress,
          notStarted: totalNotStarted,
          total,
          chartData
        }
      }
    });

  } catch (error) {
    console.error('getCourseProgress error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch course progress' });
  }
};

exports.getUpcomingClasses = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const enrolledCourseIds = (user.enrolledCourses || [])
      .filter(e => e.status === 'unlocked')
      .map(e => e.courseId);

    const now = new Date();

    const liveClasses = await LiveClass.find({
      courseId: { $in: enrolledCourseIds },
      startTime: { $gte: now },
      status: { $ne: 'cancelled' }
    })
    .populate('courseId', 'name')
    .sort({ startTime: 1 })
    .limit(5)
    .lean();

    let batchSessions = [];
    try {
      batchSessions = await LiveSession.find({
        date: { $gte: now }
      })
      .populate({
        path: 'liveBatchId',
        populate: { path: 'courseId', select: 'name' }
      })
      .sort({ date: 1 })
      .limit(10)
      .lean();

      batchSessions = batchSessions.filter(session => {
        const courseId = session.liveBatchId?.courseId?._id;
        return courseId && enrolledCourseIds.some(id => id.toString() === courseId.toString());
      });
    } catch (e) {
      console.warn('Error fetching batch sessions:', e.message);
    }

    const upcomingClasses = [
      ...liveClasses.map(lc => ({
        _id: lc._id,
        title: lc.title,
        courseName: lc.courseId?.name || 'Live Class',
        startTime: lc.startTime,
        endTime: lc.endTime,
        joinLink: lc.joinLink,
        platform: lc.platform,
        type: 'live_class',
        canJoin: true
      })),
      ...batchSessions.map(bs => ({
        _id: bs._id,
        title: bs.topic || bs.liveBatchId?.name || 'Batch Session',
        courseName: bs.liveBatchId?.courseId?.name || 'Batch Class',
        startTime: bs.date,
        endTime: bs.date,
        joinLink: bs.meetingLink,
        platform: bs.platform,
        type: 'batch_session',
        canJoin: !!bs.meetingLink
      }))
    ].sort((a, b) => new Date(a.startTime) - new Date(b.startTime)).slice(0, 5);

    res.json({
      success: true,
      data: upcomingClasses
    });

  } catch (error) {
    console.error('getUpcomingClasses error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch upcoming classes' });
  }
};

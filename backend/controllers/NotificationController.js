const Notification = require('../models/Notification');
const Enrollment = require('../models/Enrollment');
const CourseLiveBatch = require('../models/CourseLiveBatch');
const User = require('../models/UserSchema');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || 'noreply@tathagat.com',
    pass: process.env.EMAIL_PASSWORD
  }
});

const sendEmailNotification = async (user, notification) => {
  if (!user.email || !process.env.EMAIL_PASSWORD) {
    console.log('Email not sent: missing email or credentials');
    return false;
  }

  try {
    const mailOptions = {
      from: `"TathaGat Classes" <${process.env.SENDER_EMAIL || process.env.EMAIL_USER || 'noreply@tathagat.com'}>`,
      to: user.email,
      subject: notification.title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #2c3e50, #3498db); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">TathaGat Classes</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #2c3e50;">${notification.title}</h2>
            <p style="color: #555; font-size: 16px; line-height: 1.6;">${notification.message}</p>
            ${notification.data?.meetingLink ? `
              <div style="margin: 25px 0; text-align: center;">
                <a href="${notification.data.meetingLink}" 
                   style="background: #27ae60; color: white; padding: 15px 30px; 
                          text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Join Live Session
                </a>
              </div>
            ` : ''}
            <p style="color: #777; font-size: 12px;">
              This is an automated notification from TathaGat CAT Preparation Platform.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    await Notification.findByIdAndUpdate(notification._id, { 
      'sentAt.email': new Date() 
    });
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
};

const notifyEnrolledStudents = async (session, batch, courseIds) => {
  try {
    const enrollments = await Enrollment.find({
      courseId: { $in: courseIds },
      status: 'active'
    }).populate('userId', 'email name');

    const Course = require('../models/course/Course');
    const course = await Course.findById(courseIds[0]);

    const notifications = [];
    const uniqueUsers = new Map();

    for (const enrollment of enrollments) {
      if (!enrollment.userId || uniqueUsers.has(enrollment.userId._id.toString())) continue;
      uniqueUsers.set(enrollment.userId._id.toString(), enrollment.userId);
    }

    for (const [userId, user] of uniqueUsers) {
      const notification = await Notification.createLiveSessionNotification(
        userId, session, course, batch
      );
      notifications.push({ notification, user });
    }

    for (const { notification, user } of notifications) {
      if (notification.channels.email) {
        sendEmailNotification(user, notification);
      }
    }

    console.log(`Created ${notifications.length} notifications for session: ${session.topic}`);
    return notifications.length;
  } catch (error) {
    console.error('Error notifying enrolled students:', error);
    throw error;
  }
};

exports.getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const query = { userId };
    if (unreadOnly === 'true') query.read = false;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.getUnreadCount(userId);

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.getUnreadCount(req.user.id);
    res.json({ success: true, data: { unreadCount } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get unread count' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to mark as read' });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.markAllRead(req.user.id);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to mark all as read' });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Notification.findOneAndDelete({ _id: id, userId: req.user.id });

    if (!result) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete notification' });
  }
};

exports.notifyEnrolledStudents = notifyEnrolledStudents;
exports.sendEmailNotification = sendEmailNotification;

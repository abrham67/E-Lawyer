const cron = require('node-cron');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Case = require('../models/Case');
const CourtSession = require('../models/CourtSession');

// Runs every hour
cron.schedule('0 * * * *', async () => {
  // Find all upcoming court sessions in the next 24 hours
  const now = new Date();
  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const sessions = await CourtSession.find({
    scheduled_date: { $gte: now, $lte: soon },
    status: 'scheduled'
  });
  for (const session of sessions) {
    // Notify all participants (lawyer, client, judge, etc.)
    const userIds = [session.lawyerId, session.clientId, session.judgeId].filter(Boolean);
    for (const userId of userIds) {
      await Notification.create({
        userId,
        message: `Reminder: Court session for case ${session.caseId} is scheduled at ${session.scheduled_date}`,
        type: 'reminder'
      });
    }
  }
  // Find all case deadlines in the next 24 hours (if tracked)
  const cases = await Case.find({ deadline: { $gte: now, $lte: soon } });
  for (const c of cases) {
    await Notification.create({
      userId: c.lawyerId,
      message: `Reminder: Deadline for case ${c.title} is on ${c.deadline}`,
      type: 'reminder'
    });
  }
});

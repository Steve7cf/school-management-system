const Log = require('../models/log');

async function logEvent(eventType, user, details = {}) {
  try {
    await Log.create({
      eventType,
      user,
      details,
    });
  } catch (err) {
    console.error('Failed to log event:', err);
  }
}

module.exports = { logEvent }; 
const mongoose = require('mongoose');
const Log = require('../models/log');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/school_management', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function readRecentLogs() {
    try {
        console.log('🔍 Reading recent application logs...');
        
        const logs = await Log.find()
            .sort({ createdAt: -1 })
            .limit(20); // Get the last 20 log entries
            
        if (logs.length > 0) {
            console.log('📋 Last 20 logs:');
            logs.forEach(log => {
                console.log('---------------------------------');
                console.log(`Time: ${log.createdAt.toISOString()}`);
                console.log(`Event: ${log.eventType}`);
                console.log(`User: ${log.user}`);
                console.log(`Details: ${JSON.stringify(log.details, null, 2)}`);
            });
            console.log('---------------------------------');
        } else {
            console.log('No logs found.');
        }

    } catch (error) {
        console.error('❌ Error reading logs:', error);
    } finally {
        mongoose.connection.close();
    }
}

// Run the script
readRecentLogs(); 
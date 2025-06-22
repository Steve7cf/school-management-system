const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/school_management', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const Teacher = require('../models/teacher');

async function createTestTeacher() {
    try {
        console.log('👨‍🏫 Creating Test Teacher Account...\n');

        // Check if test teacher already exists
        const existingTeacher = await Teacher.findOne({ email: 'test.teacher@school.com' });
        if (existingTeacher) {
            console.log('✅ Test teacher already exists');
            console.log(`   - Name: ${existingTeacher.firstName} ${existingTeacher.lastName}`);
            console.log(`   - Email: ${existingTeacher.email}`);
            console.log(`   - Teacher ID: ${existingTeacher.teacherId || 'None'}`);
            console.log(`   - Role: ${existingTeacher.role}`);
            return;
        }

        // Create new test teacher
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('testpassword123', salt);

        const newTeacher = new Teacher({
            firstName: 'Test',
            lastName: 'Teacher',
            email: 'test.teacher@school.com',
            password: hashedPassword,
            role: 'teacher',
            subjects: []
        });

        await newTeacher.save();
        console.log('✅ Test teacher created successfully');
        console.log(`   - Name: ${newTeacher.firstName} ${newTeacher.lastName}`);
        console.log(`   - Email: ${newTeacher.email}`);
        console.log(`   - Password: testpassword123`);
        console.log(`   - Role: ${newTeacher.role}`);

        console.log('\n🎉 Test teacher account ready for testing!');

    } catch (error) {
        console.error('❌ Error creating test teacher:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

// Run the script
createTestTeacher(); 
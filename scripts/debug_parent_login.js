const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Parent = require('./models/parent');
const Student = require('./models/student');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/school_management', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

async function debugParentLogin() {
    try {
        console.log('=== Parent Login Debug ===\n');
        
        // Wait for connection
        await mongoose.connection.asPromise();
        console.log('Connected to MongoDB\n');
        
        // 1. Check if there are any parent accounts in the database
        const parents = await Parent.find({});
        console.log(`Found ${parents.length} parent accounts in database:`);
        
        if (parents.length === 0) {
            console.log('No parent accounts found. You need to register a parent first.');
            return;
        }
        
        parents.forEach((parent, index) => {
            console.log(`${index + 1}. Email: ${parent.email}, Name: ${parent.firstName} ${parent.lastName}, StudentId: ${parent.studentId}`);
        });
        
        // 2. Check if the student exists for each parent
        console.log('\n=== Checking Student Links ===');
        for (const parent of parents) {
            const student = await Student.findOne({ studentId: parent.studentId });
            if (student) {
                console.log(`✓ Parent ${parent.email} is linked to student ${parent.studentId} (${student.firstName} ${student.lastName})`);
            } else {
                console.log(`✗ Parent ${parent.email} is linked to non-existent student ${parent.studentId}`);
            }
        }
        
        // 3. Test password hashing for the first parent
        if (parents.length > 0) {
            const testParent = parents[0];
            console.log(`\n=== Testing Password for ${testParent.email} ===`);
            
            // Test with a simple password
            const testPassword = 'password123';
            const isMatch = await bcrypt.compare(testPassword, testParent.password);
            console.log(`Password 'password123' matches: ${isMatch}`);
            
            // Show password hash info
            console.log(`Password hash length: ${testParent.password.length}`);
            console.log(`Password hash starts with: ${testParent.password.substring(0, 10)}...`);
        }
        
        // 4. Check for any duplicate emails
        console.log('\n=== Checking for Duplicate Emails ===');
        const emailCounts = {};
        parents.forEach(parent => {
            emailCounts[parent.email] = (emailCounts[parent.email] || 0) + 1;
        });
        
        const duplicates = Object.entries(emailCounts).filter(([email, count]) => count > 1);
        if (duplicates.length > 0) {
            console.log('Found duplicate emails:');
            duplicates.forEach(([email, count]) => {
                console.log(`- ${email}: ${count} accounts`);
            });
        } else {
            console.log('No duplicate emails found.');
        }
        
    } catch (error) {
        console.error('Error during debug:', error);
    } finally {
        await mongoose.connection.close();
    }
}

// Run the debug function
debugParentLogin().then(() => {
    console.log('\n=== Debug Complete ===');
    process.exit(0);
}).catch(error => {
    console.error('Debug failed:', error);
    process.exit(1);
}); 
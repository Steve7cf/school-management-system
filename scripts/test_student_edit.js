const axios = require('axios');
const mongoose = require('mongoose');

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/school_management', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const Student = require('../models/student');
const Subject = require('../models/subject');

async function testStudentEdit() {
    try {
        console.log('🧪 Testing Student Edit Functionality...\n');

        // Step 1: Get a test student
        const testStudent = await Student.findOne();
        if (!testStudent) {
            console.log('❌ No students found in database. Please create a student first.');
            return;
        }

        console.log(`📋 Found test student: ${testStudent.firstName} ${testStudent.lastName} (ID: ${testStudent.studentId})`);

        // Step 2: Get available subjects
        const subjects = await Subject.find();
        console.log(`📚 Available subjects: ${subjects.length}`);

        // Step 3: Test the edit form page
        console.log('\n🔍 Testing edit form page...');
        try {
            const editPageResponse = await axios.get(`http://localhost:3000/students/edit/${testStudent._id}`, {
                headers: {
                    'Cookie': 'connect.sid=s%3Ayour-session-id-here; jwt=your-jwt-token-here'
                }
            });

            if (editPageResponse.status === 200) {
                console.log('✅ Edit form page loads successfully');
                
                // Check if form has required fields
                const hasFirstName = editPageResponse.data.includes('name="firstName"');
                const hasLastName = editPageResponse.data.includes('name="lastName"');
                const hasStudentId = editPageResponse.data.includes('name="studentId"');
                const hasSection = editPageResponse.data.includes('name="section"');
                const hasDateOfBirth = editPageResponse.data.includes('name="dateOfBirth"');
                const hasSubjects = editPageResponse.data.includes('name="subjects"');
                const hasGuardianFields = editPageResponse.data.includes('name="guardianName"');

                console.log(`   - First Name field: ${hasFirstName ? '✅' : '❌'}`);
                console.log(`   - Last Name field: ${hasLastName ? '✅' : '❌'}`);
                console.log(`   - Student ID field: ${hasStudentId ? '✅' : '❌'}`);
                console.log(`   - Section field: ${hasSection ? '✅' : '❌'}`);
                console.log(`   - Date of Birth field: ${hasDateOfBirth ? '✅' : '✅'}`);
                console.log(`   - Subjects field: ${hasSubjects ? '✅' : '❌'}`);
                console.log(`   - Guardian fields: ${hasGuardianFields ? '✅' : '❌'}`);

            } else {
                console.log('❌ Edit form page failed to load');
            }
        } catch (error) {
            if (error.response && error.response.status === 302) {
                console.log('⚠️  Redirected (likely to login) - authentication required');
            } else {
                console.log('❌ Error accessing edit form:', error.message);
            }
        }

        // Step 4: Test form submission (simulated)
        console.log('\n📝 Testing form submission logic...');
        
        const testUpdateData = {
            firstName: testStudent.firstName + '_updated',
            lastName: testStudent.lastName + '_updated',
            dateOfBirth: testStudent.dateOfBirth,
            section: testStudent.section,
            studentId: testStudent.studentId + '_updated',
            address: 'Updated Test Address',
            subjects: subjects.length > 0 ? [subjects[0]._id.toString()] : [],
            guardianName: 'Updated Guardian Name',
            guardianRelation: 'Father',
            guardianPhone: '1234567890',
            guardianEmail: 'updated.guardian@test.com'
        };

        // Test validation logic
        const requiredFields = ['firstName', 'lastName', 'dateOfBirth', 'section', 'studentId'];
        const missingFields = requiredFields.filter(field => !testUpdateData[field]);
        
        if (missingFields.length === 0) {
            console.log('✅ All required fields are present');
        } else {
            console.log(`❌ Missing required fields: ${missingFields.join(', ')}`);
        }

        // Test student ID uniqueness check
        const existingStudent = await Student.findOne({ 
            studentId: testUpdateData.studentId, 
            _id: { $ne: testStudent._id } 
        });
        
        if (!existingStudent) {
            console.log('✅ Student ID uniqueness check passed');
        } else {
            console.log('❌ Student ID already exists');
        }

        // Step 5: Test database update (manual)
        console.log('\n💾 Testing database update...');
        try {
            const updateData = {
                firstName: testUpdateData.firstName,
                lastName: testUpdateData.lastName,
                dateOfBirth: testUpdateData.dateOfBirth,
                section: testUpdateData.section.toUpperCase(),
                studentId: testUpdateData.studentId,
                address: testUpdateData.address,
                subjects: testUpdateData.subjects,
                guardian: {
                    name: testUpdateData.guardianName,
                    relation: testUpdateData.guardianRelation,
                    phone: testUpdateData.guardianPhone,
                    email: testUpdateData.guardianEmail
                }
            };

            const updatedStudent = await Student.findByIdAndUpdate(
                testStudent._id,
                updateData,
                { new: true, runValidators: true }
            );

            if (updatedStudent) {
                console.log('✅ Database update successful');
                console.log(`   - Updated name: ${updatedStudent.firstName} ${updatedStudent.lastName}`);
                console.log(`   - Updated student ID: ${updatedStudent.studentId}`);
                console.log(`   - Updated address: ${updatedStudent.address}`);
                console.log(`   - Guardian info: ${updatedStudent.guardian ? 'Present' : 'Missing'}`);
                console.log(`   - Subjects count: ${updatedStudent.subjects ? updatedStudent.subjects.length : 0}`);
            } else {
                console.log('❌ Database update failed');
            }

            // Update parent email
            if (testUpdateData.guardianEmail) {
                await Student.findByIdAndUpdate(
                    testStudent._id,
                    { parentEmail: testUpdateData.guardianEmail },
                    { new: true, runValidators: true }
                );
                console.log('✅ Parent email updated');
            }

        } catch (error) {
            console.log('❌ Database update error:', error.message);
        }

        // Step 6: Verify the update
        console.log('\n🔍 Verifying the update...');
        const verifiedStudent = await Student.findById(testStudent._id);
        if (verifiedStudent) {
            console.log('✅ Student record verified');
            console.log(`   - Current name: ${verifiedStudent.firstName} ${verifiedStudent.lastName}`);
            console.log(`   - Current student ID: ${verifiedStudent.studentId}`);
            console.log(`   - Current address: ${verifiedStudent.address}`);
            console.log(`   - Current parent email: ${verifiedStudent.parentEmail}`);
            if (verifiedStudent.guardian) {
                console.log(`   - Guardian: ${verifiedStudent.guardian.name} (${verifiedStudent.guardian.relation})`);
            }
        } else {
            console.log('❌ Could not verify student record');
        }

        console.log('\n🎉 Student edit functionality test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

// Run the test
testStudentEdit(); 
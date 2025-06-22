const mongoose = require('mongoose');

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/school_management', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const Student = require('../models/student');

async function testGuardianUpdate() {
    try {
        console.log('🧪 Testing Student Guardian Update...\n');

        // Step 1: Get a test student
        const testStudent = await Student.findOne();
        if (!testStudent) {
            console.log('❌ No students found in database. Please create a student first.');
            return;
        }

        console.log(`📋 Found test student: ${testStudent.firstName} ${testStudent.lastName} (ID: ${testStudent.studentId})`);
        console.log(`📧 Current parent email: ${testStudent.parentEmail}`);
        console.log(`👥 Current guardian info:`, testStudent.guardian || 'None');

        // Step 2: Test guardian update with all fields
        console.log('\n📝 Testing guardian update with all fields...');
        
        const guardianData = {
            guardianName: 'Test Guardian Name',
            guardianRelation: 'Father',
            guardianPhone: '1234567890',
            guardianEmail: 'test.guardian@example.com'
        };

        const updateData = {
            firstName: testStudent.firstName,
            lastName: testStudent.lastName,
            dateOfBirth: testStudent.dateOfBirth,
            section: testStudent.section,
            studentId: testStudent.studentId,
            address: testStudent.address || 'Test Address',
            subjects: testStudent.subjects || [],
            guardian: {
                name: guardianData.guardianName,
                relation: guardianData.guardianRelation,
                phone: guardianData.guardianPhone,
                email: guardianData.guardianEmail
            }
        };

        const updatedStudent = await Student.findByIdAndUpdate(
            testStudent._id,
            updateData,
            { new: true, runValidators: true }
        );

        if (updatedStudent) {
            console.log('✅ Guardian update successful');
            console.log(`   - Guardian name: ${updatedStudent.guardian?.name || 'Not saved'}`);
            console.log(`   - Guardian relation: ${updatedStudent.guardian?.relation || 'Not saved'}`);
            console.log(`   - Guardian phone: ${updatedStudent.guardian?.phone || 'Not saved'}`);
            console.log(`   - Guardian email: ${updatedStudent.guardian?.email || 'Not saved'}`);
            console.log(`   - Parent email: ${updatedStudent.parentEmail}`);
        } else {
            console.log('❌ Guardian update failed');
        }

        // Step 3: Test partial guardian update
        console.log('\n📝 Testing partial guardian update...');
        
        const partialGuardianData = {
            guardianName: 'Partial Guardian',
            guardianRelation: 'Mother',
            guardianPhone: '', // Empty phone
            guardianEmail: 'partial.guardian@example.com'
        };

        const partialUpdateData = {
            guardian: {
                name: partialGuardianData.guardianName,
                relation: partialGuardianData.guardianRelation,
                phone: partialGuardianData.guardianPhone,
                email: partialGuardianData.guardianEmail
            }
        };

        const partiallyUpdatedStudent = await Student.findByIdAndUpdate(
            testStudent._id,
            partialUpdateData,
            { new: true, runValidators: true }
        );

        if (partiallyUpdatedStudent) {
            console.log('✅ Partial guardian update successful');
            console.log(`   - Guardian name: ${partiallyUpdatedStudent.guardian?.name || 'Not saved'}`);
            console.log(`   - Guardian relation: ${partiallyUpdatedStudent.guardian?.relation || 'Not saved'}`);
            console.log(`   - Guardian phone: ${partiallyUpdatedStudent.guardian?.phone || 'Empty'}`);
            console.log(`   - Guardian email: ${partiallyUpdatedStudent.guardian?.email || 'Not saved'}`);
        } else {
            console.log('❌ Partial guardian update failed');
        }

        // Step 4: Test email-only update
        console.log('\n📝 Testing email-only update...');
        
        const emailOnlyUpdateData = {
            guardian: {
                name: '',
                relation: '',
                phone: '',
                email: 'email.only@example.com'
            }
        };

        const emailOnlyUpdatedStudent = await Student.findByIdAndUpdate(
            testStudent._id,
            emailOnlyUpdateData,
            { new: true, runValidators: true }
        );

        if (emailOnlyUpdatedStudent) {
            console.log('✅ Email-only guardian update successful');
            console.log(`   - Guardian name: ${emailOnlyUpdatedStudent.guardian?.name || 'Empty'}`);
            console.log(`   - Guardian relation: ${emailOnlyUpdatedStudent.guardian?.relation || 'Empty'}`);
            console.log(`   - Guardian phone: ${emailOnlyUpdatedStudent.guardian?.phone || 'Empty'}`);
            console.log(`   - Guardian email: ${emailOnlyUpdatedStudent.guardian?.email || 'Not saved'}`);
        } else {
            console.log('❌ Email-only guardian update failed');
        }

        // Step 5: Verify final state
        console.log('\n🔍 Verifying final student state...');
        const finalStudent = await Student.findById(testStudent._id);
        if (finalStudent) {
            console.log('✅ Final verification successful');
            console.log(`   - Student: ${finalStudent.firstName} ${finalStudent.lastName}`);
            console.log(`   - Parent email: ${finalStudent.parentEmail}`);
            console.log(`   - Guardian info:`, finalStudent.guardian || 'None');
        }

        console.log('\n🎉 Guardian update test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

// Run the test
testGuardianUpdate(); 
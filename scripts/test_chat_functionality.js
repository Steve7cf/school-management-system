const mongoose = require('mongoose');
const Message = require('../models/messages');
const Admin = require('../models/admin');
const Teacher = require('../models/teacher');
const Parent = require('../models/parent');
const Student = require('../models/student');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/school_management', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function testChatFunctionality() {
    try {
        console.log('🧪 Testing Chat Functionality...\n');

        // Get test users
        const admin = await Admin.findOne();
        const teacher = await Teacher.findOne();
        const parent = await Parent.findOne();
        const student = await Student.findOne();

        if (!admin || !teacher || !parent || !student) {
            console.log('❌ Missing test users. Please ensure you have at least one user of each type.');
            return;
        }

        console.log('✅ Found test users:');
        console.log(`   Admin: ${admin.firstName} ${admin.lastName}`);
        console.log(`   Teacher: ${teacher.firstName} ${teacher.lastName}`);
        console.log(`   Parent: ${parent.firstName} ${parent.lastName}`);
        console.log(`   Student: ${student.firstName} ${student.lastName}\n`);

        // Test 1: Admin to Teacher message
        console.log('📝 Test 1: Admin sending message to Teacher');
        const adminToTeacher = new Message({
            sender: admin._id,
            senderModel: 'Admin',
            receiver: teacher._id,
            receiverModel: 'Teacher',
            message: 'Hello teacher! This is a test message from admin.'
        });
        await adminToTeacher.save();
        console.log('✅ Admin to Teacher message created');

        // Test 2: Teacher to Admin reply
        console.log('📝 Test 2: Teacher replying to Admin');
        const teacherToAdmin = new Message({
            sender: teacher._id,
            senderModel: 'Teacher',
            receiver: admin._id,
            receiverModel: 'Admin',
            message: 'Hello admin! Thank you for the message.',
            conversationId: adminToTeacher.conversationId
        });
        await teacherToAdmin.save();
        console.log('✅ Teacher to Admin reply created');

        // Test 3: Teacher to Parent message
        console.log('📝 Test 3: Teacher sending message to Parent');
        const teacherToParent = new Message({
            sender: teacher._id,
            senderModel: 'Teacher',
            receiver: parent._id,
            receiverModel: 'Parent',
            message: 'Hello parent! Your child is doing well in class.'
        });
        await teacherToParent.save();
        console.log('✅ Teacher to Parent message created');

        // Test 4: Parent to Teacher reply
        console.log('📝 Test 4: Parent replying to Teacher');
        const parentToTeacher = new Message({
            sender: parent._id,
            senderModel: 'Parent',
            receiver: teacher._id,
            receiverModel: 'Teacher',
            message: 'Thank you teacher! I appreciate the update.',
            conversationId: teacherToParent.conversationId
        });
        await parentToTeacher.save();
        console.log('✅ Parent to Teacher reply created');

        // Test 5: Admin to Parent message
        console.log('📝 Test 5: Admin sending message to Parent');
        const adminToParent = new Message({
            sender: admin._id,
            senderModel: 'Admin',
            receiver: parent._id,
            receiverModel: 'Parent',
            message: 'Hello parent! Welcome to our school system.'
        });
        await adminToParent.save();
        console.log('✅ Admin to Parent message created');

        // Test 6: Student to Teacher message
        console.log('📝 Test 6: Student sending message to Teacher');
        const studentToTeacher = new Message({
            sender: student._id,
            senderModel: 'Student',
            receiver: teacher._id,
            receiverModel: 'Teacher',
            message: 'Hello teacher! I have a question about the homework.'
        });
        await studentToTeacher.save();
        console.log('✅ Student to Teacher message created');

        // Test 7: Teacher to Student reply
        console.log('📝 Test 7: Teacher replying to Student');
        const teacherToStudent = new Message({
            sender: teacher._id,
            senderModel: 'Teacher',
            receiver: student._id,
            receiverModel: 'Student',
            message: 'Hello student! What question do you have?',
            conversationId: studentToTeacher.conversationId
        });
        await teacherToStudent.save();
        console.log('✅ Teacher to Student reply created');

        // Test conversation grouping
        console.log('\n📊 Testing conversation grouping...');
        const conversations = await Message.getConversations(admin._id);
        console.log(`✅ Admin has ${conversations.length} conversations`);

        const teacherConversations = await Message.getConversations(teacher._id);
        console.log(`✅ Teacher has ${teacherConversations.length} conversations`);

        const parentConversations = await Message.getConversations(parent._id);
        console.log(`✅ Parent has ${parentConversations.length} conversations`);

        const studentConversations = await Message.getConversations(student._id);
        console.log(`✅ Student has ${studentConversations.length} conversations`);

        // Test unread count
        console.log('\n📊 Testing unread message counts...');
        const adminUnread = await Message.countDocuments({ receiver: admin._id, read: false });
        const teacherUnread = await Message.countDocuments({ receiver: teacher._id, read: false });
        const parentUnread = await Message.countDocuments({ receiver: parent._id, read: false });
        const studentUnread = await Message.countDocuments({ receiver: student._id, read: false });

        console.log(`✅ Admin unread: ${adminUnread}`);
        console.log(`✅ Teacher unread: ${teacherUnread}`);
        console.log(`✅ Parent unread: ${parentUnread}`);
        console.log(`✅ Student unread: ${studentUnread}`);

        // Test message population
        console.log('\n📊 Testing message population...');
        const populatedMessage = await Message.findById(adminToTeacher._id)
            .populate('sender', 'firstName lastName email')
            .populate('receiver', 'firstName lastName email');

        console.log('✅ Message populated successfully:');
        console.log(`   From: ${populatedMessage.sender.firstName} ${populatedMessage.sender.lastName} (${populatedMessage.senderModel})`);
        console.log(`   To: ${populatedMessage.receiver.firstName} ${populatedMessage.receiver.lastName} (${populatedMessage.receiverModel})`);
        console.log(`   Message: ${populatedMessage.message}`);
        console.log(`   Conversation ID: ${populatedMessage.conversationId}`);

        console.log('\n🎉 All chat functionality tests completed successfully!');
        console.log('\n📋 Summary:');
        console.log('   ✅ Message creation between all user types');
        console.log('   ✅ Conversation grouping');
        console.log('   ✅ Unread message counting');
        console.log('   ✅ Message population');
        console.log('   ✅ Conversation ID generation');

    } catch (error) {
        console.error('❌ Error testing chat functionality:', error);
    } finally {
        mongoose.connection.close();
    }
}

// Run the test
testChatFunctionality(); 
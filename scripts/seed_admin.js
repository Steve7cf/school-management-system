require("dotenv").config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('../models/admin');

// MongoDB connection string from .env file
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management';

// Admin data
const adminData = {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@school.com',
    password: 'admin123', // This will be hashed
    role: 'admin',
    avatar: '/images/user.png'
};

async function seedAdmin() {
    try {
        // Connect to MongoDB using connection string from .env
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management');
        console.log('✅ Connected to MongoDB using .env configuration');
        console.log('🔗 Database:', MONGODB_URI.split('@')[1]?.split('/')[0] || 'local database');

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email: adminData.email });
        if (existingAdmin) {
            console.log('⚠️  Admin already exists with email:', adminData.email);
            console.log('🆔 Admin ID:', existingAdmin._id);
            return;
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminData.password, salt);

        // Create new admin
        const newAdmin = new Admin({
            ...adminData,
            password: hashedPassword
        });

        await newAdmin.save();
        console.log('✅ Admin created successfully!');
        console.log('📧 Email:', adminData.email);
        console.log('🔑 Password:', adminData.password);
        console.log('🆔 Admin ID:', newAdmin._id);

    } catch (error) {
        console.error('❌ Error seeding admin:', error);
        console.error('🔍 Error details:', error.message);
    } finally {
        // Close the connection
        await mongoose.connection.close();
        console.log('🔌 MongoDB connection closed');
    }
}

// Run the seeding function
seedAdmin(); 
const Admin = require('../models/admin');
const Teacher = require('../models/teacher');
const Student = require('../models/student');
const Parent = require('../models/parent');
const bcrypt = require('bcrypt');
const { logEvent } = require('../services/logService');
const fs = require('fs');
const path = require('path');

// Render profile page
const getProfile = async (req, res) => {
    try {
        const user = req.session.user;
        let profile;
        let details = {};

        switch (user.role) {
            case 'student':
                profile = await Student.findById(user.id).populate('subjects');
                break;
            case 'teacher':
                profile = await Teacher.findById(user.id).populate('subjects');
                break;
            case 'admin':
                profile = await Admin.findById(user.id);
                break;
            case 'parent':
                profile = await Parent.findById(user.id);
                details.student = await Student.findOne({ studentId: profile.studentId });
                break;
            default:
                return res.status(400).send("Unknown user role");
        }

        if (!profile) {
            req.flash('info', ['Profile not found.', 'danger']);
            return res.redirect('/dashboard');
        }

        res.render('pages/profile/index', {
            title: 'My Profile',
            user: req.session.user,
            profile,
            details,
            info: req.flash('info'),
            layout: false
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).send("Error loading profile page.");
    }
};

// Update profile information
const updateProfile = async (req, res) => {
    try {
        const { id, role } = req.session.user;
        let Model;
        switch(role) {
            case 'admin': Model = Admin; break;
            case 'teacher': Model = Teacher; break;
            case 'student': Model = Student; break;
            case 'parent': Model = Parent; break;
        }
        
        await Model.findByIdAndUpdate(id, req.body, { new: true });
        await logEvent('profile_update', id, { role });
        req.flash('info', ['Profile updated successfully', 'success']);
        res.redirect('/profile');
    } catch (error) {
        console.error(error);
        req.flash('info', ['Error updating profile', 'danger']);
        res.redirect('/profile');
    }
};

// Change password
const changePassword = async (req, res) => {
    try {
        const { id, role } = req.session.user;
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (newPassword !== confirmPassword) {
            req.flash('info', ['New passwords do not match', 'danger']);
            return res.redirect('/profile');
        }

        let Model;
        switch(role) {
            case 'admin': Model = Admin; break;
            case 'teacher': Model = Teacher; break;
            case 'student': Model = Student; break;
            case 'parent': Model = Parent; break;
        }

        const user = await Model.findById(id);
        const isMatch = await bcrypt.compare(currentPassword, user.password);

        if (!isMatch) {
            req.flash('info', ['Incorrect current password', 'danger']);
            return res.redirect('/profile');
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        user.password = hashedPassword;
        await user.save();

        await logEvent('password_change', id, { role });
        req.flash('info', ['Password changed successfully', 'success']);
        res.redirect('/profile');
    } catch (error) {
        console.error(error);
        req.flash('info', ['Error changing password', 'danger']);
        res.redirect('/profile');
    }
};

// Update avatar
const updateAvatar = async (req, res) => {
    try {
        const { id, role } = req.session.user;

        if (!req.file) {
             return res.status(400).json({ success: false, message: 'No file uploaded or invalid file type.' });
        }

        if (!['admin', 'teacher', 'parent'].includes(role)) {
            return res.status(403).json({ success: false, message: 'Permission denied.' });
        }
        
        let Model;
        switch(role) {
            case 'admin': Model = Admin; break;
            case 'teacher': Model = Teacher; break;
            case 'parent': Model = Parent; break;
        }
        const user = await Model.findById(id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Delete old avatar if it's not the default one and exists
        if (user.avatar && !user.avatar.includes('_avatar.png') && !user.avatar.includes('user.png')) {
            const oldAvatarPath = path.join(__dirname, '..', 'public', user.avatar);
            if (fs.existsSync(oldAvatarPath)) {
                fs.unlink(oldAvatarPath, (err) => {
                    if (err) console.error("Error deleting old avatar:", err);
                });
            }
        }
        
        // Ensure the uploads directory exists
        const uploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'avatars');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        const newAvatarPath = '/uploads/avatars/' + req.file.filename;
        user.avatar = newAvatarPath;
        await user.save();
        
        await logEvent('avatar_update', id, { role });
        
        // Update session
        req.session.user.avatar = newAvatarPath;
        req.session.save();

        res.json({ success: true, newAvatarPath });
    } catch (error) {
        console.error('Avatar update error:', error);
        res.status(500).json({ success: false, message: 'Server error during avatar upload.' });
    }
};

// Delete account
const deleteAccount = async (req, res) => {
    try {
        const { id, role } = req.session.user;
        const { password } = req.body;
        
        let Model;
        switch(role) {
            case 'admin': Model = Admin; break;
            case 'teacher': Model = Teacher; break;
            case 'student': Model = Student; break;
            case 'parent': Model = Parent; break;
        }
        
        const user = await Model.findById(id);
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            req.flash('info', ['Incorrect password. Account not deleted.', 'danger']);
            return res.redirect('/profile');
        }

        await Model.findByIdAndDelete(id);

        // Special logic for student/parent deletion
        if (role === 'student') {
            const studentCount = await Student.countDocuments({ parentEmail: user.parentEmail });
            if (studentCount === 0) {
                await Parent.deleteOne({ email: user.parentEmail });
                await logEvent('parent_auto_deleted', user.parentEmail, { reason: 'last child deleted' });
            }
        }
        
        await logEvent('account_deleted', id, { role });
        
        req.session.destroy(err => {
            if (err) {
                return res.redirect('/dashboard');
            }
            res.clearCookie('connect.sid');
            res.redirect('/login');
        });

    } catch (error) {
        console.error(error);
        req.flash('info', ['Error deleting account', 'danger']);
        res.redirect('/profile');
    }
};

module.exports = {
    getProfile,
    updateProfile,
    changePassword,
    updateAvatar,
    deleteAccount
}; 
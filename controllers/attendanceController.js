const Attendance = require('../models/Attendance');
const Student = require('../models/student');

const viewStudentAttendance = async (req, res) => {
    try {
        const student = await Student.findById(req.session.user.id);
        if (!student) {
            return res.status(404).send('Student not found');
        }

        const attendanceRecords = await Attendance.find({ studentId: student._id })
            .populate('subjectId')
            .sort({ date: -1 });

        // Calculate attendance rate
        let attendanceRate = 0;
        if (attendanceRecords.length > 0) {
            const presentCount = attendanceRecords.filter(record => record.status === 'Present').length;
            attendanceRate = Math.round((presentCount / attendanceRecords.length) * 100);
        }

        res.render('pages/attendance/student', {
            title: `My Attendance`,
            user: req.session.user,
            student,
            attendanceRecords,
            attendanceRate,
            layout: false,
        });
    } catch (error) {
        console.error('Error fetching student attendance:', error);
        res.status(500).send('Server error');
    }
};

exports.getStudentAttendance = async (req, res) => {
    try {
        const student = await Student.findById(req.params.studentId);
        const attendance = await Attendance.find({ studentId: req.params.studentId }).populate('subject');
        res.render('pages/attendance/student', {
            title: 'Student Attendance',
            student,
            attendance,
            layout: false
        });
    } catch (error) {
        console.error('Error fetching student attendance:', error);
        res.status(500).send('Error loading attendance page.');
    }
};

module.exports = {
    viewStudentAttendance
}; 
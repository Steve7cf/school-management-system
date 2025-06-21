const fs = require('fs');
const path = require('path');

const routesPath = path.join(__dirname, 'routes', 'routes.js');
let routesContent = fs.readFileSync(routesPath, 'utf8');

// Find the results/add route and replace it
const oldRoute = `router.get('/results/add', isAdminOrTeacher, async (req, res) => {
    try {
        const students = await Student.find().sort({ firstName: 1, lastName: 1 });
        console.log('Fetched students:', students.length, students[0]);
        const exams = await Exam.find().populate('subject').sort({ date: -1 });
        const classes = await Class.find().sort({ gradeLevel: 1, section: 1 });
        console.log('Fetched exams:', exams.length);
        if (exams.length > 0) {
            console.log('First exam:', {
                _id: exams[0]._id,
                title: exams[0].title,
                type: exams[0].type,
                subject: exams[0].subject,
                date: exams[0].date
            });
        }
        res.render('pages/results/add', {
            title: 'Add Result',
            students,
            exams,
            classes,
            user: req.session.user,
            info: req.flash('info'),
            errors: [],
            layout: false
        });
    } catch (error) {
        console.error(error);
        console.error("Error loading results page:", error);
        req.flash('info', ['An error occurred while loading the page.', 'danger']);
        res.redirect('/dashboard');
    }
});`;

const newRoute = `router.get('/results/add', isAdminOrTeacher, async (req, res) => {
    try {
        let students = [];
        let exams = [];
        let classes = [];
        
        if (req.session.user.role === 'teacher') {
            // For teachers: only show their assigned classes, subjects, and students
            const teacher = await Teacher.findOne({ teacherId: req.session.user.teacherId }).populate('subjects');
            
            if (!teacher) {
                req.flash('info', ['Could not find your teacher profile.', 'danger']);
                return res.redirect('/dashboard');
            }
            
            // Get teacher's assigned classes
            const assignedClasses = teacher.assignedClasses || [];
            classes = assignedClasses.map(c => ({ gradeLevel: c.gradeLevel, section: c.section }));
            
            // Get students from teacher's assigned classes
            if (assignedClasses.length > 0) {
                const orConditions = assignedClasses.map(c => ({
                    gradeLevel: c.gradeLevel.toString(),
                    section: c.section
                }));
                students = await Student.find({ $or: orConditions }).sort({ firstName: 1, lastName: 1 });
            }
            
            // Get exams for teacher's subjects
            const teacherSubjectIds = teacher.subjects ? teacher.subjects.map(s => s._id) : [];
            if (teacherSubjectIds.length > 0) {
                exams = await Exam.find({ 
                    subject: { $in: teacherSubjectIds },
                    teacherId: teacher._id 
                }).populate('subject').sort({ date: -1 });
            }
            
            console.log('Teacher data:', {
                teacherId: teacher.teacherId,
                assignedClasses: assignedClasses.length,
                subjects: teacherSubjectIds.length,
                students: students.length,
                exams: exams.length
            });
            
        } else if (req.session.user.role === 'admin') {
            // For admins: show all data
            students = await Student.find().sort({ firstName: 1, lastName: 1 });
            exams = await Exam.find().populate('subject').sort({ date: -1 });
            classes = await Class.find().sort({ gradeLevel: 1, section: 1 });
        }
        
        console.log('Fetched students:', students.length);
        console.log('Fetched exams:', exams.length);
        if (exams.length > 0) {
            console.log('First exam:', {
                _id: exams[0]._id,
                title: exams[0].title,
                type: exams[0].type,
                subject: exams[0].subject ? exams[0].subject.name : 'No subject',
                date: exams[0].date
            });
        }
        
        res.render('pages/results/add', {
            title: 'Add Result',
            students,
            exams,
            classes,
            user: req.session.user,
            info: req.flash('info'),
            errors: [],
            layout: false
        });
    } catch (error) {
        console.error(error);
        console.error("Error loading results page:", error);
        req.flash('info', ['An error occurred while loading the page.', 'danger']);
        res.redirect('/dashboard');
    }
});`;

routesContent = routesContent.replace(oldRoute, newRoute);

fs.writeFileSync(routesPath, routesContent, 'utf8');
console.log('Results route updated successfully!'); 
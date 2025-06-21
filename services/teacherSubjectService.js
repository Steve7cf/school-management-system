const Teacher = require('../models/teacher');
const Subject = require('../models/Subject');

class TeacherSubjectService {
  /**
   * Assign a subject to a teacher
   * @param {string} teacherId - Teacher's ID
   * @param {string} subjectId - Subject's ID
   * @returns {Promise<Object>} - Result object with success status and message
   */
  static async assignSubjectToTeacher(teacherId, subjectId) {
    try {
      const teacher = await Teacher.findById(teacherId);
      if (!teacher) {
        return { success: false, message: 'Teacher not found' };
      }

      const subject = await Subject.findById(subjectId);
      if (!subject) {
        return { success: false, message: 'Subject not found' };
      }

      // Check if teacher already has 3 subjects
      if (teacher.subjects.length >= 3) {
        return { success: false, message: 'Teacher cannot have more than 3 subjects' };
      }

      // Check if subject is already assigned to this teacher
      if (teacher.subjects.includes(subjectId)) {
        return { success: false, message: 'Subject is already assigned to this teacher' };
      }

      // Use the teacher's addSubject method
      await teacher.addSubject(subjectId);

      return { 
        success: true, 
        message: `Subject ${subject.name} assigned to ${teacher.firstName} ${teacher.lastName}` 
      };
    } catch (error) {
      console.error('Error assigning subject to teacher:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Remove a subject from a teacher
   * @param {string} teacherId - Teacher's ID
   * @param {string} subjectId - Subject's ID
   * @returns {Promise<Object>} - Result object with success status and message
   */
  static async removeSubjectFromTeacher(teacherId, subjectId) {
    try {
      const teacher = await Teacher.findById(teacherId);
      if (!teacher) {
        return { success: false, message: 'Teacher not found' };
      }

      const subject = await Subject.findById(subjectId);
      if (!subject) {
        return { success: false, message: 'Subject not found' };
      }

      // Check if subject is assigned to this teacher
      if (!teacher.subjects.includes(subjectId)) {
        return { success: false, message: 'Subject is not assigned to this teacher' };
      }

      // Use the teacher's removeSubject method
      await teacher.removeSubject(subjectId);

      return { 
        success: true, 
        message: `Subject ${subject.name} removed from ${teacher.firstName} ${teacher.lastName}` 
      };
    } catch (error) {
      console.error('Error removing subject from teacher:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get all subjects for a teacher
   * @param {string} teacherId - Teacher's ID
   * @returns {Promise<Array>} - Array of subjects
   */
  static async getTeacherSubjects(teacherId) {
    try {
      const teacher = await Teacher.findById(teacherId).populate('subjects');
      return teacher ? teacher.subjects : [];
    } catch (error) {
      console.error('Error getting teacher subjects:', error);
      return [];
    }
  }

  /**
   * Get all teachers for a subject
   * @param {string} subjectId - Subject's ID
   * @returns {Promise<Array>} - Array of teachers
   */
  static async getSubjectTeachers(subjectId) {
    try {
      const teachers = await Teacher.find({ subjects: subjectId }).populate('subjects');
      return teachers;
    } catch (error) {
      console.error('Error getting subject teachers:', error);
      return [];
    }
  }

  /**
   * Get all available subjects (not assigned to any teacher)
   * @returns {Promise<Array>} - Array of unassigned subjects
   */
  static async getUnassignedSubjects() {
    try {
      const subjects = await Subject.find({ teacherId: null, isActive: true });
      return subjects;
    } catch (error) {
      console.error('Error getting unassigned subjects:', error);
      return [];
    }
  }

  /**
   * Get all teachers with available slots (less than 3 subjects)
   * @returns {Promise<Array>} - Array of teachers with available slots
   */
  static async getTeachersWithAvailableSlots() {
    try {
      const teachers = await Teacher.find({
        $expr: { $lt: [{ $size: "$subjects" }, 3] }
      }).populate('subjects');
      return teachers;
    } catch (error) {
      console.error('Error getting teachers with available slots:', error);
      return [];
    }
  }

  /**
   * Validate teacher-subject relationship integrity
   * @returns {Promise<Object>} - Validation results
   */
  static async validateRelationships() {
    try {
      const teachers = await Teacher.find().populate('subjects');
      const subjects = await Subject.find().populate('teacherId');
      
      const issues = {
        teachersWithTooManySubjects: [],
        subjectsWithInvalidTeacher: [],
        inconsistentRelationships: [],
        orphanedReferences: []
      };

      // Check teachers with more than 3 subjects
      teachers.forEach(teacher => {
        if (teacher.subjects.length > 3) {
          issues.teachersWithTooManySubjects.push({
            teacherId: teacher._id,
            teacherName: `${teacher.firstName} ${teacher.lastName}`,
            subjectCount: teacher.subjects.length
          });
        }
      });

      // Check subjects with invalid teacherId
      subjects.forEach(subject => {
        if (subject.teacherId && !teachers.find(t => t._id.equals(subject.teacherId._id))) {
          issues.subjectsWithInvalidTeacher.push({
            subjectId: subject._id,
            subjectName: subject.name,
            invalidTeacherId: subject.teacherId._id
          });
        }
      });

      // Check inconsistent relationships
      subjects.forEach(subject => {
        if (subject.teacherId) {
          const teacher = teachers.find(t => t._id.equals(subject.teacherId._id));
          if (teacher && !teacher.subjects.find(s => s._id.equals(subject._id))) {
            issues.inconsistentRelationships.push({
              subjectId: subject._id,
              subjectName: subject.name,
              teacherId: subject.teacherId._id,
              teacherName: `${subject.teacherId.firstName} ${subject.teacherId.lastName}`
            });
          }
        }
      });

      // Check orphaned references in teacher arrays
      teachers.forEach(teacher => {
        teacher.subjects.forEach(subjectRef => {
          const subject = subjects.find(s => s._id.equals(subjectRef._id));
          if (!subject) {
            issues.orphanedReferences.push({
              teacherId: teacher._id,
              teacherName: `${teacher.firstName} ${teacher.lastName}`,
              orphanedSubjectId: subjectRef._id
            });
          } else if (!subject.teacherId || !subject.teacherId._id.equals(teacher._id)) {
            issues.orphanedReferences.push({
              teacherId: teacher._id,
              teacherName: `${teacher.firstName} ${teacher.lastName}`,
              subjectId: subject._id,
              subjectName: subject.name,
              actualTeacherId: subject.teacherId ? subject.teacherId._id : null
            });
          }
        });
      });

      return {
        success: true,
        totalIssues: Object.values(issues).reduce((sum, arr) => sum + arr.length, 0),
        issues
      };
    } catch (error) {
      console.error('Error validating relationships:', error);
      return { success: false, message: error.message };
    }
  }
}

module.exports = TeacherSubjectService; 
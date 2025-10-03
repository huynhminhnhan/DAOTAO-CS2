/**
 * Grade Resource Configuration (Simplified)
 * Cấu hình resource Grade cho điểm số theo kỳ học - Phiên bản đơn giản
 */
import { Grade } from '../backend/database';

const GradeResource = {
  resource: Grade,
  options: {
    parent: {
      name: 'Học Tập',
      icon: 'Book'
    },
    id: 'Grade',
    listProperties: [
      'id',
      'student.name',
      'classSubject.class.name',
      'classSubject.subject.name',
      'semester',
      'academicYear',
      'txScore',
      'dkScore', 
      'finalScore',
      'tbmhScore',
      'letterGrade',
      'isPassed'
    ],
    showProperties: [
      'id',
      'student.name',
      'student.studentCode',
      'classSubject.class.name',
      'classSubject.subject.name',
      'semester',
      'academicYear',
      'txScore',
      'dkScore',
      'finalScore',
      'tbktScore',
      'tbmhScore',
      'letterGrade',
      'isPassed',
      'retakeCount',
      'isRetake',
      'notes',
      'createdAt',
      'updatedAt'
    ],
    editProperties: [
      'studentId',
      'classSubjectId',
      'semester',
      'academicYear',
      'txScore',
      'dkScore',
      'finalScore',
      'tbktScore',
      'tbmhScore',
      'isRetake',
      'notes'
    ],
    filterProperties: [
      'studentId',
      'classSubjectId',
      'semester',
      'academicYear',
      'letterGrade',
      'isPassed',
      'isRetake'
    ],
    properties: {
      'id': {
        isVisible: { list: true, show: true, edit: false, filter: false }
      },
      'studentId': {
        reference: 'Student',
        isTitle: false
      },
      'classSubjectId': {
        reference: 'ClassSubject',
        isTitle: false
      },
      'semester': {
        availableValues: [
          { value: 'HK1', label: 'Học kỳ 1' },
          { value: 'HK2', label: 'Học kỳ 2' },
          { value: 'HK3', label: 'Học kỳ 3' }
        ]
      },
      'txScore': {
        type: 'float',
        validate: {
          min: 0,
          max: 10
        }
      },
      'dkScore': {
        type: 'float', 
        validate: {
          min: 0,
          max: 10
        }
      },
      'finalScore': {
        type: 'float',
        validate: {
          min: 0,
          max: 10
        }
      },
      'tbktScore': {
        type: 'float',
        isVisible: { list: false, show: true, edit: true, filter: false }
      },
      'tbmhScore': {
        type: 'float',
        isVisible: { list: true, show: true, edit: true, filter: false }
      },
      'letterGrade': {
        isVisible: { list: true, show: true, edit: false, filter: true },
        availableValues: [
          { value: 'A+', label: 'A+ (9.5-10)' },
          { value: 'A', label: 'A (8.5-9.4)' },
          { value: 'B+', label: 'B+ (8.0-8.4)' },
          { value: 'B', label: 'B (7.0-7.9)' },
          { value: 'C+', label: 'C+ (6.5-6.9)' },
          { value: 'C', label: 'C (5.5-6.4)' },
          { value: 'D+', label: 'D+ (5.0-5.4)' },
          { value: 'D', label: 'D (4.0-4.9)' },
          { value: 'F', label: 'F (0-3.9)' }
        ]
      },
      'isPassed': {
        type: 'boolean',
        isVisible: { list: true, show: true, edit: false, filter: true }
      },
      'retakeCount': {
        type: 'number',
        isVisible: { list: false, show: true, edit: false, filter: false }
      },
      'isRetake': {
        type: 'boolean'
      },
      'notes': {
        type: 'textarea'
      },
      'createdAt': {
        isVisible: { list: false, show: true, edit: false, filter: false }
      },
      'updatedAt': {
        isVisible: { list: false, show: true, edit: false, filter: false }
      }
    }
  }
};

export default GradeResource;

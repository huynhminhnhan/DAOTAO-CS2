/**
 * const SubjectResource = {
  resource: Subject,
  options: {
    id: 'subjects',
    titleProperty: 'Môn học',
    navigation: {
      name: 'Môn học',
      icon: 'Book'
    },
    parent: {
      name: 'Quản lý Môn học',
      icon: 'Book'
    }, Resource Configuration
 * Cấu hình resource Subject theo chuẩn AdminJS
 */

import { Subject } from '../backend/database/index.js';

const SubjectResource = {
  resource: Subject,
  options: {
    parent: {
      name: 'Quản lý Môn học',
      icon: 'Book'
    },
    actions: {
      list: { isAccessible: ({ currentAdmin }) => currentAdmin?.role !== 'teacher' },
      show: { isAccessible: ({ currentAdmin }) => currentAdmin?.role !== 'teacher' },
      new: { isAccessible: ({ currentAdmin }) => currentAdmin?.role !== 'teacher' },
      edit: { isAccessible: ({ currentAdmin }) => currentAdmin?.role !== 'teacher' },
      delete: { isAccessible: ({ currentAdmin }) => currentAdmin?.role !== 'teacher' }
    },
    listProperties: ['id', 'subjectCode', 'subjectName', 'credits', 'category', 'isRequired'],
    properties: {
      subjectCode: { isTitle: true, isRequired: true },
      subjectName: { isRequired: true },
      credits: { isRequired: true, type: 'number', props: { min: 1, max: 10 } },
      isRequired: { type: 'boolean' }
    }
  }
};

export default SubjectResource;

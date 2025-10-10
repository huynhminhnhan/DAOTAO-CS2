import { Cohort, Semester } from '../database/index.js';

const AcademicRepository = {
  async findAllCohorts(options = {}) {
    return Cohort.findAll(options);
  },

  async findAllSemesters(options = {}) {
    return Semester.findAll(options);
  },

  async findSemestersByCohort(cohortId, options = {}) {
    return Semester.findAll({ where: { cohortId }, ...options });
  }
};

export default AcademicRepository;

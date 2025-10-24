import AcademicRepository from '../repositories/academic.repository.js';

const AcademicService = {
  async listCohorts() {
    const cohorts = await AcademicRepository.findAllCohorts({ order: [['startDate', 'DESC'], ['name', 'ASC']] });
    return cohorts;
  },

  async listSemesters() {
    const semesters = await AcademicRepository.findAllSemesters({
      include: [{ model: (await import('../database/index.js')).Cohort, as: 'cohort', attributes: ['cohortId', 'name'] }],
      order: [['cohortId', 'ASC'], ['order', 'ASC']]
    });
    return semesters;
  },

  async listSemestersByCohort(cohortId) {
    const semesters = await AcademicRepository.findSemestersByCohort(cohortId, {
      include: [{ model: (await import('../database/index.js')).Cohort, as: 'cohort', attributes: ['cohortId', 'name'] }],
      order: [['order', 'ASC']]
    });
    return semesters;
  }
};

export default AcademicService;

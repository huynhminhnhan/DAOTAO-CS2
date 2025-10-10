'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Transaction để đảm bảo tính toàn vẹn dữ liệu
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 1. Backup existing data
      const grades = await queryInterface.sequelize.query(
        'SELECT id, txScore, dkScore1, dkScore2, dkScore3 FROM grades WHERE (txScore IS NOT NULL OR dkScore1 IS NOT NULL OR dkScore2 IS NOT NULL OR dkScore3 IS NOT NULL)',
        { type: queryInterface.sequelize.QueryTypes.SELECT, transaction }
      );

      // 2. Add temporary JSON columns
      await queryInterface.addColumn('grades', 'txScore_temp', {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Temporary column for txScore JSON migration'
      }, { transaction });

      await queryInterface.addColumn('grades', 'dkScore_temp', {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Temporary column for dkScore JSON migration'
      }, { transaction });

      // 3. Migrate existing data to JSON format
      for (let grade of grades) {
        let txJson = null;
        let dkJson = null;

        // Convert txScore to JSON if exists
        if (grade.txScore !== null) {
          txJson = { tx1: parseFloat(grade.txScore) };
        }

        // Convert dkScores to JSON if any exists
        const dkScores = {};
        if (grade.dkScore1 !== null) dkScores.dk1 = parseFloat(grade.dkScore1);
        if (grade.dkScore2 !== null) dkScores.dk2 = parseFloat(grade.dkScore2);
        if (grade.dkScore3 !== null) dkScores.dk3 = parseFloat(grade.dkScore3);
        
        if (Object.keys(dkScores).length > 0) {
          dkJson = dkScores;
        }

        // Update the record
        await queryInterface.sequelize.query(
          'UPDATE grades SET txScore_temp = ?, dkScore_temp = ? WHERE id = ?',
          { 
            replacements: [
              txJson ? JSON.stringify(txJson) : null,
              dkJson ? JSON.stringify(dkJson) : null,
              grade.id
            ],
            transaction 
          }
        );
      }

      // 4. Drop old columns
      await queryInterface.removeColumn('grades', 'txScore', { transaction });
      await queryInterface.removeColumn('grades', 'dkScore1', { transaction });
      await queryInterface.removeColumn('grades', 'dkScore2', { transaction });
      await queryInterface.removeColumn('grades', 'dkScore3', { transaction });

      // 5. Rename temporary columns to final names
      await queryInterface.renameColumn('grades', 'txScore_temp', 'txScore', { transaction });
      await queryInterface.renameColumn('grades', 'dkScore_temp', 'dkScore', { transaction });

      // Commit transaction
      await transaction.commit();
      console.log('✅ Grade scores migration completed successfully');
      
    } catch (error) {
      // Rollback on error
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Revert back to individual columns
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 1. Get current JSON data
      const grades = await queryInterface.sequelize.query(
        'SELECT id, txScore, dkScore FROM grades WHERE (txScore IS NOT NULL OR dkScore IS NOT NULL)',
        { type: queryInterface.sequelize.QueryTypes.SELECT, transaction }
      );

      // 2. Add back old columns
      await queryInterface.addColumn('grades', 'txScore_old', {
        type: Sequelize.DECIMAL(4, 2),
        allowNull: true,
        comment: 'Điểm thường xuyên (0-10)'
      }, { transaction });

      await queryInterface.addColumn('grades', 'dkScore1', {
        type: Sequelize.DECIMAL(4, 2),
        allowNull: true,
        comment: 'Điểm định kỳ 1 (0-10)'
      }, { transaction });

      await queryInterface.addColumn('grades', 'dkScore2', {
        type: Sequelize.DECIMAL(4, 2),
        allowNull: true,
        comment: 'Điểm định kỳ 2 (0-10)'
      }, { transaction });

      await queryInterface.addColumn('grades', 'dkScore3', {
        type: Sequelize.DECIMAL(4, 2),
        allowNull: true,
        comment: 'Điểm định kỳ 3 (0-10)'
      }, { transaction });

      // 3. Convert JSON back to individual columns
      for (let grade of grades) {
        let txScore = null;
        let dkScore1 = null, dkScore2 = null, dkScore3 = null;

        // Parse txScore JSON
        if (grade.txScore) {
          try {
            const txData = typeof grade.txScore === 'string' ? JSON.parse(grade.txScore) : grade.txScore;
            if (txData.tx1) txScore = txData.tx1;
          } catch (e) {
            console.warn(`Failed to parse txScore for grade ${grade.id}:`, e);
          }
        }

        // Parse dkScore JSON
        if (grade.dkScore) {
          try {
            const dkData = typeof grade.dkScore === 'string' ? JSON.parse(grade.dkScore) : grade.dkScore;
            if (dkData.dk1) dkScore1 = dkData.dk1;
            if (dkData.dk2) dkScore2 = dkData.dk2;
            if (dkData.dk3) dkScore3 = dkData.dk3;
          } catch (e) {
            console.warn(`Failed to parse dkScore for grade ${grade.id}:`, e);
          }
        }

        // Update the record
        await queryInterface.sequelize.query(
          'UPDATE grades SET txScore_old = ?, dkScore1 = ?, dkScore2 = ?, dkScore3 = ? WHERE id = ?',
          { 
            replacements: [txScore, dkScore1, dkScore2, dkScore3, grade.id],
            transaction 
          }
        );
      }

      // 4. Drop JSON columns
      await queryInterface.removeColumn('grades', 'txScore', { transaction });
      await queryInterface.removeColumn('grades', 'dkScore', { transaction });

      // 5. Rename old column back
      await queryInterface.renameColumn('grades', 'txScore_old', 'txScore', { transaction });

      await transaction.commit();
      console.log('✅ Grade scores rollback completed successfully');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};

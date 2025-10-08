/**
 * Student Record Transcript Component
 * Component hiển thị bảng điểm cho một sinh viên cụ thể từ record
 * Based on StudentTranscriptComponent
 */
import React, { useState, useEffect } from 'react';

const StudentRecordTranscriptComponent = ({ record, resource }) => {
  const [transcriptData, setTranscriptData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Lấy studentCode từ record - AdminJS format
  const studentCode = record?.params?.studentCode || 
                     record?.record?.params?.studentCode ||
                     record?.populated?.studentCode ||
                     record?.studentCode ||
                     (record?.params && Object.keys(record.params).length > 0 ? 
                       Object.values(record.params).find(val => typeof val === 'string' && val.startsWith('SV')) : 
                       null);

  // Debug log để kiểm tra record structure
  console.log('Full record object:', record);
  console.log('Student code found:', studentCode);

  // Fetch transcript for the student - sử dụng logic giống StudentTranscriptComponent
  useEffect(() => {
    const fetchTranscript = async () => {
      if (!studentCode) {
        console.error('Cannot find studentCode in record. Full record structure:', JSON.stringify(record, null, 2));
        setError(`Không tìm thấy mã sinh viên trong record. Available keys: ${Object.keys(record || {}).join(', ')}`);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        console.log('Fetching transcript for studentCode:', studentCode);
        const response = await fetch(`/admin-api/student/${studentCode}/transcript`);
        const data = await response.json();
        console.log('Transcript response:', data);
        
        if (data.success) {
          setTranscriptData(data.data);
        } else {
          setError('Không thể tải bảng điểm: ' + data.message);
        }
      } catch (error) {
        console.error('Error fetching transcript:', error);
        setError('Lỗi kết nối API: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTranscript();
  }, [studentCode]);

  // Copy styles từ StudentTranscriptComponent
  const styles = {
    container: {
      backgroundColor: '#f9f9f9',
      minHeight: '100vh'
    },
    paper: {
      backgroundColor: 'white',
      padding: '30px',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      maxWidth: '1000px',
      margin: '0 auto'
    },
    header: {
      textAlign: 'center',
      marginBottom: '30px'
    },
    title: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#333',
      marginBottom: '20px',
      textTransform: 'uppercase'
    },
    studentInfo: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px',
      marginBottom: '30px',
      fontSize: '14px',
      lineHeight: '1.6'
    },
    infoColumn: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    infoRow: {
      display: 'flex',
    //   justifyContent: 'space-between'
    },
    label: {
      fontWeight: 'bold',
      minWidth: '120px'
    },
    loading: {
      textAlign: 'center',
      padding: '40px',
      fontSize: '16px',
      color: '#666'
    },
    error: {
      backgroundColor: '#ffebee',
      color: '#c62828',
      padding: '15px',
      borderRadius: '5px',
      marginBottom: '20px',
      border: '1px solid #ffcdd2'
    },
    semesterSection: {
      marginBottom: '30px'
    },
    semesterTitle: {
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#333',
      marginBottom: '15px',
      textAlign: 'left'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: '20px',
      fontSize: '13px',
      border: '2px solid #333'
    },
    th: {
      backgroundColor: '#f5f5f5',
      border: '1px solid #333',
      padding: '8px 4px',
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: '12px',
      verticalAlign: 'middle'
    },
    td: {
      border: '1px solid #333',
      padding: '6px 4px',
      textAlign: 'center',
      verticalAlign: 'middle'
    },
    tdLeft: {
      border: '1px solid #333',
      padding: '6px 8px',
      textAlign: 'left',
      verticalAlign: 'middle'
    },
    summaryRow: {
      backgroundColor: '#f0f0f0',
      fontWeight: 'bold'
    }
  };  // Hiển thị loading

  // Helper: map numeric score to Vietnamese category (same rules as GradeService)
  const mapScoreToCategory = (score) => {
    if (score === null || score === undefined || score === '') return '';
    const s = Number(score);
    if (Number.isNaN(s)) return '';
    if (s >= 9) return 'Xuất sắc';
    if (s >= 8.0) return 'Giỏi';
    if (s >= 7.0) return 'Khá';
    if (s >= 5.0) return 'Trung bình';
    return 'Yếu';
  };
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.paper}>
          <div style={styles.loading}>
            ⏳ Đang tải bảng điểm...
          </div>
        </div>
      </div>
    );
  }

  // Hiển thị error
  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.paper}>
          <div style={styles.error}>
            ❌ {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.paper}>
        {/* Header - copy từ StudentTranscriptComponent */}
        <div style={styles.header}>
          <div style={styles.title}>
            TRƯỜNG CAO ĐẲNG CẢNH SÁT NHÂN DÂN II<br/>
            <hr />
            BẢNG ĐIỂM HỌC VIÊN
          </div>
        </div>

        {transcriptData && (
          <div>
            {/* Student Information */}
            <div style={styles.studentInfo}>
              <div style={styles.infoColumn}>
                <div style={styles.infoRow}>
                  <span style={styles.label}>Họ tên:</span>
                  <span>{transcriptData.student?.fullName || ''}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.label}>MSSV:</span>
                  <span>{transcriptData.student?.studentCode || ''}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.label}>Ngày sinh:</span>
                  <span>{transcriptData.student?.dateOfBirth || ''}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.label}>Lớp sinh hoạt:</span>
                  <span>{transcriptData.student?.className || ''}</span>
                </div>
              </div>
              <div style={styles.infoColumn}>
                <div style={styles.infoRow}>
                  <span style={styles.label}>Giới tính:</span>
                  <span>{transcriptData.student?.gender === 'male' ? 'Nam' : transcriptData.student?.gender === 'female' ? 'Nữ' : ''}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.label}>Số tín chỉ:</span>
                  <span>{transcriptData.summary?.totalCredits || 0}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.label}>Khóa tuyển:</span>
                  <span>{transcriptData.student?.cohort || ''}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.label}>Hệ đào tạo:</span>
                  <span>Chính quy</span>
                </div>
              </div>
            </div>

            {/* Grades by Semester - copy từ StudentTranscriptComponent */}
            {Object.keys(transcriptData.semesters || {}).map(semester => {
              // Tính toán số cột ĐK cần thiết dựa trên dữ liệu có sẵn
              const subjects = transcriptData.semesters[semester]?.subjects || [];
              let maxDkScores = 0;
              
              subjects.forEach(subject => {
                let dkCount = 0;
                if (subject.dkScore1) dkCount = Math.max(dkCount, 1);
                if (subject.dkScore2) dkCount = Math.max(dkCount, 2);
                if (subject.dkScore3) dkCount = Math.max(dkCount, 3);
                maxDkScores = Math.max(maxDkScores, dkCount);
              });

              return (
                <div key={semester}>
                  <div style={styles.semesterTitle}>
                    Thông tin học phần học kỳ {semester.replace('HK', '')} - Năm học {transcriptData.semesters[semester]?.academicYear || ''}
                  </div>
                  
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th} rowSpan="2">STT</th>
                        <th style={styles.th} rowSpan="2">Mã môn học</th>
                        <th style={styles.th} rowSpan="2">Tên môn học</th>
                        <th style={styles.th} rowSpan="2">Số tín chỉ</th>
                        <th style={styles.th} rowSpan="2">Điểm TX</th>
                        {/* Dynamic ĐK columns */}
                        {Array.from({length: maxDkScores}, (_, index) => (
                          <th key={`dk-${index}`} style={styles.th} rowSpan="2">
                            Điểm ĐK{maxDkScores > 1 ? ` ${index + 1}` : ''}
                          </th>
                        ))}
                        <th style={styles.th} rowSpan="2">Điểm THI</th>
                        <th style={styles.th} rowSpan="2">Điểm HP</th>
                        <th style={styles.th} rowSpan="2">Xếp loại</th>
                        <th style={styles.th} rowSpan="2">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map((subject, index) => (
                        <tr key={index}>
                          <td style={styles.td}>{index + 1}</td>
                          <td style={styles.td}>{subject.subjectCode}</td>
                          <td style={styles.tdLeft}>{subject.subjectName}</td>
                          <td style={styles.td}>{subject.credits}</td>
                          <td style={styles.td}>{subject.qtScore || subject.txScore || ''}</td>
                          {/* Dynamic ĐK score cells */}
                          {Array.from({length: maxDkScores}, (_, index) => {
                            const dkScoreField = `dkScore${index + 1}`;
                            return (
                              <td key={`dk-${index}`} style={styles.td}>
                                {subject[dkScoreField] || ''}
                              </td>
                            );
                          })}
                          <td style={styles.td}>{subject.ckScore || subject.finalScore || ''}</td>
                          <td style={styles.td}>{subject.hpScore || subject.tbmhScore || ''}</td>
                          <td style={styles.td}>{subject.letterGrade || mapScoreToCategory(subject.hpScore || subject.tbmhScore) || ''}</td>
                          <td style={styles.td}>{subject.isPassed ? 'Đạt' : 'Chưa đạt'}</td>
                        </tr>
                      ))}
                      {/* Summary row */}
                      <tr style={styles.summaryRow}>
                        <td style={styles.td} colSpan="3"><strong>Trung bình học kỳ</strong></td>
                        <td style={styles.td}><strong>{transcriptData.semesters[semester]?.totalCredits || subjects.reduce((sum, s) => sum + (s.credits || 0), 0)}</strong></td>
                        <td style={styles.td} colSpan={maxDkScores + 3}></td>
                        <td style={styles.td}><strong>{transcriptData.semesters[semester]?.semesterGPA?.toFixed(2) || ''}</strong></td>
                        <td style={styles.td}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}

        {!transcriptData && !loading && !error && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            Không có dữ liệu bảng điểm cho sinh viên này.
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentRecordTranscriptComponent;

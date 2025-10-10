import React, { useEffect, useRef } from 'react';
import flatpickr from 'flatpickr';

/**
 * Simple standalone DatePicker component using Flatpickr
 * For use in custom modals (not AdminJS resources)
 */
const SimpleDatePicker = ({ 
  selectedDate, 
  onChange, 
  placeholder = 'Chọn ngày',
  dateFormat = 'd/m/Y',
  style = {}
}) => {
  const inputRef = useRef(null);
  const fpInstanceRef = useRef(null);

  useEffect(() => {
    // Inject Flatpickr CSS
    if (typeof document !== 'undefined') {
      const id = 'flatpickr-inline-css-marker';
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = '/vendor/flatpickr/flatpickr.min.css';
        document.head.appendChild(link);
        console.log('✅ Đã inject Flatpickr CSS');
      }
    }
  }, []);

  useEffect(() => {
    if (!inputRef.current) return;

    // Vietnamese locale
    const viLocale = {
      weekdays: {
        shorthand: ['CN','T2','T3','T4','T5','T6','T7'],
        longhand: ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy']
      },
      months: {
        shorthand: ['Th1','Th2','Th3','Th4','Th5','Th6','Th7','Th8','Th9','Th10','Th11','Th12'],
        longhand: ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12']
      },
      firstDayOfWeek: 1,
      rangeSeparator: ' đến ',
      weekAbbreviation: 'Tuần',
      scrollTitle: 'Cuộn để thay đổi',
      toggleTitle: 'Nhấn để chuyển',
      time_24hr: true
    };

    // Initialize Flatpickr
    const fp = flatpickr(inputRef.current, {
      dateFormat: dateFormat,
      defaultDate: selectedDate || new Date(),
      allowInput: true,
      clickOpens: true,
      locale: viLocale,
      firstDayOfWeek: 1,
      onChange: (selectedDates) => {
        const date = selectedDates && selectedDates[0] ? selectedDates[0] : null;
        if (date && onChange) {
          onChange(date);
        }
      }
    });

    fpInstanceRef.current = fp;

    // Cleanup
    return () => {
      if (fpInstanceRef.current) {
        fpInstanceRef.current.destroy();
      }
    };
  }, [selectedDate, onChange, dateFormat]);

  return (
    <input
      ref={inputRef}
      type="text"
      placeholder={placeholder}
      style={{
        width: '100%',
        padding: '10px',
        border: '2px solid #ccc',
        borderRadius: '6px',
        fontSize: '16px',
        cursor: 'pointer',
        backgroundColor: 'white',
        boxSizing: 'border-box',
        ...style
      }}
    />
  );
};

export default SimpleDatePicker;

import React, { useEffect, useRef, useState } from 'react';
import flatpickr from 'flatpickr';

const DatePickerFlatpickr = (props) => {
  const { property, record, onChange } = props;
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const path = property.path;
  const value = record?.params?.[path] || '';
  const [fpInstance, setFpInstance] = useState(null);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      // Localize flatpickr to Vietnamese (weekday and month names, week start)
      // Explicit Vietnamese locale object as reliable fallback when bundler doesn't include l10n
      const viLocale = {
        weekdays: {
          shorthand: ['CN','Hai','Ba','Tư','Năm','Sáu','Bảy'],
          longhand: ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy']
        },
        months: {
          shorthand: ['Th1','Th2','Th3','Th4','Th5','Th6','Th7','Th8','Th9','Th10','Th11','Th12'],
          longhand: ['Tháng Một','Tháng Hai','Tháng Ba','Tháng Tư','Tháng Năm','Tháng Sáu','Tháng Bảy','Tháng Tám','Tháng Chín','Tháng Mười','Tháng Mười Một','Tháng Mười Hai']
        },
        firstDayOfWeek: 1,
        rangeSeparator: ' đến ',
        weekAbbreviation: 'Tu',
        scrollTitle: 'Cuộn để thay đổi',
        toggleTitle: 'Nhấn để chuyển',
        time_24hr: true
      };
      try {
        // Prefer the built-in l10n if available (flatpickr.l10ns.vi)
        const vi = (flatpickr && flatpickr.l10ns && flatpickr.l10ns.vi) || (window && window.flatpickr && window.flatpickr.l10ns && window.flatpickr.l10ns.vi);
        if (vi) flatpickr.localize(vi);
        else flatpickr.localize(viLocale);
      } catch (e) {
        // ignore if localization can't be applied (SSR or bundler issues)
      }

      // Ensure flatpickr CSS is present; AdminJS serves the vendor path /vendor/flatpickr
      const id = 'flatpickr-inline-css-marker';
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = '/vendor/flatpickr/flatpickr.min.css';
        document.head.appendChild(link);
      }
    }

    if (!inputRef.current) return;

    const fp = flatpickr(inputRef.current, {
      // Underlying date value in ISO (Y-m-d); show user-friendly dd/MM/yyyy via altInput
      dateFormat: 'Y-m-d',
      altInput: true,
      altFormat: 'd/m/Y',
      defaultDate: value || null,
      allowInput: true,
      static: true,
      clickOpens: false,
      position: 'below',
      appendTo: typeof document !== 'undefined' ? document.body : null,
      locale: (flatpickr && flatpickr.l10ns && flatpickr.l10ns.vi) ? flatpickr.l10ns.vi : undefined,
      firstDayOfWeek: 1,
      onChange: (selectedDates, dateStr) => {
        try {
          const d = selectedDates && selectedDates[0] ? selectedDates[0] : null;
          if (d) {
            // Build ISO date from local date parts to avoid UTC timezone shift
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const iso = `${yyyy}-${mm}-${dd}`;
            onChange(path, iso);
          } else {
            onChange(path, '');
          }
        } catch (e) {
          onChange(path, dateStr);
        }
      }
    });

    setFpInstance(fp);

    const openHandler = (e) => {
      try { fp.open(); } catch (err) {}
    };

    const onDocClick = (e) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target)) {
        try { fp.close(); } catch (err) {}
      }
    };

    const inputEl = inputRef.current;
    inputEl.addEventListener('click', openHandler);
    document.addEventListener('mousedown', onDocClick);

    return () => {
      try { inputEl.removeEventListener('click', openHandler); } catch (e) {}
      try { document.removeEventListener('mousedown', onDocClick); } catch (e) {}
      try { fp.destroy(); } catch (e) {}
      setFpInstance(null);
    };
  }, [inputRef]);

  return (
    <div ref={wrapperRef} className="flatpickr-admin-wrapper">
      {/* Render label inside component so it's visible even when AdminJS outer label is absent */}
      {property ? (
        (() => {
          // Prefer AdminJS provided label if it's not just the property path
          const propLabel = property.label;
          const propPath = property.path || '';

          const looksLikePath = (s) => !s || s === propPath || !/\s/.test(s);

          const labelMap = {
            dateOfBirth: 'Ngày sinh',
            startDate: 'Ngày bắt đầu',
            endDate: 'Ngày kết thúc'
          };

          const humanize = (s) => {
            if (!s) return '';
            const spaced = s.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ');
            return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
          };

          const display = (propLabel && !looksLikePath(propLabel))
            ? propLabel
            : (labelMap[propPath] || humanize(propLabel || propPath));

          return <label className="flatpickr-label">{display}</label>;
        })()
      ) : null}
      <div className="flatpickr-input-group">
        <input ref={inputRef} defaultValue={value} className="adminjs-input flatpickr-input" />
        <button type="button" className="flatpickr-trigger" onClick={() => fpInstance && fpInstance.open()} aria-label="Open date picker">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default DatePickerFlatpickr;

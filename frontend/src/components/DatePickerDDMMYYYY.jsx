import React, { useEffect } from 'react';
import DatePicker from 'react-datepicker';

// Avoid importing CSS at bundle-time (AdminJS bundler may not support CSS imports).
// Instead inject the stylesheet at runtime so Rollup/Esbuild won't need a CSS plugin.
const INJECTED_ID = 'react-datepicker-css';
const CDN_CSS = '/react-datepicker.css';

function getCssUrl() {
  if (typeof window === 'undefined') return CDN_CSS;
  try {
    return `${window.location.protocol}//${window.location.host}${CDN_CSS}`;
  } catch (e) {
    return CDN_CSS;
  }
}

function ensureDatepickerCss() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(INJECTED_ID)) return;
  const link = document.createElement('link');
  link.id = INJECTED_ID;
  link.rel = 'stylesheet';
  const href = getCssUrl();
  link.href = href;
  console.debug('Injecting datepicker CSS from', href);
  document.head.appendChild(link);
}

// AdminJS edit component for date fields with dd/MM/yyyy format
const DatePickerDDMMYYYY = (props) => {
  const { property, record, onChange } = props;

  useEffect(() => {
    ensureDatepickerCss();
  }, []);
  const path = property.path;

  const raw = record?.params?.[path];
  const selected = raw ? new Date(raw) : null;

  const handleChange = (date) => {
    if (!date) {
      onChange(path, '');
      return;
    }
    // store ISO date string (yyyy-mm-dd) which Sequelize/DB expects
    const iso = date.toISOString().slice(0, 10);
    onChange(path, iso);
  };

  return (
    <div>
      <DatePicker
        selected={selected}
        onChange={handleChange}
        dateFormat="dd/MM/yyyy"
        placeholderText="dd/MM/yyyy"
        className="adminjs-DatePicker"
      />
    </div>
  );
};

export default DatePickerDDMMYYYY;

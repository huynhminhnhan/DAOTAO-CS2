import React from 'react';

// AdminJS show component: render label + formatted date (dd/MM/yyyy)
const DateShowDDMMYYYY = (props) => {
  const { property, record } = props;
  
  const path = property?.path;
  const raw = record?.params?.[path];

  const formatRaw = (value) => {
    if (!value && value !== 0) return '';
    try {
      const isoMatch = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      let d;
      if (isoMatch) {
        const yyyy = parseInt(isoMatch[1], 10);
        const mm = parseInt(isoMatch[2], 10) - 1;
        const dd = parseInt(isoMatch[3], 10);
        d = new Date(Date.UTC(yyyy, mm, dd));
      } else {
        d = new Date(value);
      }
      if (isNaN(d.getTime())) return String(value);
      const dd = String(d.getUTCDate()).padStart(2, '0');
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const yyyy = d.getUTCFullYear();
      return `${dd}/${mm}/${yyyy}`;
    } catch (e) {
      return String(value);
    }
  };

  // Resolve label: property.label can be a string or a localized object
  const resolveLabel = () => {
  // Prefer description as the displayed label if present (resource editors often put human text there)
  if (property?.description) return property.description;
    // First try: label defined on the AdminJS resource metadata (props.resource.properties)
    try {
      const resProps = props?.resource?.properties;
      const resLabel = resProps?.[property?.path]?.label;
      if (resLabel) {
        if (typeof resLabel === 'string') return resLabel;
        if (typeof resLabel === 'object') {
          const locale = (props && props.currentAdmin && (props.currentAdmin.locale || props.currentAdmin.language)) || null;
          if (locale && resLabel[locale]) return resLabel[locale];
          const vals = Object.values(resLabel).filter(v => typeof v === 'string');
          if (vals.length) return vals[0];
        }
      }
    } catch (e) {
      // ignore
    }
    // Fallback: some setups expose resource.options.properties
    try {
      const resLabelOpt = props?.resource?.options?.properties?.[property?.path]?.label;
      if (resLabelOpt) {
        if (typeof resLabelOpt === 'string') return resLabelOpt;
        if (typeof resLabelOpt === 'object') {
          const locale = (props && props.currentAdmin && (props.currentAdmin.locale || props.currentAdmin.language)) || null;
          if (locale && resLabelOpt[locale]) return resLabelOpt[locale];
          const vals = Object.values(resLabelOpt).filter(v => typeof v === 'string');
          if (vals.length) return vals[0];
        }
      }
    } catch (e) {
      // ignore
    }
    const rawLabel = property?.label;
    // If label missing, try description
    if (!rawLabel) return property?.description || property?.name || '';
    if (typeof rawLabel === 'string') {
      // If AdminJS passed the raw property name as label (e.g. 'startDate'), prefer description
      if (rawLabel === property?.name || rawLabel === property?.path) {
        if (property?.description) return property.description;
      }
      return rawLabel;
    }
    if (typeof rawLabel === 'object') {
      const locale = (props && props.currentAdmin && (props.currentAdmin.locale || props.currentAdmin.language)) || null;
      if (locale && rawLabel[locale]) return rawLabel[locale];
      const vals = Object.values(rawLabel).filter(v => typeof v === 'string');
      if (vals.length) return vals[0];
    }
    // Final fallback: map common field paths to Vietnamese labels
    const PATH_LABELS = {
      startDate: 'Ngày bắt đầu',
      endDate: 'Ngày kết thúc',
      dateOfBirth: 'Ngày sinh'
    };
    return PATH_LABELS[property?.path] || property?.name || '';
  };

  const labelText = resolveLabel();

  // Render with AdminJS-like label/value layout so show page displays label
  return (
    <div className="adminjs-Property--show">
      <label className="adminjs-PropertyLabel">{labelText}</label>
      <div className="adminjs-PropertyValue">{formatRaw(raw)}</div>
    </div>
  );
};

export default DateShowDDMMYYYY;

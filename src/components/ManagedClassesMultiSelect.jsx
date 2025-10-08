import React, { useEffect, useState } from 'react';
import { ApiClient } from 'adminjs';
import { Select, Label, FormGroup } from '@adminjs/design-system';

const api = new ApiClient();

const ManagedClassesMultiSelect = (props) => {
  const { record, onChange, property } = props;
  const [options, setOptions] = useState([]);
  const [value, setValue] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
  try {
  // Prefer admin-only endpoint (served without JWT) for AdminJS components
  const endpoint = window && window.location && window.location.pathname && window.location.pathname.startsWith('/admin') ? '/admin-api/classes' : '/admin-api/student-import/classes';
  const response = await fetch(endpoint);
        const payload = await response.json();
        if (payload && payload.success && Array.isArray(payload.data)) {
          const opts = payload.data.map(c => ({ value: String(c.id || c.classId || c.cohortId), label: `${c.classCode || c.classCode} - ${c.className || c.className}` }));
          if (mounted) setOptions(opts);
          // If the record doesn't include managedClasses, try fetching assignments for this record
          if (mounted && (!record || !record.params || !record.params.managedClasses)) {
            try {
              const teacherEndpoint = '/admin-api/teacher-assignments' + (record && record.params && record.params.email ? `?email=${encodeURIComponent(record.params.email)}` : (record && record.params && record.params.id ? `?userId=${encodeURIComponent(record.params.id)}` : ''));
              const asResp = await fetch(teacherEndpoint);
              const asPayload = await asResp.json();
              if (asPayload && asPayload.success && Array.isArray(asPayload.data) && asPayload.data.length) {
                const ids = asPayload.data.map(c => String(c.id));
                // set value matching existing options
                const selected = opts.filter(o => ids.includes(o.value));
                if (selected.length) setValue(selected);
              }
            } catch (e) {
              console.error('Error fetching teacher assignments from admin-api', e);
            }
          }
        } else {
          if (mounted) setOptions([]);
        }
      } catch (err) {
        console.error('Error loading classes for multi-select', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // When options or record change, compute selected items so edit form preselects correctly
  useEffect(() => {
    if (!options || options.length === 0) return;
    const recVal = record && record.params && record.params[property.name];
    // Debug logs to help troubleshoot why preselect may not appear
    let ids = [];
    if (Array.isArray(recVal)) ids = recVal.map(String);
    else if (typeof recVal === 'string') {
      const parsed = tryParse(recVal);
      if (Array.isArray(parsed)) ids = parsed.map(String);
      else if (recVal.trim() !== '') ids = [recVal.trim()];
    }
   
    if (ids.length) {
      const selected = options.filter(o => ids.includes(o.value));
     
      setValue(selected);
    } else {
      // also support managedClassesLabels as readable labels
      const labels = record && record.params && record.params.managedClassesLabels;
      if (Array.isArray(labels) && labels.length) {
        const selected = options.filter(o => labels.includes(o.label));
        console.debug('ManagedClassesMultiSelect: selected by label =', selected);
        setValue(selected);
      }
    }
  }, [options, record, property.name]);

  const handleChange = (selected) => {
    setValue(selected || []);
    const ids = (selected || []).map(s => s.value);
  try { console.debug('ManagedClassesMultiSelect: handleChange ids =', ids); } catch (e) {}
    // AdminJS expects primitive values in payload; assign array
    onChange(property.name, ids);
  };

// small helper to try parse JSON array from string
function tryParse(v) {
  try {
    const p = JSON.parse(v);
    return Array.isArray(p) ? p.map(String) : null;
  } catch (e) { return null; }
}

  return (
    <FormGroup>
      <Label>{property.label}</Label>
      <Select
        value={value}
        options={options}
        onChange={handleChange}
        isMulti
        placeholder="Chọn các lớp..."
      />
    </FormGroup>
  );
};

export default ManagedClassesMultiSelect;

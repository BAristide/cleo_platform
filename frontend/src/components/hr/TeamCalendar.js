import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Badge, Select, Card, Spin, Alert, Tag, Tooltip } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import axiosInstance from '../../utils/axiosConfig';

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

const { Option } = Select;

const TeamCalendar = () => {
  const [leaves, setLeaves] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/api/hr/departments/');
      setDepartments(res.data.results || res.data);
    } catch {
      // silencieux — filtre facultatif
    }
  }, []);

  const fetchLeaves = useCallback(async (date, departmentId) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        year: date.year(),
        month: date.month() + 1,
      };
      if (departmentId) params.department = departmentId;
      const res = await axiosInstance.get('/api/hr/leave-requests/team_calendar/', { params });
      setLeaves(res.data);
    } catch {
      setError('Impossible de charger le calendrier des conges.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    fetchLeaves(currentDate, selectedDepartment);
  }, [currentDate, selectedDepartment, fetchLeaves]);

  const getLeavesForDay = (value) => {
    const d = value.format('YYYY-MM-DD');
    return leaves.filter((l) => {
      const start = dayjs(l.start_date).format('YYYY-MM-DD');
      const end = dayjs(l.end_date).format('YYYY-MM-DD');
      return d >= start && d <= end;
    });
  };

  const dateCellRender = (value) => {
    const dayLeaves = getLeavesForDay(value);
    if (!dayLeaves.length) return null;
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {dayLeaves.slice(0, 3).map((l) => (
          <li key={l.id}>
            <Tooltip title={`${l.leave_type_name} — ${l.nb_days}j`}>
              <Badge
                color={l.leave_type_color || '#1890ff'}
                text={
                  <span style={{ fontSize: 11 }}>
                    {l.employee_name}
                  </span>
                }
              />
            </Tooltip>
          </li>
        ))}
        {dayLeaves.length > 3 && (
          <li>
            <Tag color="default" style={{ fontSize: 10 }}>
              +{dayLeaves.length - 3} autre(s)
            </Tag>
          </li>
        )}
      </ul>
    );
  };

  const onPanelChange = (value) => {
    setCurrentDate(value);
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 16 }}>
        <TeamOutlined style={{ fontSize: 20, color: '#1890ff' }} />
        <h2 style={{ margin: 0 }}>Calendrier des conges equipe</h2>
      </div>

      {error && (
        <Alert type="error" message={error} style={{ marginBottom: 16 }} closable />
      )}

      <Card
        extra={
          <Select
            placeholder="Tous les departements"
            allowClear
            style={{ width: 220 }}
            onChange={(v) => setSelectedDepartment(v || null)}
            value={selectedDepartment}
          >
            {departments.map((d) => (
              <Option key={d.id} value={d.id}>{d.name}</Option>
            ))}
          </Select>
        }
      >
        <Spin spinning={loading}>
          <Calendar
            dateCellRender={dateCellRender}
            onPanelChange={onPanelChange}
            value={currentDate}
            onChange={setCurrentDate}
          />
        </Spin>
      </Card>

      <div style={{ marginTop: 12, color: '#888', fontSize: 12 }}>
        Affiche les conges avec statut <strong>Approuve RH</strong> uniquement.
        {leaves.length > 0 && ` — ${leaves.length} conge(s) ce mois.`}
      </div>
    </div>
  );
};

export default TeamCalendar;

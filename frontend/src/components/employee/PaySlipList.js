// src/components/employee/PaySlipList.js
import React, { useState, useEffect } from 'react';
import {
  Table, Card, Typography, Spin, Alert, Button, Empty, Tag
} from 'antd';
import { FileTextOutlined, DownloadOutlined } from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';
import { useCurrency } from '../../context/CurrencyContext';

const { Title } = Typography;

const STATUS_CONFIG = {
  draft: { label: 'Brouillon', color: 'default' },
  calculated: { label: 'Calculé', color: 'processing' },
  validated: { label: 'Validé', color: 'success' },
};

const PaySlipList = () => {
  const { currencySymbol } = useCurrency();
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPayslips = async () => {
      setLoading(true);
      try {
        const empResp = await axios.get('/api/hr/employees/me/');
        const employeeId = empResp.data.id;
        const resp = await axios.get('/api/payroll/payslips/', {
          params: { employee: employeeId }
        });
        setPayslips(extractResultsFromResponse(resp));
      } catch (err) {
        if (err.response?.status === 404) {
          setError("Aucun dossier employé n'est associé à votre compte.");
        } else {
          setError("Impossible de charger les bulletins de paie.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPayslips();
  }, []);

  const columns = [
    { title: 'Période', dataIndex: 'period_display', key: 'period_display' },
    {
      title: 'Salaire brut',
      dataIndex: 'gross_salary',
      key: 'gross_salary',
      render: (v) => v ? `${Number(v).toLocaleString('fr-FR')} ${currencySymbol}` : '-',
    },
    {
      title: 'Salaire net',
      dataIndex: 'net_salary',
      key: 'net_salary',
      render: (v) => v ? `${Number(v).toLocaleString('fr-FR')} ${currencySymbol}` : '-',
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (s) => {
        const c = STATUS_CONFIG[s] || { label: s, color: 'default' };
        return <Tag color={c.color}>{c.label}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) =>
        record.id ? (
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() =>
              window.open(`/api/payroll/payslips/${record.id}/download_pdf/`, '_blank')
            }
          >
            Télécharger PDF
          </Button>
        ) : null,
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return <Alert message="Bulletins de paie" description={error} type="warning" showIcon />;
  }

  return (
    <div>
      <Title level={3} style={{ marginBottom: 16 }}>
        <FileTextOutlined style={{ marginRight: 8 }} />
        Mes bulletins de paie
      </Title>

      <Card>
        {payslips.length === 0 ? (
          <Empty description="Aucun bulletin de paie disponible" />
        ) : (
          <Table
            dataSource={payslips}
            columns={columns}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 12 }}
          />
        )}
      </Card>
    </div>
  );
};

export default PaySlipList;

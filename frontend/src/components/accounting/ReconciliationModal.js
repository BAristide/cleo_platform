// src/components/accounting/ReconciliationModal.js
import React, { useState, useEffect } from 'react';
import {
  Modal, Table, Tag, Typography, Space, Spin, Alert,
  Button, Progress, Empty, message
} from 'antd';
import {
  CheckCircleOutlined, SearchOutlined, ThunderboltOutlined
} from '@ant-design/icons';
import { handleApiError } from '../../utils/apiUtils';
import axios from '../../utils/axiosConfig';
import moment from 'moment';
import { useCurrency } from '../../context/CurrencyContext';

const { Text } = Typography;

const ReconciliationModal = ({ visible, statementId, line, onClose, onSuccess }) => {
  const { currencySymbol, currencyCode } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  useEffect(() => {
    if (visible && line && !line.is_reconciled) {
      fetchSuggestions();
    }
  }, [visible, line]);

  const fetchSuggestions = async () => {
    setLoading(true);
    setSuggestions([]);
    setSelectedRowKeys([]);
    try {
      const response = await axios.post(
        `/api/accounting/bank-statements/${statementId}/lines/${line.id}/suggestions/`
      );
      if (response.data.success) {
        const items = response.data.suggestions.map(s => ({ ...s, key: s.entry_line_id }));
        setSuggestions(items);
        // Auto-select the best match if score >= 80
        const best = items.filter(s => s.score >= 80);
        if (best.length > 0) {
          setSelectedRowKeys([best[0].key]);
        }
      }
    } catch (error) {
      handleApiError(error, null, 'Erreur lors de la recherche de correspondances.');
    } finally {
      setLoading(false);
    }
  };

  const handleReconcile = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Sélectionnez au moins une écriture');
      return;
    }
    setReconciling(true);
    try {
      const response = await axios.post(
        `/api/accounting/bank-statements/${statementId}/lines/${line.id}/reconcile/`,
        { entry_line_ids: selectedRowKeys }
      );
      if (response.data.success) {
        message.success('Ligne rapprochée avec succès');
        if (onSuccess) onSuccess();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      handleApiError(error, null, 'Erreur lors du rapprochement.');
    } finally {
      setReconciling(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#52c41a';
    if (score >= 50) return '#faad14';
    return '#ff4d4f';
  };

  const getScoreTag = (score) => {
    if (score >= 80) return <Tag color="success">{score}% — Excellent</Tag>;
    if (score >= 50) return <Tag color="warning">{score}% — Possible</Tag>;
    return <Tag color="error">{score}% — Faible</Tag>;
  };

  const columns = [
    {
      title: 'Score',
      dataIndex: 'score',
      key: 'score',
      width: 140,
      sorter: (a, b) => a.score - b.score,
      defaultSortOrder: 'descend',
      render: (score) => (
        <Space>
          <Progress
            type="circle"
            percent={score}
            width={36}
            strokeColor={getScoreColor(score)}
            format={(p) => `${p}`}
          />
          {getScoreTag(score)}
        </Space>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'entry_date',
      key: 'entry_date',
      width: 110,
      render: (text) => moment(text).format('DD/MM/YYYY'),
    },
    {
      title: 'Écriture',
      dataIndex: 'entry_name',
      key: 'entry_name',
      width: 140,
    },
    {
      title: 'Compte',
      key: 'account',
      width: 120,
      render: (_, record) => `${record.account_code}`,
    },
    {
      title: 'Libellé',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: 'Référence',
      dataIndex: 'ref',
      key: 'ref',
      width: 120,
    },
    {
      title: 'Partenaire',
      dataIndex: 'partner_name',
      key: 'partner_name',
      width: 140,
      render: (text) => text || '-',
    },
    {
      title: 'Débit',
      dataIndex: 'debit',
      key: 'debit',
      width: 110,
      align: 'right',
      render: (val) => val > 0 ? <Text type="success">{parseFloat(val).toFixed(2)}</Text> : '-',
    },
    {
      title: 'Crédit',
      dataIndex: 'credit',
      key: 'credit',
      width: 110,
      align: 'right',
      render: (val) => val > 0 ? <Text type="danger">{parseFloat(val).toFixed(2)}</Text> : '-',
    },
  ];

  // Calcul du total sélectionné
  const selectedTotal = suggestions
    .filter(s => selectedRowKeys.includes(s.entry_line_id))
    .reduce((sum, s) => sum + s.debit - s.credit, 0);
  const lineAmount = line ? parseFloat(line.amount) : 0;
  const difference = lineAmount - selectedTotal;

  return (
    <Modal
      title={
        <Space>
          <SearchOutlined />
          <span>Rapprocher la ligne de relevé</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>Annuler</Button>,
        <Button
          key="reconcile"
          type="primary"
          icon={<CheckCircleOutlined />}
          onClick={handleReconcile}
          loading={reconciling}
          disabled={selectedRowKeys.length === 0}
        >
          Rapprocher ({selectedRowKeys.length} écriture{selectedRowKeys.length > 1 ? 's' : ''})
        </Button>,
      ]}
      width={1100}
      bodyStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
    >
      {line && (
        <>
          <Alert
            message={
              <Space size="large">
                <span><strong>Ligne :</strong> {line.name}</span>
                <span><strong>Date :</strong> {moment(line.date).format('DD/MM/YYYY')}</span>
                <span><strong>Réf :</strong> {line.ref || '-'}</span>
                <span>
                  <strong>Montant :</strong>{' '}
                  <Text type={lineAmount >= 0 ? 'success' : 'danger'} strong>
                    {lineAmount.toFixed(2)} {currencyCode}
                  </Text>
                </span>
              </Space>
            }
            type="info"
            style={{ marginBottom: 16 }}
          />

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" tip="Recherche de correspondances..." />
            </div>
          ) : suggestions.length === 0 ? (
            <Empty
              description="Aucune écriture comptable correspondante trouvée"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <>
              <Table
                columns={columns}
                dataSource={suggestions}
                rowKey="entry_line_id"
                pagination={false}
                size="small"
                rowSelection={{
                  type: 'checkbox',
                  selectedRowKeys,
                  onChange: setSelectedRowKeys,
                }}
              />

              {selectedRowKeys.length > 0 && (
                <Alert
                  message={
                    <Space size="large">
                      <span>
                        <strong>Total sélectionné :</strong>{' '}
                        {selectedTotal.toFixed(2)} {currencyCode}
                      </span>
                      <span>
                        <strong>Écart :</strong>{' '}
                        <Text type={Math.abs(difference) < 0.01 ? 'success' : 'warning'} strong>
                          {difference.toFixed(2)} {currencyCode}
                        </Text>
                      </span>
                    </Space>
                  }
                  type={Math.abs(difference) < 0.01 ? 'success' : 'warning'}
                  showIcon
                  style={{ marginTop: 16 }}
                />
              )}
            </>
          )}
        </>
      )}
    </Modal>
  );
};

export default ReconciliationModal;

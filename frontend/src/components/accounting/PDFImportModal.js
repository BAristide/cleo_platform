// src/components/accounting/PDFImportModal.js
import React, { useState } from 'react';
import { Modal, Upload, Button, Alert, Typography, Space, Tag, message } from 'antd';
import { UploadOutlined, FilePdfOutlined, CheckCircleOutlined } from '@ant-design/icons';
import axios from '../../utils/axiosConfig';

const { Text, Paragraph } = Typography;

const PDFImportModal = ({ visible, statementId, onClose, onSuccess }) => {
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning('Veuillez sélectionner un fichier PDF');
      return;
    }

    const formData = new FormData();
    formData.append('file', fileList[0]);

    setUploading(true);
    setResult(null);

    try {
      const response = await axios.post(
        `/api/accounting/bank-statements/${statementId}/import_from_pdf/`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (response.data.success) {
        setResult({
          type: 'success',
          message: response.data.message,
          linesCreated: response.data.lines_created,
          duplicatesSkipped: response.data.duplicates_skipped,
          parserUsed: response.data.parser_used,
          confidence: response.data.confidence,
        });
        message.success(response.data.message);
        if (onSuccess) onSuccess();
      } else {
        setResult({ type: 'error', message: response.data.message });
      }
    } catch (error) {
      const msg = error.response?.data?.message || "Erreur lors de l'import PDF";
      setResult({ type: 'error', message: msg });
      message.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFileList([]);
    setResult(null);
    onClose();
  };

  const confidenceColor = { high: 'green', medium: 'orange', low: 'red' };

  const uploadProps = {
    accept: '.pdf,.PDF',
    maxCount: 1,
    beforeUpload: (file) => {
      setFileList([file]);
      setResult(null);
      return false;
    },
    onRemove: () => {
      setFileList([]);
      setResult(null);
    },
    fileList,
  };

  return (
    <Modal
      title={
        <Space>
          <FilePdfOutlined style={{ color: '#ff4d4f' }} />
          <span>Importer un relevé PDF</span>
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          {result?.type === 'success' ? 'Fermer' : 'Annuler'}
        </Button>,
        result?.type !== 'success' && (
          <Button
            key="upload"
            type="primary"
            onClick={handleUpload}
            loading={uploading}
            disabled={fileList.length === 0}
            icon={<UploadOutlined />}
          >
            Importer
          </Button>
        ),
      ].filter(Boolean)}
      width={620}
    >
      <Paragraph type="secondary">
        Sélectionnez un relevé bancaire au format PDF. Les transactions seront extraites
        automatiquement et importées comme lignes du relevé. Les doublons sont ignorés.
      </Paragraph>

      <Upload.Dragger {...uploadProps} style={{ marginBottom: 16 }}>
        <p className="ant-upload-drag-icon">
          <FilePdfOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />
        </p>
        <p className="ant-upload-text">Cliquez ou glissez un fichier PDF ici</p>
        <p className="ant-upload-hint">Format accepté : .pdf</p>
      </Upload.Dragger>

      {result && (
        <Alert
          message={result.type === 'success' ? 'Import réussi' : "Erreur d'import"}
          description={
            result.type === 'success' ? (
              <Space direction="vertical" size={4}>
                <Text>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />{' '}
                  {result.linesCreated} lignes importées
                </Text>
                {result.duplicatesSkipped > 0 && (
                  <Text type="secondary">{result.duplicatesSkipped} doublons ignorés</Text>
                )}
                <Space>
                  <Text type="secondary">Moteur :</Text>
                  <Tag>{result.parserUsed}</Tag>
                  <Text type="secondary">Fiabilité :</Text>
                  <Tag color={confidenceColor[result.confidence] || 'default'}>
                    {result.confidence}
                  </Tag>
                </Space>
              </Space>
            ) : (
              result.message
            )
          }
          type={result.type}
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </Modal>
  );
};

export default PDFImportModal;

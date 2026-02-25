// src/components/accounting/OFXImportModal.js
import React, { useState } from 'react';
import { Modal, Upload, Button, Alert, Typography, Space, message } from 'antd';
import { UploadOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons';
import axios from '../../utils/axiosConfig';

const { Text, Paragraph } = Typography;

const OFXImportModal = ({ visible, statementId, onClose, onSuccess }) => {
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning('Veuillez sélectionner un fichier OFX/QFX');
      return;
    }

    const formData = new FormData();
    formData.append('file', fileList[0]);

    setUploading(true);
    setResult(null);

    try {
      const response = await axios.post(
        `/api/accounting/bank-statements/${statementId}/import_from_ofx/`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (response.data.success) {
        setResult({
          type: 'success',
          message: response.data.message,
          linesCreated: response.data.lines_created,
          duplicatesSkipped: response.data.duplicates_skipped,
        });
        message.success(response.data.message);
        if (onSuccess) onSuccess();
      } else {
        setResult({ type: 'error', message: response.data.message });
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Erreur lors de l\'import';
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

  const uploadProps = {
    accept: '.ofx,.qfx,.OFX,.QFX',
    maxCount: 1,
    beforeUpload: (file) => {
      setFileList([file]);
      setResult(null);
      return false; // Empêcher l'upload automatique
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
          <FileTextOutlined />
          <span>Importer un relevé OFX</span>
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          {result?.type === 'success' ? 'Fermer' : 'Annuler'}
        </Button>,
        !result?.type === 'success' && (
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
      width={600}
    >
      <Paragraph type="secondary">
        Sélectionnez un fichier au format OFX ou QFX exporté depuis votre banque.
        Les transactions seront importées comme lignes du relevé.
        Les doublons (même identifiant OFX) seront automatiquement ignorés.
      </Paragraph>

      <Upload.Dragger {...uploadProps} style={{ marginBottom: 16 }}>
        <p className="ant-upload-drag-icon">
          <UploadOutlined style={{ fontSize: 32, color: '#1890ff' }} />
        </p>
        <p className="ant-upload-text">Cliquez ou glissez un fichier OFX/QFX ici</p>
        <p className="ant-upload-hint">Formats acceptés : .ofx, .qfx</p>
      </Upload.Dragger>

      {result && (
        <Alert
          message={result.type === 'success' ? 'Import réussi' : 'Erreur d\'import'}
          description={
            result.type === 'success' ? (
              <Space direction="vertical">
                <Text><CheckCircleOutlined style={{ color: '#52c41a' }} /> {result.linesCreated} lignes importées</Text>
                {result.duplicatesSkipped > 0 && (
                  <Text type="secondary">{result.duplicatesSkipped} doublons ignorés</Text>
                )}
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

export default OFXImportModal;

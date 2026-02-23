// src/components/users/UserForm.js
import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Switch, Select, message } from 'antd';
import axios from '../../utils/axiosConfig';

const UserForm = ({ visible, user, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState([]);

  const isEditing = !!user;

  useEffect(() => {
    if (visible) {
      fetchRoles();
      if (user) {
        form.setFieldsValue({
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.profile?.phone || '',
          is_active: user.is_active,
          groups: user.groups || [],
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ is_active: true });
      }
    }
  }, [visible, user]);

  const fetchRoles = async () => {
    try {
      const res = await axios.get('/api/users/roles/');
      const data = res.data.results || res.data || [];
      setRoles(data.map((r) => ({ label: r.name, value: r.name })));
    } catch (error) {
      // Les rôles peuvent ne pas être configurés — pas bloquant
      setRoles([]);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const payload = {
        email: values.email,
        first_name: values.first_name,
        last_name: values.last_name,
        is_active: values.is_active,
        groups: values.groups || [],
        profile: {
          phone: values.phone || '',
        },
      };

      if (isEditing) {
        await axios.patch(`/api/users/users/${user.id}/`, payload);
        message.success('Utilisateur modifié avec succès.');
      } else {
        payload.password = values.password;
        await axios.post('/api/users/users/', payload);
        message.success('Utilisateur créé avec succès.');
      }

      onSuccess();
    } catch (error) {
      if (error.response?.data) {
        const errors = error.response.data;
        // Afficher les erreurs du backend dans le formulaire
        const fieldErrors = [];
        Object.keys(errors).forEach((key) => {
          const msg = Array.isArray(errors[key]) ? errors[key][0] : errors[key];
          if (['email', 'first_name', 'last_name', 'password', 'phone'].includes(key)) {
            fieldErrors.push({ name: key, errors: [msg] });
          } else {
            message.error(msg);
          }
        });
        if (fieldErrors.length > 0) {
          form.setFields(fieldErrors);
        }
      } else {
        message.error("Erreur lors de l'enregistrement.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEditing ? `Modifier — ${user.email}` : 'Nouvel utilisateur'}
      open={visible}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={saving}
      okText={isEditing ? 'Enregistrer' : 'Créer'}
      cancelText="Annuler"
      width={600}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: "L'email est requis" },
            { type: 'email', message: "Format d'email invalide" },
          ]}
        >
          <Input placeholder="utilisateur@email.ma" />
        </Form.Item>
        <Form.Item
          name="first_name"
          label="Prénom"
          rules={[{ required: true, message: 'Le prénom est requis' }]}
        >
          <Input placeholder="Prénom" />
        </Form.Item>
        <Form.Item
          name="last_name"
          label="Nom"
          rules={[{ required: true, message: 'Le nom est requis' }]}
        >
          <Input placeholder="Nom" />
        </Form.Item>

        {!isEditing && (
          <Form.Item
            name="password"
            label="Mot de passe initial"
            rules={[
              { required: true, message: 'Le mot de passe est requis' },
              { min: 8, message: 'Minimum 8 caractères' },
            ]}
          >
            <Input.Password placeholder="Mot de passe (min. 8 caractères)" />
          </Form.Item>
        )}

        <Form.Item name="phone" label="Téléphone">
          <Input placeholder="+212 6XX XXX XXX" />
        </Form.Item>

        <Form.Item name="groups" label="Rôles">
          <Select
            mode="multiple"
            placeholder="Sélectionner des rôles"
            options={roles}
            allowClear
          />
        </Form.Item>

        <Form.Item name="is_active" label="Actif" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UserForm;

// src/components/common/GlobalSearch.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input, Spin, Empty, Tag, Typography } from 'antd';
import {
  SearchOutlined,
  TeamOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  IdcardOutlined,
  InboxOutlined,
  AccountBookOutlined,
  FileTextOutlined,
  UserOutlined,
  BankOutlined,
  SolutionOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import './GlobalSearch.css';

const { Text } = Typography;

const MODULE_CONFIG = {
  crm: { label: 'CRM', color: '#3b82f6', icon: <TeamOutlined /> },
  sales: { label: 'Ventes', color: '#10b981', icon: <ShoppingCartOutlined /> },
  purchasing: { label: 'Achats', color: '#f97316', icon: <ShoppingOutlined /> },
  hr: { label: 'RH', color: '#f59e0b', icon: <IdcardOutlined /> },
  inventory: { label: 'Stocks', color: '#14b8a6', icon: <InboxOutlined /> },
  accounting: { label: 'Comptabilité', color: '#6366f1', icon: <AccountBookOutlined /> },
  payroll: { label: 'Paie', color: '#8b5cf6', icon: <DollarOutlined /> },
  recruitment: { label: 'Recrutement', color: '#ec4899', icon: <SolutionOutlined /> },
};

const TYPE_ICONS = {
  'Entreprise': <BankOutlined />,
  'Contact': <UserOutlined />,
  'Opportunité': <SolutionOutlined />,
  'Produit': <InboxOutlined />,
  'Devis': <FileTextOutlined />,
  'Commande': <ShoppingCartOutlined />,
  'Facture': <FileTextOutlined />,
  'Fournisseur': <ShoppingOutlined />,
  'Bon de commande': <FileTextOutlined />,
  'Facture fournisseur': <FileTextOutlined />,
  'Employé': <IdcardOutlined />,
  'Entrepôt': <InboxOutlined />,
  'Compte': <AccountBookOutlined />,
  'Journal': <AccountBookOutlined />,
};

const GlobalSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);
  const navigate = useNavigate();

  // Debounced search
  const doSearch = useCallback(async (q) => {
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get('/api/core/search/', { params: { q } });
      setResults(res.data.results || []);
      setOpen(true);
      setSelectedIndex(-1);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handleSelect = (item) => {
    setOpen(false);
    setQuery('');
    setResults([]);
    navigate(item.url);
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!open || results.length === 0) {
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setOpen(false);
        inputRef.current?.blur();
        break;
      default:
        break;
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const items = dropdownRef.current.querySelectorAll('.gs-result-item');
      if (items[selectedIndex]) {
        items[selectedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      const container = document.querySelector('.gs-container');
      if (container && !container.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Group results by module
  const grouped = {};
  results.forEach((r) => {
    if (!grouped[r.module]) grouped[r.module] = [];
    grouped[r.module].push(r);
  });

  // Flat list for keyboard nav (already flat from backend)
  const flatResults = results;

  return (
    <div className="gs-container">
      <div className="gs-input-wrapper">
        <Input
          ref={inputRef}
          prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
          placeholder="Rechercher... (Ctrl+K)"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          allowClear
          onClear={() => { setQuery(''); setResults([]); setOpen(false); }}
          className="gs-input"
        />
        {!query && (
          <span className="gs-shortcut">
            <kbd>Ctrl</kbd><kbd>K</kbd>
          </span>
        )}
      </div>

      {open && (
        <div className="gs-dropdown" ref={dropdownRef}>
          {loading ? (
            <div className="gs-loading">
              <Spin size="small" />
              <span>Recherche en cours...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="gs-empty">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={`Aucun résultat pour "${query}"`}
              />
            </div>
          ) : (
            <>
              {Object.entries(grouped).map(([module, items]) => {
                const config = MODULE_CONFIG[module] || { label: module, color: '#666', icon: null };
                return (
                  <div key={module} className="gs-group">
                    <div className="gs-group-header">
                      <span className="gs-group-icon" style={{ color: config.color }}>
                        {config.icon}
                      </span>
                      <span className="gs-group-label">{config.label}</span>
                      <Tag color={config.color} style={{ fontSize: 11, marginLeft: 'auto', lineHeight: '18px' }}>
                        {items.length}
                      </Tag>
                    </div>
                    {items.map((item) => {
                      const globalIdx = flatResults.indexOf(item);
                      return (
                        <div
                          key={`${item.module}-${item.type}-${item.id}`}
                          className={`gs-result-item ${globalIdx === selectedIndex ? 'gs-result-selected' : ''}`}
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                        >
                          <span className="gs-result-icon">
                            {TYPE_ICONS[item.type] || <FileTextOutlined />}
                          </span>
                          <div className="gs-result-content">
                            <Text strong className="gs-result-label">{item.label}</Text>
                            <div className="gs-result-meta">
                              <Tag style={{ fontSize: 11, lineHeight: '18px', marginRight: 4 }}>{item.type}</Tag>
                              {item.description && (
                                <Text type="secondary" style={{ fontSize: 12 }}>{item.description}</Text>
                              )}
                            </div>
                          </div>
                          <span className="gs-result-arrow">→</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              <div className="gs-footer">
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {results.length} résultat{results.length > 1 ? 's' : ''} — ↑↓ naviguer · ↵ ouvrir · Esc fermer
                </Text>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;

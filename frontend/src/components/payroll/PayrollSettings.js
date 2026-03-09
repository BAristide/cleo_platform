// src/components/payroll/PayrollSettings.js
import React from 'react';
import { Tabs } from 'antd';
import { ToolOutlined, DashboardOutlined, PercentageOutlined, FileTextOutlined } from '@ant-design/icons';
import SalaryComponentAdmin from './SalaryComponentAdmin';
import PayrollParameterAdmin from './PayrollParameterAdmin';
import TaxBracketAdmin from './TaxBracketAdmin';
import ContractTypeAdmin from './ContractTypeAdmin';

const PayrollSettings = () => {
  const items = [
    {
      key: 'components',
      label: <span><ToolOutlined /> Composants de salaire</span>,
      children: <SalaryComponentAdmin />,
    },
    {
      key: 'parameters',
      label: <span><DashboardOutlined /> Parametres de paie</span>,
      children: <PayrollParameterAdmin />,
    },
    {
      key: 'tax-brackets',
      label: <span><PercentageOutlined /> Tranches d'imposition</span>,
      children: <TaxBracketAdmin />,
    },
    {
      key: 'contract-types',
      label: <span><FileTextOutlined /> Types de contrat</span>,
      children: <ContractTypeAdmin />,
    },
  ];

  return (
    <div>
      <Tabs defaultActiveKey="components" items={items} size="large" />
    </div>
  );
};

export default PayrollSettings;

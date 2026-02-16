import React, { useEffect, useState } from 'react';
import axios from 'axios';

function InvoiceList() {
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    axios.get('/api/sales/invoices/')
      .then(response => setInvoices(response.data))
      .catch(error => console.error('Error fetching invoices:', error));
  }, []);

  return (
    <div>
      <h1>Invoices</h1>
      <ul>
        {invoices.map(invoice => (
          <li key={invoice.id}>{invoice.number} - {invoice.amount}</li>
        ))}
      </ul>
    </div>
  );
}

export default InvoiceList;

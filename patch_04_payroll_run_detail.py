"""
Patch frontend/src/components/payroll/PayrollRunDetail.js
— PAIE-13 : modal Payer amelioree (reference + date)
— PAIE-14 : bouton Export XLSX
"""

with open('frontend/src/components/payroll/PayrollRunDetail.js', 'r') as f:
    content = f.read()

# ── 1. Ajouter FileExcelOutlined aux imports ──
old_import = '  FilePdfOutlined'
new_import = '  FilePdfOutlined, FileExcelOutlined'

if old_import in content and 'FileExcelOutlined' not in content:
    content = content.replace(old_import, new_import)
    print('OK — FileExcelOutlined ajoute aux imports')

# ── 2. Ajouter la fonction handleExportXlsx ──
old_handle_summary = '  const handleGenerateSummaryPDF = async () => {'
new_handle_export = """  const handleExportXlsx = async () => {
    try {
      window.open(`/api/payroll/payroll-runs/${id}/export_xlsx/`, '_blank');
      message.success('Export XLSX lance');
    } catch (error) {
      console.error('Erreur export XLSX:', error);
      message.error('Erreur lors de l\\'export XLSX');
    }
  };

  const handleGenerateSummaryPDF = async () => {"""

if old_handle_summary in content:
    content = content.replace(old_handle_summary, new_handle_export)
    print('OK — handleExportXlsx ajoutee')

# ── 3. Ajouter le bouton Export XLSX apres le bouton Recapitulatif PDF ──
old_pdf_button = """            <Button
              type="default"
              icon={<FilePdfOutlined />}
              onClick={handleGenerateSummaryPDF}
              loading={pdfGenerating}
            >
              Récapitulatif PDF
            </Button>
          )}
        </Space>"""

new_pdf_button = """            <Button
              type="default"
              icon={<FilePdfOutlined />}
              onClick={handleGenerateSummaryPDF}
              loading={pdfGenerating}
            >
              Recapitulatif PDF
            </Button>
          )}

          {(payrollRun.status === 'calculated' || payrollRun.status === 'validated' || payrollRun.status === 'paid') && (
            <Button
              type="default"
              icon={<FileExcelOutlined />}
              onClick={handleExportXlsx}
              style={{ color: '#217346' }}
            >
              Export XLSX
            </Button>
          )}
        </Space>"""

if old_pdf_button in content:
    content = content.replace(old_pdf_button, new_pdf_button)
    print('OK — bouton Export XLSX ajoute')
else:
    # Essayer sans accent
    old_pdf_button2 = old_pdf_button.replace('Récapitulatif', 'Recapitulatif')
    if old_pdf_button2 in content:
        content = content.replace(old_pdf_button2, new_pdf_button)
        print('OK — bouton Export XLSX ajoute (variante sans accent)')
    else:
        print('ERREUR — bloc bouton PDF introuvable')

with open('frontend/src/components/payroll/PayrollRunDetail.js', 'w') as f:
    f.write(content)

print('Patch PayrollRunDetail.js termine.')

import Papa from 'papaparse';

export const FileExportService = {
  downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  exportToJSON(data, filename) {
    const jsonString = JSON.stringify(data, null, 2);
    this.downloadFile(jsonString, `${filename}.json`, 'application/json');
  },

  exportToCSV(data, filename) {
    const csvString = Papa.unparse(data);
    this.downloadFile(csvString, `${filename}.csv`, 'text/csv;charset=utf-8;');
  },

  exportToXMILE(cldData, filename) {
    const { title, description, nodes, edges } = cldData;

    let xml = `<?xml version="1.0" encoding="utf-8" ?>\n`;
    xml += `<xmile version="1.0" xmlns="http://docs.oasis-open.org/xmile/ns/XMILE/v1.0">\n`;
    xml += `    <header>\n`;
    xml += `        <name>${title || 'Exported CLD'}</name>\n`;
    xml += `        <doc>${description || ''}</doc>\n`;
    xml += `    </header>\n`;
    xml += `    <model>\n`;

    xml += `        <variables>\n`;
    (nodes || []).forEach(node => {
      xml += `            <aux name="${node.name}">\n`;
      if (node.description) xml += `                <doc>${node.description}</doc>\n`;
      xml += `            </aux>\n`;
    });
    xml += `        </variables>\n`;

    xml += `        <views>\n`;
    xml += `            <view>\n`;
    (edges || []).forEach(edge => {
      const from = edge.source_name ? edge.source_name.replace(/\s/g, '_') : 'Unknown';
      const to = edge.target_name ? edge.target_name.replace(/\s/g, '_') : 'Unknown';
      const pol = edge.polarity === 'NEGATIVE' ? '-' : '+';

      xml += `                <connector from="${from}" to="${to}" polarity="${pol}" />\n`;
    });
    xml += `            </view>\n`;
    xml += `        </views>\n`;

    xml += `    </model>\n`;
    xml += `</xmile>`;

    this.downloadFile(xml, `${filename}.xmile`, 'application/xml');
  },

  exportToXMILEVariables(variables, filename) {
      let xml = `<?xml version="1.0" encoding="utf-8" ?>\n`;
      xml += `<xmile version="1.0" xmlns="http://docs.oasis-open.org/xmile/ns/XMILE/v1.0">\n`;
      xml += `    <header>\n`;
      xml += `        <name>Exported Variables</name>\n`;
      xml += `    </header>\n`;
      xml += `    <model>\n`;
      xml += `        <variables>\n`;

      variables.forEach(v => {
        const safeName = v.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        xml += `            <aux name="${safeName}">\n`;
        if (v.description) {
          const safeDesc = v.description.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          xml += `                <doc>${safeDesc}</doc>\n`;
        }
        xml += `            </aux>\n`;
      });

      xml += `        </variables>\n`;
      xml += `    </model>\n`;
      xml += `</xmile>`;

      this.downloadFile(xml, `${filename}.xmile`, 'application/xml');
    }
};
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
    // Agora suporta tanto o formato antigo quanto o novo aninhado
    const title = cldData.diagram?.title || cldData.title || 'Exported CLD';
    const description = cldData.diagram?.description || cldData.description || '';
    const nodes = cldData.nodes || [];
    const edges = cldData.edges || [];

    let xml = `<?xml version="1.0" encoding="utf-8" ?>\n`;
    xml += `<xmile version="1.0" xmlns="http://docs.oasis-open.org/xmile/ns/XMILE/v1.0">\n`;
    xml += `    <header>\n`;
    xml += `        <name>${title}</name>\n`;
    if (description) xml += `        <doc>${description}</doc>\n`;
    xml += `    </header>\n`;
    xml += `    <model>\n`;

    xml += `        <variables>\n`;
    nodes.forEach(node => {
      xml += `            <aux name="${node.name}">\n`;
      if (node.description) xml += `                <doc>${node.description}</doc>\n`;
      xml += `            </aux>\n`;
    });
    xml += `        </variables>\n`;

    xml += `        <views>\n`;
    xml += `            <view>\n`;
    edges.forEach(edge => {
      // Busca pelo 'source' (JSON atual) ou 'source_name' (legado)
      const sourceName = edge.source || edge.source_name || 'Unknown';
      const targetName = edge.target || edge.target_name || 'Unknown';

      const from = sourceName.replace(/\s/g, '_');
      const to = targetName.replace(/\s/g, '_');
      const pol = (edge.polarity === 'NEGATIVE' || edge.polarity === 'negative' || edge.polarity === '-') ? '-' : '+';

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
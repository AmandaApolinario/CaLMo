import Papa from 'papaparse';
import { parseBoolean } from './parser/parserUtils.js';

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
    return JSON.stringify(data, null, 2);
  },

  exportToCSV(data, filename) {
    return Papa.unparse(data);
  },

  exportToXMILE(cldData, filename) {
    const title = cldData.diagram?.title || cldData.title || 'Exported CLD';
    const description = cldData.diagram?.description || cldData.description || '';
    const nodes = cldData.nodes || [];
    const edges = cldData.edges || [];
    const subsystems = cldData.subsystems || [];

    const escapeXml = (str) => {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    let xml = `<?xml version="1.0" encoding="utf-8" ?>\n`;
    xml += `<xmile version="1.0" xmlns="http://docs.oasis-open.org/xmile/ns/XMILE/v1.0" xmlns:isee="http://iseesystems.com/XMILE">\n`;
    xml += `    <header>\n`;
    xml += `        <name>${escapeXml(title)}</name>\n`;
    if (description) xml += `        <doc>${escapeXml(description)}</doc>\n`;
    xml += `    </header>\n`;
    xml += `    <model>\n`;
    xml += `        <variables>\n`;
    nodes.forEach(node => {
      xml += `            <aux name="${escapeXml(node.name)}">\n`;
      if (node.description) xml += `                <doc>${escapeXml(node.description)}</doc>\n`;
      xml += `            </aux>\n`;
    });

    const appendSubsystem = (subsystem) => {
      xml += `            <group name="${escapeXml(subsystem.name || 'Unnamed')}">\n`;
      if (subsystem.description) {
        xml += `                <doc>${escapeXml(subsystem.description)}</doc>\n`;
      }
      (subsystem.variableIds || []).forEach(variableName => {
        xml += `                <entity name="${escapeXml(variableName)}" />\n`;
      });
      (subsystem.subsystems || []).forEach(child => {
        xml += `                <entity name="${escapeXml(child.name || 'Unnamed')}" />\n`;
      });
      xml += `            </group>\n`;

      (subsystem.subsystems || []).forEach(child => appendSubsystem(child));
    };

    subsystems.forEach(subsystem => appendSubsystem(subsystem));
    xml += `        </variables>\n`;

    xml += `        <views>\n`;
    xml += `            <view type="stock_flow">\n`;

    nodes.forEach(node => {
      const x = node.x ? Math.round(node.x) : 100;
      const y = node.y ? Math.round(node.y) : 100;
      xml += `                <aux x="${x}" y="${y}" name="${escapeXml(node.name)}" />\n`;
    });

    edges.forEach((edge, index) => {
      const sourceName = edge.source || edge.source_name || 'Unknown';
      const targetName = edge.target || edge.target_name || 'Unknown';

      const from = escapeXml(sourceName);
      const to = escapeXml(targetName);
      const pol = (edge.polarity === 'NEGATIVE' || edge.polarity === 'negative' || edge.polarity === '-') ? '-' : '+';
      const hasDelay = parseBoolean(edge.has_delay ?? edge.delay ?? edge.delay_mark, false);
      const delayMark = hasDelay ? ' delay_mark="true"' : '';

      xml += `                <connector uid="${index + 1}" polarity="${pol}"${delayMark}>\n`;
      xml += `                    <from>${from}</from>\n`;
      xml += `                    <to>${to}</to>\n`;
      xml += `                </connector>\n`;
    });

    xml += `            </view>\n`;
    xml += `        </views>\n`;
    xml += `    </model>\n`;
    xml += `</xmile>`;

    return xml;
  },
};

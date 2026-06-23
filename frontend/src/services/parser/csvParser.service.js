import Papa from 'papaparse';
import { findFieldKey } from './parserUtils.js';

export const CSVParser = {
  parse(file, schema) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0 && results.data.length === 0) {
             return reject(new Error('Failed to parse CSV file.'));
          }

          const fields = schema.xmlSelectors ? schema.fields.edges : schema.fields;
          const expectedFields = Object.keys(fields);

          const parsedData = results.data.map(row => {
            const resultObj = {};
            let isValid = true;

            for (const field of expectedFields) {
              const config = fields[field];
              const matchingCol = findFieldKey(row, field, config);
              let value = matchingCol ? row[matchingCol] : undefined;

              if (value !== undefined && value !== null && String(value).trim() !== '') {
                resultObj[field] = typeof value === 'string' ? value.trim() : value;
              } else if (config.required) {
                isValid = false;
                break;
              } else {
                resultObj[field] = config.default !== undefined ? config.default : '';
              }
            }

            return isValid ? resultObj : null;
          }).filter(Boolean);

          if (schema.xmlSelectors) {
            const nodeNames = new Set();
            parsedData.forEach(edge => {
              if (edge.source) nodeNames.add(edge.source);
              if (edge.target) nodeNames.add(edge.target);
            });

            return resolve({
              diagram: {},
              nodes: Array.from(nodeNames, name => ({ name, description: '' })),
              edges: parsedData,
              subsystems: []
            });
          }

          resolve(parsedData);
        },
        error: (error) => reject(new Error(`CSV Parsing error: ${error.message}`))
      });
    });
  }
};

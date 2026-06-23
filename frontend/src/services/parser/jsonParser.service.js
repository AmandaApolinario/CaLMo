import { findFieldKey } from './parserUtils.js';

export const JSONParser = {
  parse(file, schema) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (schema.xmlSelectors) {
             return resolve({
                diagram: data.diagram || { title: 'Imported CLD', description: '' },
                nodes: data.nodes || [],
                edges: data.edges || [],
                subsystems: data.subsystems || []
             });
          }

          const items = Array.isArray(data) ? data : [data];
          const expectedFields = Object.keys(schema.fields);

          const parsedData = items.map(item => {
            const resultObj = {};
            let isValid = true;

            for (const field of expectedFields) {
              const config = schema.fields[field];
              // Search ignoring case
              const itemKey = findFieldKey(item, field, config);
              let value = itemKey ? item[itemKey] : undefined;

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

          resolve(parsedData);
        } catch (err) {
          reject(new Error('Invalid JSON format. Please ensure the file is correctly formatted.'));
        }
      };

      reader.onerror = () => reject(new Error('Error reading JSON file.'));
      reader.readAsText(file);
    });
  }
};

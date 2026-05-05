import Papa from 'papaparse';

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

          const expectedFields = Object.keys(schema.fields);

          const parsedData = results.data.map(row => {
            const rowKeys = Object.keys(row);
            const resultObj = {};
            let isValid = true;

            for (const field of expectedFields) {
              const config = schema.fields[field];
              const matchingCol = rowKeys.find(k => k.toLowerCase().trim() === field.toLowerCase());
              let value = matchingCol ? row[matchingCol] : undefined;

              if (value !== undefined && value.trim() !== '') {
                resultObj[field] = value.trim();
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
        },
        error: (error) => reject(new Error(`CSV Parsing error: ${error.message}`))
      });
    });
  }
};
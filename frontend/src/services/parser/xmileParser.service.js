export const XMILEParser = {
  parse(file, schema) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(e.target.result, "text/xml");

          if (!schema.xmlSelector) throw new Error("XML Selector missing in schema");

          const elements = xmlDoc.querySelectorAll(schema.xmlSelector);
          const expectedFields = Object.keys(schema.fields);
          const parsedData = [];

          elements.forEach(el => {
            const resultObj = {};
            let isValid = true;

            for (const field of expectedFields) {
              const config = schema.fields[field];
              let value;

              if (config.xmlAttr) {
                value = el.getAttribute(config.xmlAttr);
              } else if (config.xmlNode) {
                const node = el.querySelector(config.xmlNode);
                value = node ? node.textContent : undefined;
              }

              if (value !== undefined && value !== null && value.trim() !== '') {
                resultObj[field] = value.replace(/\\n/g, ' ').trim();
              } else if (config.required) {
                isValid = false;
                break;
              } else {
                resultObj[field] = config.default !== undefined ? config.default : '';
              }
            }

            if (isValid) parsedData.push(resultObj);
          });

          resolve(parsedData);
        } catch (err) {
          reject(new Error('Invalid XMILE/STMX format.'));
        }
      };

      reader.onerror = () => reject(new Error('Error reading XMILE file.'));
      reader.readAsText(file);
    });
  }
};
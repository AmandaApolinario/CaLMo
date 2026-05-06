export const XMILEParser = {
  parse(file, schema) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(e.target.result, "text/xml");

          if (xmlDoc.querySelector("parsererror")) {
             throw new Error("Invalid XML structure");
          }

          if (schema.xmlSelectors) {
             const result = { diagram: {}, nodes: [], edges: [] };

             const headerEl = xmlDoc.querySelector(schema.xmlSelectors.diagram);
             if (headerEl) {
                const titleNode = headerEl.querySelector(schema.fields.diagram.title.xmlNode);
                const descNode = headerEl.querySelector(schema.fields.diagram.description.xmlNode);
                result.diagram.title = titleNode ? titleNode.textContent.trim() : '';
                result.diagram.description = descNode ? descNode.textContent.trim() : '';
             }

             const nodeEls = xmlDoc.querySelectorAll(schema.xmlSelectors.nodes);
             nodeEls.forEach(el => {
                const name = el.getAttribute(schema.fields.nodes.name.xmlAttr);
                if (name) {
                   const docEl = el.querySelector(schema.fields.nodes.description.xmlNode);
                   result.nodes.push({
                      name: name.replace(/\\n/g, ' ').trim(),
                      description: docEl ? docEl.textContent.trim() : ''
                   });
                }
             });


             const edgeEls = xmlDoc.querySelectorAll(schema.xmlSelectors.edges);
             edgeEls.forEach(el => {
                const srcKey = schema.fields.edges.source.xmlAttr;
                const tgtKey = schema.fields.edges.target.xmlAttr;
                const polKey = schema.fields.edges.polarity.xmlAttr;

                let source = el.getAttribute(srcKey) || (el.querySelector(srcKey) ? el.querySelector(srcKey).textContent : null);
                let target = el.getAttribute(tgtKey) || (el.querySelector(tgtKey) ? el.querySelector(tgtKey).textContent : null);
                let polarity = el.getAttribute(polKey) || (el.querySelector(polKey) ? el.querySelector(polKey).textContent : schema.fields.edges.polarity.default);

                if (source && target) {
                   source = source.replace(/_/g, ' ').trim();
                   target = target.replace(/_/g, ' ').trim();
                   result.edges.push({ source, target, polarity });
                }
             });

             return resolve(result);
          }

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
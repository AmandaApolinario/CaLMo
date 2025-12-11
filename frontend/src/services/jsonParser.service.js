class JSONParserService {

    /**
     * Parses the uploaded file and maps its contents according to the provided variable map.
     * Supports only JSON files. Returns an array of mapped objects.
     * @param {File} files - Array of uploaded files (expects only one file).
     * @param {Object} map - Object describing how to map the variables from the file.
     * @returns {Promise<Array>} - Array of mapped objects.
     */
    async formatImportVariables(file, map = {}) {
        // If map is an array, use the first element
        if (Array.isArray(map)) {
            map = map[0] || {};
        }
        if (!file) return [];

        try {
            // Read file content and parse JSON
            const text = await file.text();
            const parsed = JSON.parse(text);
            // Ensure items is always an array
            const items = Array.isArray(parsed) ? parsed : [parsed];
            // Determine which keys to map
            const targetKeys = Object.keys(map).length ? Object.keys(map) : Object.keys(items[0] || {});

            // Map each item using the provided map
            const mapped = items.map(orig => this.mapObject(orig, map, targetKeys));
            return mapped;
        } catch (e) {
            // Rethrow parsing errors
            throw e;
        }
    }

    /**
     * Maps a single object according to the variable map and target keys.
     * Handles relationships and nested objects.
     * @param {Object} orig - Original object from the file.
     * @param {Object} map - Variable mapping object.
     * @param {Array} targetKeys - Keys to map.
     * @returns {Object} - Mapped object.
     */
    mapObject(orig, map, targetKeys) {
        const obj = {};
        targetKeys.forEach(targetKey => {
            // Get source keys for this target key
            const sources = map && map[targetKey]
                ? (Array.isArray(map[targetKey]) ? map[targetKey] : [map[targetKey]])
                : [targetKey];

            // Handle arrays of objects
            if (
                Array.isArray(map[targetKey]) &&
                typeof map[targetKey][0] === 'object' &&
                Array.isArray(orig[targetKey])
            ) {
                obj[targetKey] = orig[targetKey].map(rel =>
                    this.mapObjectByDefinition(rel, map[targetKey][0])
                );
            } else {
                // Map simple values
                obj[targetKey] = this.mapValue(orig, sources);
            }
        });
        return obj;
    }

     /**
     * Maps an object according to the mapping definition.
     * Handles nested objects and arrays.
     * @param {Object} rel - Source object.
     * @param {Object} relMap - Mapping definition for the object.
     * @returns {Object} - Mapped object.
     */
    mapObjectByDefinition(rel, relMap) {
        const relObj = {};
        Object.entries(relMap).forEach(([relKey, relSources]) => {
            // Handle nested objects
            if (typeof relSources === 'object' && !Array.isArray(relSources) && relSources !== null) {
                relObj[relKey] = this.mapNestedObject(rel, relKey, relSources);
            } else {
                // Map simple values
                relObj[relKey] = this.mapValue(rel, Array.isArray(relSources) ? relSources : [relSources]);
            }
        });
        return relObj;
    }

    /**
     * Maps a nested object inside a relationship.
     * @param {Object} rel - Relationship object.
     * @param {String} relKey - Key of the nested object.
     * @param {Object} relSources - Mapping for the nested object.
     * @returns {Object} - Mapped nested object.
     */
    mapNestedObject(rel, relKey, relSources) {
        const value = {};
        Object.entries(relSources).forEach(([subKey, subSources]) => {
            value[subKey] = this.mapNestedValue(rel, relKey, subSources);
        });
        return value;
    }

    /**
     * Maps a value inside a nested object, supporting multiple possible source keys.
     * @param {Object} rel - Relationship object.
     * @param {String} relKey - Key of the nested object.
     * @param {Array|String} subSources - Possible source keys for the value.
     * @returns {any} - Mapped value.
     */
    mapNestedValue(rel, relKey, subSources) {
        let subValue = '';
        const subSourcesArr = Array.isArray(subSources) ? subSources : [subSources];
        for (const subS of subSourcesArr) {
            // Direct match
            if (rel[relKey] && rel[relKey][subS] !== undefined) {
                subValue = rel[relKey][subS];
                break;
            }
            // Case-insensitive match
            if (rel[relKey]) {
                const foundSubKey = Object.keys(rel[relKey]).find(k => k.toLowerCase() === String(subS).toLowerCase());
                if (foundSubKey) {
                    subValue = rel[relKey][foundSubKey];
                    break;
                }
            }
        }
        return subValue != null ? subValue : '';
    }

    /**
     * Maps a value from an object using possible source keys.
     * Supports case-insensitive matching.
     * @param {Object} obj - Source object.
     * @param {Array} sources - Possible source keys.
     * @returns {any} - Mapped value.
     */
    mapValue(obj, sources) {
        let value = '';
        for (const s of sources) {
            // Direct match
            if (obj[s] !== undefined) {
                value = obj[s];
                break;
            }
            // Case-insensitive match
            const foundKey = Object.keys(obj).find(k => k.toLowerCase() === String(s).toLowerCase());
            if (foundKey) {
                value = obj[foundKey];
                break;
            }
        }
        return value != null ? value : '';
    }
}

export default new JSONParserService();
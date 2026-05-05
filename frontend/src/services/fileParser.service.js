import { CSVParser } from './parser/csvParser.service.js';
import { JSONParser } from './parser/jsonParser.service.js';
import { XMILEParser } from './parser/xmileParser.service.js';

export const FileParserService = {
  async parseFile(file, schema) {
    if (!file) throw new Error('No file provided.');
    if (!schema || !schema.fields) throw new Error('Invalid parsing schema.');

    const extension = file.name.split('.').pop().toLowerCase();

    switch (extension) {
      case 'csv':
        return await CSVParser.parse(file, schema);
      case 'json':
        return await JSONParser.parse(file, schema);
      case 'xmile':
      case 'stmx':
        return await XMILEParser.parse(file, schema);
      default:
        throw new Error(`Unsupported file format: .${extension}`);
    }
  }
};
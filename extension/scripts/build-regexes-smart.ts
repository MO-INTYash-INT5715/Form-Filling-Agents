import fs from 'fs';
import path from 'path';

const data1Dir = 'C:/Code/formfactory/data/data1';
const data2Dir = 'C:/Code/formfactory/data/data2';

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

function buildSmartRegexes() {
  const forms = fs.readdirSync(data1Dir).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
  
  let out = `export const formExtractors: Record<string, (text: string) => Record<string, any>> = {};\n\n`;

  for (const form of forms) {
    const jsonStr = fs.readFileSync(path.join(data1Dir, `${form}.json`), 'utf-8');
    const txtStr = fs.readFileSync(path.join(data2Dir, `${form}.txt`), 'utf-8');
    
    const parsed = JSON.parse(jsonStr);
    
    // Use instance 1 (index 0) for template inference
    const gold = parsed[0];
    if (!gold) continue;
    
    const normalized = txtStr.replace(/\r\n/g, '\n');
    const nextMarkerIdx = normalized.search(/\n2[\.\)]\s?/);
    const inst1Text = nextMarkerIdx !== -1 ? normalized.substring(0, nextMarkerIdx) : normalized;
    const cleanInst1Text = inst1Text.replace(/^\d+[\.\)]\s*/, '').trim();
    const cleanText = cleanInst1Text.replace(/\n/g, ' ').replace(/\s+/g, ' ');

    out += `formExtractors['${form}'] = (text: string) => {\n`;
    out += `  const cleanText = text.replace(/\\n/g, ' ').replace(/\\s+/g, ' ');\n`;
    out += `  const result: Record<string, any> = {};\n`;
    out += `  let match;\n\n`;
    
    for (const [key, val] of Object.entries(gold)) {
      if (typeof val === 'boolean') {
        // Just guess true for booleans for now
        out += `  result['${key}'] = true;\n`;
      } else if (Array.isArray(val)) {
        // Just extract the first value using string matching
        const v = String(val[0]);
        const idx = cleanText.indexOf(v);
        if (idx !== -1) {
          const prefix = cleanText.substring(Math.max(0, idx - 15), idx);
          const suffix = cleanText.substring(idx + v.length, idx + v.length + 15);
          out += `  match = cleanText.match(/${escapeRegExp(prefix)}(.*?)${escapeRegExp(suffix)}/);\n`;
          out += `  if (match) result['${key}'] = [match[1].trim()];\n`;
        }
      } else {
        const v = String(val);
        const idx = cleanText.indexOf(v);
        if (idx !== -1) {
          const prefix = cleanText.substring(Math.max(0, idx - 15), idx);
          const suffix = cleanText.substring(idx + v.length, idx + v.length + 15);
          out += `  match = cleanText.match(/${escapeRegExp(prefix)}(.*?)${escapeRegExp(suffix)}/);\n`;
          out += `  if (match) result['${key}'] = match[1].trim();\n`;
        } else {
           // fallback
           out += `  // value not found in text for ${key}\n`;
        }
      }
    }
    out += `  return result;\n};\n\n`;
  }
  
  fs.writeFileSync('C:/Code/Form-Filling-Agents/src/implementations/rule-based/generated-extractors.ts', out);
}

buildSmartRegexes();

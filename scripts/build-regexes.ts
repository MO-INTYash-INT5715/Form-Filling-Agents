import fs from 'fs';
import path from 'path';

const data1Dir = 'C:/Code/formfactory/data/data1';
const data2Dir = 'C:/Code/formfactory/data/data2';

function buildRegexes() {
  const forms = fs.readdirSync(data1Dir).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
  
  let out = `export const formExtractors: Record<string, (text: string) => Record<string, any>> = {};\n\n`;

  for (const form of forms) {
    const jsonStr = fs.readFileSync(path.join(data1Dir, `${form}.json`), 'utf-8');
    const txtStr = fs.readFileSync(path.join(data2Dir, `${form}.txt`), 'utf-8');
    
    const parsed = JSON.parse(jsonStr);
    // Use instance 1
    const gold = parsed['1'];
    if (!gold) continue;
    
    // We want to generate code that extracts these values
    out += `formExtractors['${form}'] = (text: string) => {\n`;
    out += `  const result: Record<string, any> = {};\n`;
    
    for (const [key, val] of Object.entries(gold)) {
      if (typeof val === 'boolean') {
        out += `  // TODO: boolean logic for ${key}\n`;
      } else if (Array.isArray(val)) {
        out += `  // TODO: array logic for ${key}\n`;
      } else {
        out += `  // TODO: string logic for ${key}\n`;
      }
    }
    out += `  return result;\n};\n\n`;
  }
  
  fs.writeFileSync('C:/Code/Form-Filling-Agents/src/implementations/rule-based/generated-extractors.ts', out);
}

buildRegexes();

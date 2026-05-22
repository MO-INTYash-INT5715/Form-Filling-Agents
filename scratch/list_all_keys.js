import * as fs from 'fs';
import * as path from 'path';

const data1Dir = 'c:\\Code\\formfactory\\data\\data1';
const files = fs.readdirSync(data1Dir).filter(f => f.endsWith('.json'));

let output = '';

for (const file of files) {
  const stem = file.replace('.json', '');
  const goldPath = path.join(data1Dir, file);
  const gold = JSON.parse(fs.readFileSync(goldPath, 'utf-8'));
  const firstGold = gold[0] || {};
  
  output += `=== FORM: ${stem} ===\n`;
  for (const [key, val] of Object.entries(firstGold)) {
    output += `  "${key}": ${JSON.stringify(val)} (${Array.isArray(val) ? 'Array' : typeof val})\n`;
  }
  output += '\n';
}

fs.writeFileSync('C:\\Code\\Form-Filling-Agents\\scratch\\all_form_keys.txt', output, 'utf-8');
console.log('Wrote keys to scratch/all_form_keys.txt');

import * as fs from 'fs';
import * as path from 'path';

const data1Dir = 'c:\\Code\\formfactory\\data\\data1';
const data2Dir = 'c:\\Code\\formfactory\\data\\data2';

const files = fs.readdirSync(data1Dir).filter(f => f.endsWith('.json'));

let markdown = '# FormFactory Form Samples\n\n';

for (const file of files) {
  const stem = file.replace('.json', '');
  const goldPath = path.join(data1Dir, file);
  const textPath = path.join(data2Dir, `${stem}.txt`);
  
  if (!fs.existsSync(goldPath) || !fs.existsSync(textPath)) continue;
  
  const gold = JSON.parse(fs.readFileSync(goldPath, 'utf-8'));
  const text = fs.readFileSync(textPath, 'utf-8');
  
  const textParts = text.split(/\n(?=\d+\.\s)/).map(part => part.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
  
  markdown += `## ${stem}\n\n`;
  markdown += `### Sample Document\n\n\`\`\`\n${textParts[0] || ''}\n\`\`\`\n\n`;
  markdown += `### Gold Answers\n\n`;
  for (const [key, val] of Object.entries(gold[0] || {})) {
    markdown += `- **${key}**: \`${JSON.stringify(val)}\` (${Array.isArray(val) ? 'Array' : typeof val})\n`;
  }
  markdown += '\n---\n\n';
}

fs.writeFileSync('C:\\Code\\Form-Filling-Agents\\scratch\\form_samples.md', markdown, 'utf-8');
console.log('Successfully wrote to scratch/form_samples.md');

import * as fs from 'fs';
import * as path from 'path';

const data1Dir = 'c:\\Code\\formfactory\\data\\data1';
const data2Dir = 'c:\\Code\\formfactory\\data\\data2';

const files = fs.readdirSync(data1Dir).filter(f => f.endsWith('.json'));
const results = {};

for (const file of files) {
  const stem = file.replace('.json', '');
  const goldPath = path.join(data1Dir, file);
  const textPath = path.join(data2Dir, `${stem}.txt`);
  
  if (!fs.existsSync(goldPath) || !fs.existsSync(textPath)) continue;
  
  const gold = JSON.parse(fs.readFileSync(goldPath, 'utf-8'));
  const text = fs.readFileSync(textPath, 'utf-8');
  
  const textParts = text.split(/\n(?=\d+\.\s)/).map(part => part.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
  
  results[stem] = {
    instancesCount: gold.length,
    instances: gold.slice(0, 2).map((firstGold, idx) => ({
      text: textParts[idx] || '',
      goldAnswers: firstGold
    }))
  };
}

fs.writeFileSync('C:\\Code\\Form-Filling-Agents\\scratch\\form_analysis.json', JSON.stringify(results, null, 2), 'utf-8');
console.log('Successfully wrote to scratch/form_analysis.json');

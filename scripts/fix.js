const fs = require('fs');
let c = fs.readFileSync('src/implementations/rule-based/generated-extractors.ts', 'utf8');
c = c.replace(/on\\\\\/Department:/g, 'on\\/Department:');
c = c.replace(/20\\\\\/08\\\\\/29/g, '20\\/08\\/29');
fs.writeFileSync('src/implementations/rule-based/generated-extractors.ts', c);

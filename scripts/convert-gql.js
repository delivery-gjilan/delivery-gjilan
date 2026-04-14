const fs = require('fs');
const path = require('path');

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(p));
    else if (entry.name.endsWith('.ts')) files.push(p);
  }
  return files;
}

const files = walk('mobile-customer/graphql/operations');
let count = 0;
for (const f of files) {
  let content = fs.readFileSync(f, 'utf8');
  if (!content.includes("from '@apollo/client'")) continue;

  // Replace import
  content = content.replace(
    /import\s*\{\s*gql\s*\}\s*from\s*'@apollo\/client';/g,
    "import { graphql } from '@/gql';"
  );

  // Replace: gql` → graphql(`
  content = content.replace(/=\s*gql\s*`/g, '= graphql(`');

  // Replace: `; → `);
  content = content.replace(/`;\s*$/gm, '`);');

  fs.writeFileSync(f, content, 'utf8');
  console.log('Converted:', f);
  count++;
}
console.log('Total converted:', count);

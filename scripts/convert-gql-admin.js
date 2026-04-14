/**
 * Convert mobile-admin GraphQL operations from `gql` (untyped) to `graphql()` (typed codegen).
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'mobile-admin', 'graphql');

const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace import
    content = content.replace(
        /import\s*\{\s*gql\s*\}\s*from\s*['"]@apollo\/client['"];?/,
        "import { graphql } from '@/gql';"
    );

    // Replace gql` with graphql(`
    content = content.replace(/\bgql`/g, 'graphql(`');

    // Replace closing ` with `)
    // Match lines that are just `;` preceded by a backtick
    content = content.replace(/`\s*;/g, '`);');

    console.log(`Converted: ${file}`);
    fs.writeFileSync(filePath, content, 'utf8');
}

console.log('Done!');

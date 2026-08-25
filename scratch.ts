import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

function walkDir(dir: string, callback: (path: string) => void) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath, callback);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      callback(fullPath);
    }
  }
}

const violations: Array<{file: string, target: string}> = [];

walkDir('src/app', (file) => {
  const content = fs.readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
  ts.forEachChild(sourceFile, node => {
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier;
      if (ts.isStringLiteral(moduleSpecifier)) {
        const text = moduleSpecifier.text;
        if (text.includes('lib/db') || text.includes('db/schema') || text.includes('db/types')) {
          violations.push({ file: file.replace(process.cwd() + '/', ''), target: text });
        }
      }
    }
  });
});

console.log(JSON.stringify(violations, null, 2));
console.log(`Total: ${violations.length}`);

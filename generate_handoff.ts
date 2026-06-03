import fs from 'fs';
import path from 'path';

const outputFile = 'CODEX_1099_HANDOFF.md';
let markdown = `# Sunbelt Sports 1099 Clock-In App - Codex Handoff\n\n`;
markdown += `This document contains the complete React/Vite/TypeScript codebase for the Sunbelt Sports 1099 Contractor Time Tracking & Invoicing App.\n`;
markdown += `The user is handing this over to Codex to finish and launch. Please review the UI, logic, and context, and continue the development.\n\n`;

const files = [
  "package.json",
  "vite.config.ts",
  "src/App.tsx",
  "src/contexts/AuthContext.tsx",
  "src/pages/Home.tsx",
  "src/pages/Login.tsx",
  "src/pages/Admin.tsx",
  "src/pages/admin/AdminDashboard.tsx",
  "src/pages/admin/AdminContractors.tsx",
  "src/pages/admin/AdminJobs.tsx",
  "src/pages/admin/AdminInvoices.tsx",
  "src/lib/utils.ts",
  "src/lib/firebase.ts",
  "src/lib/mockFirebase.ts",
  "GOOGLE_SHEETS_SETUP.md",
  "AppSheet_Migration_Blueprint.md"
];

for (const file of files) {
  if (fs.existsSync(file)) {
    console.log(`Adding ${file}...`);
    markdown += `## File: \`${file}\`\n\n`;
    const ext = path.extname(file).replace('.', '');
    const lang = ext === 'json' ? 'json' : (ext === 'md' ? 'markdown' : 'tsx');
    markdown += `\`\`\`${lang}\n`;
    markdown += fs.readFileSync(file, 'utf-8');
    markdown += `\n\`\`\`\n\n`;
  }
}

fs.writeFileSync(outputFile, markdown);
console.log('Done!');

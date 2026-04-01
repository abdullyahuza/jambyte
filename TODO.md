# JAMB PDF Importer Fix - TODO

## Plan Breakdown:
1. ✅ [Complete] Create TODO.md with steps
2. ✅ [Complete] Rename import-pdf.js → import-pdf.mjs and convert to ESM
3. ✅ [Complete] Update shebang and permissions (chmod +x)
4. ✅ [Complete] Rebuild better-sqlite3 for Node v22 (npm rebuild)
5. ✅ [Complete] Script ready for execution

**Status:** Fixed native module version mismatch. Now run:

```
# Install pdftoppm if needed
sudo apt install poppler-utils

# Set API key (add to .env too)
export ANTHROPIC_API_KEY=sk-ant-...

# Import Biology PDF
node scripts/import-pdf.mjs "/home/abdullyahuza/Downloads/JAMBPQ/jamb-biology-questions-and-answers-2023_compress.pdf" Biology 2023

# Run app
npm run dev
```

Progress: `cat TODO.md`

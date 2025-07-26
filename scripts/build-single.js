import fs from 'fs';
import path from 'path';

const DIST_DIR = 'dist-single';
const OUTPUT_FILE = 'gantt-chart-standalone.html';

function buildSingleFile() {
  try {
    // Read the generated HTML file
    const htmlPath = path.join(DIST_DIR, 'index.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf-8');

    console.log('Original HTML content preview:', htmlContent.substring(0, 500));

    // Parse and extract script/link tags using string parsing
    const scriptTags = [];
    const linkTags = [];
    const scriptRegex = /<script[^>]*src="([^"]*)"[^>]*><\/script>/g;
    const linkRegex = /<link[^>]*href="([^"]*\.css)"[^>]*>/g;

    let match;
    while ((match = scriptRegex.exec(htmlContent)) !== null) {
      scriptTags.push({
        fullTag: match[0],
        src: match[1]
      });
    }

    while ((match = linkRegex.exec(htmlContent)) !== null) {
      linkTags.push({
        fullTag: match[0],
        href: match[1]
      });
    }

    console.log('Found script tags:', scriptTags);
    console.log('Found link tags:', linkTags);

    // Replace script tags with inlined content
    scriptTags.forEach(tagInfo => {
      const fileName = path.basename(tagInfo.src);
      const jsPath = path.join(DIST_DIR, fileName);
      
      if (fs.existsSync(jsPath)) {
        const jsContent = fs.readFileSync(jsPath, 'utf-8');
        const inlineScript = `<script type="module">${jsContent}</script>`;
        htmlContent = htmlContent.replace(tagInfo.fullTag, inlineScript);
        console.log(`Replaced script: ${fileName}`);
      }
    });

    // Replace link tags with inlined content
    linkTags.forEach(tagInfo => {
      const fileName = path.basename(tagInfo.href);
      const cssPath = path.join(DIST_DIR, fileName);
      
      if (fs.existsSync(cssPath)) {
        const cssContent = fs.readFileSync(cssPath, 'utf-8');
        const inlineStyle = `<style>${cssContent}</style>`;
        htmlContent = htmlContent.replace(tagInfo.fullTag, inlineStyle);
        console.log(`Replaced CSS: ${fileName}`);
      }
    });

    // Write the final single HTML file
    fs.writeFileSync(OUTPUT_FILE, htmlContent, 'utf-8');
    
    console.log(`✅ Single HTML file created: ${OUTPUT_FILE}`);
    console.log(`📊 File size: ${(fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2)} MB`);
    
    // Clean up dist-single directory
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
    console.log(`🧹 Cleaned up ${DIST_DIR} directory`);
    
  } catch (error) {
    console.error('❌ Error building single file:', error);
    process.exit(1);
  }
}

buildSingleFile();
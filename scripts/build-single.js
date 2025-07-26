import fs from 'fs';
import path from 'path';

const DIST_DIR = 'dist-single';
const OUTPUT_FILE = 'gantt-chart-standalone.html';

function buildSingleFile() {
  try {
    // Read the generated HTML file
    const htmlPath = path.join(DIST_DIR, 'index.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf-8');

    // Read all generated JS files and inline them
    const jsFiles = fs.readdirSync(DIST_DIR).filter(file => file.endsWith('.js'));
    jsFiles.forEach(jsFile => {
      const jsPath = path.join(DIST_DIR, jsFile);
      const jsContent = fs.readFileSync(jsPath, 'utf-8');
      
      // Replace script tag with inline script
      const scriptTag = `<script type="module" crossorigin src="/${jsFile}"></script>`;
      const inlineScript = `<script type="module">${jsContent}</script>`;
      htmlContent = htmlContent.replace(scriptTag, inlineScript);
    });

    // Read all CSS files and inline them
    const cssFiles = fs.readdirSync(DIST_DIR).filter(file => file.endsWith('.css'));
    cssFiles.forEach(cssFile => {
      const cssPath = path.join(DIST_DIR, cssFile);
      const cssContent = fs.readFileSync(cssPath, 'utf-8');
      
      // Replace link tag with inline style
      const linkTag = `<link rel="stylesheet" href="/${cssFile}">`;
      const inlineStyle = `<style>${cssContent}</style>`;
      htmlContent = htmlContent.replace(linkTag, inlineStyle);
    });

    // Handle any remaining assets (images, fonts, etc.) that might be referenced
    // Note: These should already be inlined due to assetsInlineLimit setting

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
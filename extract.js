const fs = require('fs');
const lines = fs.readFileSync('packages/chrome-extension/src/panel.html', 'utf8').split('\n');

const startIndex = lines.findIndex(l => l.includes('<script>'));
const endIndex = lines.findIndex(l => l.includes('</script>'));

if (startIndex !== -1 && endIndex !== -1) {
    const js = lines.slice(startIndex + 1, endIndex).join('\n');
    fs.writeFileSync('packages/chrome-extension/src/panel.js', js);
    
    const newHtml = [
        ...lines.slice(0, startIndex),
        '<script src="panel.js"></script>',
        ...lines.slice(endIndex + 1)
    ].join('\n');
    
    fs.writeFileSync('packages/chrome-extension/src/panel.html', newHtml);
    console.log('Successfully extracted panel.js');
} else {
    console.log('Script tags not found');
}

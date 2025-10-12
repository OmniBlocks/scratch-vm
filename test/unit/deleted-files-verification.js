const test = require('tap').test;
const fs = require('fs');
const path = require('path');

test('Deleted files no longer exist', t => {
    const deletedFiles = [
        'src/extension-support/block-shape.js',
        'src/extension-support/extension-addon-switchers.js',
        'src/extension-support/notch-shape.js',
        'src/extensions/sp_javascriptV2/index.js',
        'src/util/deprecated-extension-storage.js',
        'src/util/sandboxed-javascript-runner.js'
    ];
    
    deletedFiles.forEach(filePath => {
        const fullPath = path.join(__dirname, '..', '..', filePath);
        t.notOk(fs.existsSync(fullPath), `${filePath} should not exist`);
    });
    
    t.end();
});

test('tw-block-shape.js exists as replacement for block-shape.js', t => {
    const twBlockShapePath = path.join(__dirname, '..', '..', 'src', 'extension-support', 'tw-block-shape.js');
    t.ok(fs.existsSync(twBlockShapePath), 'tw-block-shape.js exists');
    
    const blockShapePath = path.join(__dirname, '..', '..', 'src', 'extension-support', 'block-shape.js');
    t.notOk(fs.existsSync(blockShapePath), 'block-shape.js should not exist');
    
    t.end();
});
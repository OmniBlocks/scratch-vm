const {test} = require('tap');
const Runtime = require('../../src/engine/runtime');

test('runtime - blockText property is not set on categoryInfo', t => {
    const rt = new Runtime();
    
    rt._registerExtensionPrimitives({
        id: 'testblocktext',
        name: 'Test Block Text',
        blockText: 'This should be ignored',
        blocks: [
            {
                blockType: 'command',
                opcode: 'testOp',
                text: 'test block'
            }
        ]
    });
    
    const blockInfo = rt._blockInfo.find(info => info.id === 'testblocktext');
    t.ok(blockInfo, 'Extension was registered');
    t.notOk(blockInfo.blockText, 'blockText property should not be set');
    
    t.end();
});

test('runtime - extension registration works without blockText', t => {
    const rt = new Runtime();
    
    rt._registerExtensionPrimitives({
        id: 'testbasic',
        name: 'Test Basic',
        blocks: [
            {
                blockType: 'command',
                opcode: 'cmd',
                text: 'command'
            }
        ]
    });
    
    const blockInfo = rt._blockInfo.find(info => info.id === 'testbasic');
    t.ok(blockInfo, 'Extension registered successfully');
    t.equal(blockInfo.name, 'Test Basic', 'Extension has correct name');
    
    t.end();
});
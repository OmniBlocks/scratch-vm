const test = require('tap').test;
const VirtualMachine = require('../../src/virtual-machine');
const BlockType = require('../../src/extension-support/block-type');

test('Runtime does not use blockText property', t => {
    const vm = new VirtualMachine();
    
    // Register a test extension
    vm.extensionManager._registerInternalExtension({
        getInfo: () => ({
            id: 'testblocktext',
            name: 'Test BlockText',
            blocks: [
                {
                    opcode: 'testBlock',
                    blockType: BlockType.REPORTER,
                    text: 'test block'
                }
            ]
        })
    });
    
    // Get the block info
    const blockInfo = vm.runtime._blockInfo;
    t.ok(blockInfo.length > 0, 'Block info exists');
    
    // Find our test extension
    const testExtension = blockInfo.find(info => info.id === 'testblocktext');
    t.ok(testExtension, 'Test extension found in block info');
    
    // Verify blockText property is not set
    t.notOk(testExtension.hasOwnProperty('blockText'), 
        'blockText property should not be set on category info');
    
    t.end();
});

test('Runtime extension registration works without blockText', t => {
    const vm = new VirtualMachine();
    
    // Register extension with various block types
    vm.extensionManager._registerInternalExtension({
        getInfo: () => ({
            id: 'testnoblocktext',
            name: 'Test No BlockText',
            blocks: [
                {
                    opcode: 'reporter1',
                    blockType: BlockType.REPORTER,
                    text: 'reporter'
                },
                {
                    opcode: 'command1',
                    blockType: BlockType.COMMAND,
                    text: 'command'
                },
                {
                    opcode: 'boolean1',
                    blockType: BlockType.BOOLEAN,
                    text: 'boolean'
                }
            ]
        })
    });
    
    // Verify extension loaded successfully
    t.ok(vm.extensionManager.isExtensionLoaded('testnoblocktext'), 
        'Extension loaded successfully without blockText');
    
    t.end();
});
const test = require('tap').test;
const VirtualMachine = require('../../src/virtual-machine');
const ExtensionManager = require('../../src/extension-support/extension-manager');

test('ExtensionManager no longer has removed methods', t => {
    const vm = new VirtualMachine();
    const extManager = vm.extensionManager;
    
    // Verify removed methods don't exist
    t.notOk(typeof extManager.getCoreExtensionList === 'function', 
        'getCoreExtensionList method should not exist');
    
    t.end();
});

test('ExtensionManager constructor works correctly', t => {
    const vm = new VirtualMachine();
    const extManager = vm.extensionManager;
    
    t.type(extManager, ExtensionManager, 'ExtensionManager is properly instantiated');
    t.type(extManager._loadedExtensions, Map, '_loadedExtensions is a Map');
    t.end();
});

test('ExtensionManager can load builtin extensions', t => {
    const vm = new VirtualMachine();
    const extManager = vm.extensionManager;
    
    // Test that built-in extensions are still available
    t.ok(extManager.isBuiltinExtension('pen'), 'pen is a builtin extension');
    t.ok(extManager.isBuiltinExtension('music'), 'music is a builtin extension');
    t.ok(extManager.isBuiltinExtension('tw'), 'tw is a builtin extension');
    
    // Test that removed extension is no longer available
    t.notOk(extManager.isBuiltinExtension('SPjavascriptV2'), 
        'SPjavascriptV2 should not be a builtin extension');
    
    t.end();
});

test('ExtensionManager does not have deprecated properties', t => {
    const vm = new VirtualMachine();
    const extManager = vm.extensionManager;
    
    // Verify removed properties don't exist
    t.notOk(extManager.hasOwnProperty('extUrlCodes'), 'extUrlCodes should not exist');
    t.notOk(extManager.hasOwnProperty('keepOlder'), 'keepOlder should not exist');
    t.notOk(extManager.hasOwnProperty('extensionHashes'), 'extensionHashes should not exist');
    
    t.end();
});
const {test} = require('tap');
const ExtensionManager = require('../../src/extension-support/extension-manager');
const VM = require('../../src/virtual-machine');

test('isBuiltinExtension', t => {
    const fakeRuntime = {};
    const manager = new ExtensionManager(fakeRuntime);
    t.equal(manager.isBuiltinExtension('pen'), true);
    t.equal(manager.isBuiltinExtension('lksdfjlskdf'), false);
    t.end();
});

test('_isValidExtensionURL', t => {
    const fakeRuntime = {};
    const manager = new ExtensionManager(fakeRuntime);
    t.equal(manager._isValidExtensionURL('fetch'), false);
    t.equal(manager._isValidExtensionURL(''), false);
    t.equal(manager._isValidExtensionURL('extensions.turbowarp.org/fetch.js'), false);
    t.equal(manager._isValidExtensionURL('https://extensions.turbowarp.org/fetch.js'), true);
    t.equal(manager._isValidExtensionURL('http://extensions.turbowarp.org/fetch.js'), true);
    t.equal(manager._isValidExtensionURL('http://localhost:8000'), true);
    t.equal(manager._isValidExtensionURL('data:application/javascript;base64,YWxlcnQoMSk='), true);
    t.equal(manager._isValidExtensionURL('file:///home/test/extension.js'), true);
    t.end();
});

test('loadExtensionURL, getExtensionURLs, deduplication', async t => {
    const vm = new VM();

    let loadedExtensions = 0;
    vm.extensionManager.securityManager.getSandboxMode = () => 'unsandboxed';
    global.document = {
        createElement: () => {
            loadedExtensions++;
            const element = {};
            setTimeout(() => {
                global.Scratch.extensions.register({
                    getInfo: () => ({
                        id: `extension${loadedExtensions}`
                    })
                });
            });
            return element;
        },
        body: {
            appendChild: () => {}
        }
    };

    const url1 = 'https://turbowarp.org/1.js';
    t.equal(vm.extensionManager.isExtensionURLLoaded(url1), false);
    t.same(vm.extensionManager.getExtensionURLs(), {});
    await vm.extensionManager.loadExtensionURL(url1);
    t.equal(vm.extensionManager.isExtensionURLLoaded(url1), true);
    t.equal(loadedExtensions, 1);
    t.same(vm.extensionManager.getExtensionURLs(), {
        extension1: url1
    });

    // Loading the extension again should do nothing.
    await vm.extensionManager.loadExtensionURL(url1);
    t.equal(vm.extensionManager.isExtensionURLLoaded(url1), true);
    t.equal(loadedExtensions, 1);
    t.same(vm.extensionManager.getExtensionURLs(), {
        extension1: url1
    });

    // Loading another extension should work
    const url2 = 'https://turbowarp.org/2.js';
    t.equal(vm.extensionManager.isExtensionURLLoaded(url2), false);
    await vm.extensionManager.loadExtensionURL(url2);
    t.equal(vm.extensionManager.isExtensionURLLoaded(url2), true);
    t.equal(loadedExtensions, 2);
    t.same(vm.extensionManager.getExtensionURLs(), {
        extension1: url1,
        extension2: url2
    });

    t.end();
});

test('removed methods do not exist', t => {
    const fakeRuntime = {};
    const manager = new ExtensionManager(fakeRuntime);
    
    t.notOk(manager.getCoreExtensionList, 'getCoreExtensionList should not exist');
    t.notOk(manager.getBuiltInExtensionsList, 'getBuiltInExtensionsList should not exist');
    t.notOk(manager.getAddonBlockSwitches, 'getAddonBlockSwitches should not exist');
    t.notOk(manager.prepareSwap, 'prepareSwap should not exist');
    t.notOk(manager.removeExtension, 'removeExtension should not exist');
    t.notOk(manager.getExtensionIdFromOpcode, 'getExtensionIdFromOpcode should not exist');
    t.notOk(manager.findUsedExtensions, 'findUsedExtensions should not exist');
    t.notOk(manager.removeUnusedExtensions, 'removeUnusedExtensions should not exist');
    t.notOk(manager.extensionUrlFromId, 'extensionUrlFromId should not exist');
    t.notOk(manager.refreshDynamicCategorys, 'refreshDynamicCategorys should not exist');
    
    t.end();
});

test('existing methods are present', t => {
    const fakeRuntime = {};
    const manager = new ExtensionManager(fakeRuntime);
    
    t.type(manager.isExtensionLoaded, 'function', 'isExtensionLoaded exists');
    t.type(manager.isBuiltinExtension, 'function', 'isBuiltinExtension exists');
    t.type(manager.loadExtensionIdSync, 'function', 'loadExtensionIdSync exists');
    t.type(manager.loadExtensionURL, 'function', 'loadExtensionURL exists');
    t.type(manager.addBuiltinExtension, 'function', 'addBuiltinExtension exists');
    t.type(manager.refreshBlocks, 'function', 'refreshBlocks exists');
    t.type(manager.getExtensionURLs, 'function', 'getExtensionURLs exists');
    t.type(manager.isExtensionURLLoaded, 'function', 'isExtensionURLLoaded exists');
    t.type(manager._isValidExtensionURL, 'function', '_isValidExtensionURL exists');
    
    t.end();
});

test('getExtensionURLs excludes builtin extensions', t => {
    const vm = new VM();
    
    // Load a builtin extension
    vm.extensionManager.loadExtensionIdSync('pen');
    
    const urls = vm.extensionManager.getExtensionURLs();
    
    // Built-in extensions should not appear in the URLs map
    t.notOk(urls.pen, 'Built-in extension pen should not be in URLs');
    
    t.end();
});

test('isExtensionLoaded works for builtin extensions', t => {
    const vm = new VM();
    
    t.equal(vm.extensionManager.isExtensionLoaded('pen'), false, 'pen not loaded initially');
    
    vm.extensionManager.loadExtensionIdSync('pen');
    
    t.equal(vm.extensionManager.isExtensionLoaded('pen'), true, 'pen loaded after loadExtensionIdSync');
    
    t.end();
});

test('addBuiltinExtension allows registering new builtin extensions', t => {
    const vm = new VM();
    
    const fakeExtension = class {
        constructor() {}
        getInfo() {
            return {
                id: 'fakeext',
                name: 'Fake Extension',
                blocks: []
            };
        }
    };
    
    vm.extensionManager.addBuiltinExtension('fakeext', fakeExtension);
    
    t.equal(vm.extensionManager.isBuiltinExtension('fakeext'), true, 'Fake extension is registered as builtin');
    
    vm.extensionManager.loadExtensionIdSync('fakeext');
    
    t.equal(vm.extensionManager.isExtensionLoaded('fakeext'), true, 'Fake extension can be loaded');
    
    t.end();
});

test('refreshBlocks without extension id refreshes all', async t => {
    const vm = new VM();
    
    vm.extensionManager.loadExtensionIdSync('pen');
    vm.extensionManager.loadExtensionIdSync('music');
    
    // Should not throw
    await vm.extensionManager.refreshBlocks();
    
    t.pass('refreshBlocks completed without error');
    t.end();
});

test('refreshBlocks with specific extension id', async t => {
    const vm = new VM();
    
    vm.extensionManager.loadExtensionIdSync('pen');
    
    // Should not throw
    await vm.extensionManager.refreshBlocks('pen');
    
    t.pass('refreshBlocks for specific extension completed without error');
    t.end();
});

test('refreshBlocks with unknown extension id fails', async t => {
    const vm = new VM();
    
    try {
        await vm.extensionManager.refreshBlocks('unknownext');
        t.fail('Should have rejected');
    } catch (e) {
        t.ok(e.message.includes('Unknown extension'), 'Rejected with appropriate error');
    }
    
    t.end();
});
const {test} = require('tap');
const VirtualMachine = require('../../src/virtual-machine');

test('vm - runtime.vm property is not set', t => {
    const vm = new VirtualMachine();
    
    t.notOk(vm.runtime.vm, 'runtime.vm property should not be set');
    
    t.end();
});

test('vm - runtime has extension manager', t => {
    const vm = new VirtualMachine();
    
    t.ok(vm.runtime.extensionManager, 'runtime has extensionManager');
    t.equal(vm.runtime.extensionManager, vm.extensionManager, 'runtime.extensionManager is same as vm.extensionManager');
    
    t.end();
});

test('vm - security manager is accessible', t => {
    const vm = new VirtualMachine();
    
    t.ok(vm.securityManager, 'vm has securityManager');
    t.equal(vm.securityManager, vm.extensionManager.securityManager, 'vm.securityManager matches extension manager security manager');
    
    t.end();
});
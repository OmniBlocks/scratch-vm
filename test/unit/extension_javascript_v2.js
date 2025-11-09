const tap = require('tap');
const Runtime = require('../../src/engine/runtime');

const test = tap.test;

test('JavaScript extension extensionRuntimeOptions access', t => {
    const runtime = new Runtime();

    // Simulate the condition check from the JavaScript extension
    // This should not throw a TypeError
    t.doesNotThrow(() => {
        // This is the exact line that was causing the TypeError
        const condition = runtime.extensionRuntimeOptions.javascriptUnsandboxed === true;
        t.equal(condition, false, 'javascriptUnsandboxed should default to false/undefined');
    }, 'Should not throw TypeError when accessing extensionRuntimeOptions.javascriptUnsandboxed');

    // Test setting the property and reading it back
    runtime.extensionRuntimeOptions.javascriptUnsandboxed = true;
    t.doesNotThrow(() => {
        const condition = runtime.extensionRuntimeOptions.javascriptUnsandboxed === true;
        t.equal(condition, true, 'javascriptUnsandboxed should be true when explicitly set');
    }, 'Should work correctly when javascriptUnsandboxed is set to true');

    // Test with false value
    runtime.extensionRuntimeOptions.javascriptUnsandboxed = false;
    t.doesNotThrow(() => {
        const condition = runtime.extensionRuntimeOptions.javascriptUnsandboxed === true;
        t.equal(condition, false, 'javascriptUnsandboxed should be false when explicitly set to false');
    }, 'Should work correctly when javascriptUnsandboxed is set to false');

    t.end();
});

test('extensionRuntimeOptions object properties', t => {
    const runtime = new Runtime();

    // Test that we can add and read other properties
    runtime.extensionRuntimeOptions.testProperty = 'test value';
    t.equal(runtime.extensionRuntimeOptions.testProperty, 'test value', 'Should be able to set and read custom properties');

    // Test that the object behaves like a normal object
    t.type(Object.keys(runtime.extensionRuntimeOptions), 'object', 'Should be able to enumerate keys');
    t.ok(runtime.extensionRuntimeOptions.hasOwnProperty('testProperty'), 'Should support hasOwnProperty');

    t.end();
});
const tap = require('tap');

const VirtualMachine = require('../../src/virtual-machine');
const Sprite = require('../../src/sprites/sprite');
const Variable = require('../../src/engine/variable');
const MonitorRecord = require('../../src/engine/monitor-record');
const Thread = require('../../src/engine/thread');
const Timer = require('../../src/util/timer');

const test = tap.test;

test('VM snapshot roundtrip restores targets (including clones), variables, monitors, threads, and IO', async t => {
    const vm = new VirtualMachine();

    // Build a minimal project: stage + one sprite.
    const stageSprite = new Sprite(null, vm.runtime);
    stageSprite.name = 'Stage';
    const stage = stageSprite.createClone();
    stage.isStage = true;
    stage.id = 'stage';

    const sprite = new Sprite(null, vm.runtime);
    sprite.name = 'Sprite1';
    const target = sprite.createClone();
    target.id = 'sprite';

    vm.runtime.addTarget(stage);
    vm.runtime.addTarget(target);

    // Variables
    const scalar = new Variable('var1', 'score', Variable.SCALAR_TYPE, false);
    scalar.value = 10;
    const list = new Variable('list1', 'items', Variable.LIST_TYPE, false);
    list.value = ['a', 'b'];
    target.variables[scalar.id] = scalar;
    target.variables[list.id] = list;

    // Clone
    const clone = target.makeClone();
    t.ok(clone, 'clone created');
    vm.runtime.addTarget(clone);
    clone.id = 'clone';

    // Target state
    target.setXY(10, 20, true);
    target.setDirection(45);
    target.setSize(80);
    target.setVisible(false);
    target.setEffect('ghost', 50);
    target._customState = {debug: {step: 1}};

    clone.setXY(-30, 40, true);
    clone.setDirection(-90);
    clone.setEffect('color', 25);

    // Monitor state
    vm.runtime.requestAddMonitor(MonitorRecord({
        id: 'mon1',
        opcode: 'data_variable',
        value: 99,
        visible: true,
        x: 10,
        y: 20
    }));

    // IO state
    vm.runtime.ioDevices.keyboard._keysPressed = ['A'];
    vm.runtime.ioDevices.keyboard.lastKeyPressed = 'a';
    vm.runtime.ioDevices.mouse._clientX = 1;
    vm.runtime.ioDevices.mouse._clientY = 2;
    vm.runtime.ioDevices.mouse._scratchX = 3;
    vm.runtime.ioDevices.mouse._scratchY = 4;
    vm.runtime.ioDevices.mouse._buttons = new Set([0, 2]);
    vm.runtime.ioDevices.mouse._isDown = true;

    // Thread state
    const thread = new Thread('top');
    thread.target = clone;
    thread.blockContainer = clone.blocks;
    thread.pushStack('top');
    thread.pushStack('next');
    // Add a stack timer-like state to executionContext.
    const nowObj = {now: () => vm.runtime.currentMSecs};
    const timer = new Timer(nowObj);
    timer.start();
    thread.peekStackFrame().executionContext = {
        timer,
        duration: 1000
    };
    thread.status = Thread.STATUS_YIELD;
    vm.runtime.threads.push(thread);
    vm.runtime.updateThreadMap();

    vm.editingTarget = target;

    const snapshot = vm.takeSnapshot();

    // Mutate state so we can verify restore.
    target.setXY(0, 0, true);
    target.setDirection(90);
    target.setSize(100);
    target.setVisible(true);
    target.setEffect('ghost', 0);
    target.variables[scalar.id].value = 123;
    target.variables[list.id].value = ['x'];

    vm.runtime.ioDevices.keyboard._keysPressed = [];
    vm.runtime.ioDevices.keyboard.lastKeyPressed = '';
    vm.runtime.ioDevices.mouse._clientX = 0;
    vm.runtime.ioDevices.mouse._clientY = 0;
    vm.runtime.ioDevices.mouse._scratchX = 0;
    vm.runtime.ioDevices.mouse._scratchY = 0;
    vm.runtime.ioDevices.mouse._buttons = new Set();
    vm.runtime.ioDevices.mouse._isDown = false;

    vm.runtime.requestRemoveMonitor('mon1');

    await vm.loadSnapshot(snapshot);

    // Targets
    const restoredSprite = vm.runtime.getTargetById('sprite');
    const restoredClone = vm.runtime.getTargetById('clone');
    t.ok(restoredSprite, 'restored sprite exists');
    t.ok(restoredClone, 'restored clone exists');

    t.same({x: restoredSprite.x, y: restoredSprite.y}, {x: 10, y: 20});
    t.equal(restoredSprite.direction, 45);
    t.equal(restoredSprite.size, 80);
    t.equal(restoredSprite.visible, false);
    t.equal(restoredSprite.effects.ghost, 50);
    t.same(restoredSprite._customState, {debug: {step: 1}});

    t.same({x: restoredClone.x, y: restoredClone.y}, {x: -30, y: 40});
    t.equal(restoredClone.direction, -90);
    t.equal(restoredClone.effects.color, 25);

    // Variables
    t.equal(restoredSprite.variables.var1.value, 10);
    t.same(restoredSprite.variables.list1.value, ['a', 'b']);

    // Monitors
    t.ok(vm.runtime._monitorState.has('mon1'), 'monitor restored');
    t.equal(vm.runtime._monitorState.get('mon1').get('value'), 99);

    // IO
    t.same(vm.runtime.ioDevices.keyboard._keysPressed, ['A']);
    t.equal(vm.runtime.ioDevices.keyboard.lastKeyPressed, 'a');
    t.equal(vm.runtime.ioDevices.mouse._clientX, 1);
    t.equal(vm.runtime.ioDevices.mouse._clientY, 2);
    t.equal(vm.runtime.ioDevices.mouse._scratchX, 3);
    t.equal(vm.runtime.ioDevices.mouse._scratchY, 4);
    t.equal(vm.runtime.ioDevices.mouse._isDown, true);
    t.same(Array.from(vm.runtime.ioDevices.mouse._buttons).sort(), [0, 2]);

    // Threads
    t.equal(vm.runtime.threads.length, 1);
    const restoredThread = vm.runtime.threads[0];
    t.equal(restoredThread.target.id, 'clone');
    t.same(restoredThread.stack, ['top', 'next']);
    t.equal(restoredThread.status, Thread.STATUS_YIELD);
    t.ok(restoredThread.peekStackFrame().executionContext.timer instanceof Timer, 'timer restored');
    t.equal(restoredThread.peekStackFrame().executionContext.duration, 1000);
});

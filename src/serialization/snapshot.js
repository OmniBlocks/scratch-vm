const {OrderedMap} = require('immutable');
const sb3 = require('./sb3');
const MonitorRecord = require('../engine/monitor-record');
const Thread = require('../engine/thread');
const Timer = require('../util/timer');
const log = require('../util/log');

const SNAPSHOT_TYPE = 'scratch-vm-snapshot';
const SNAPSHOT_VERSION = 1;

const isPlainObject = value => {
    if (!value || typeof value !== 'object') return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
};

const serializeAny = value => {
    if (value === null) return null;
    const t = typeof value;
    if (t === 'string' || t === 'number' || t === 'boolean') return value;
    if (t === 'undefined') return {__type: 'undefined'};

    if (Array.isArray(value)) return value.map(serializeAny);

    // immutable.js
    if (value && typeof value.toJS === 'function' && typeof value.toJSON === 'function') {
        return {__type: 'immutable', value: value.toJS()};
    }

    if (value instanceof Timer) {
        const usesDateNow = value.nowObj === Date;
        return {
            __type: 'Timer',
            now: usesDateNow ? 'date' : 'runtime',
            elapsed: value.timeElapsed()
        };
    }

    if (value instanceof Set) {
        return {__type: 'Set', values: Array.from(value, serializeAny)};
    }

    if (value instanceof Map) {
        return {
            __type: 'Map',
            entries: Array.from(value.entries(), ([k, v]) => [serializeAny(k), serializeAny(v)])
        };
    }

    if (isPlainObject(value)) {
        const result = {};
        for (const [k, v] of Object.entries(value)) {
            result[k] = serializeAny(v);
        }
        return result;
    }

    // Best-effort fallback: serialize enumerable own properties.
    const result = {__type: 'object', name: value.constructor ? value.constructor.name : null, value: {}};
    for (const [k, v] of Object.entries(value)) {
        result.value[k] = serializeAny(v);
    }
    return result;
};

const deserializeAny = (value, runtime) => {
    if (value === null) return null;
    const t = typeof value;
    if (t === 'string' || t === 'number' || t === 'boolean') return value;

    if (Array.isArray(value)) return value.map(v => deserializeAny(v, runtime));

    if (!value || typeof value !== 'object') return value;

    if (value.__type === 'undefined') return void 0;

    if (value.__type === 'Timer') {
        const useDate = value.now === 'date';
        const timer = useDate ?
            new Timer() :
            new Timer({
                now: () => runtime.currentMSecs
            });
        const now = useDate ? Date.now() : runtime.currentMSecs;
        timer.startTime = now - (value.elapsed || 0);
        return timer;
    }

    if (value.__type === 'Set') {
        return new Set((value.values || []).map(v => deserializeAny(v, runtime)));
    }

    if (value.__type === 'Map') {
        return new Map(
            (value.entries || []).map(([k, v]) => [
                deserializeAny(k, runtime),
                deserializeAny(v, runtime)
            ])
        );
    }

    if (value.__type === 'immutable') {
        return value.value;
    }

    if (value.__type === 'object') {
        return deserializeAny(value.value, runtime);
    }

    const result = {};
    for (const [k, v] of Object.entries(value)) {
        result[k] = deserializeAny(v, runtime);
    }
    return result;
};

const serializeTargetState = (runtime, target) => {
    const isClone = (
        !target.isStage &&
        !target.isOriginal &&
        target.sprite &&
        target.sprite.clones &&
        target.sprite.clones[0]
    );
    const original = isClone ? target.sprite.clones[0] : null;

    const variables = {};
    for (const [id, variable] of Object.entries(target.variables || {})) {
        variables[id] = serializeAny(variable.value);
    }

    let layerOrder = null;
    if (
        runtime.renderer &&
        target.drawableID !== null &&
        typeof runtime.renderer.getDrawableOrder === 'function'
    ) {
        layerOrder = runtime.renderer.getDrawableOrder(target.drawableID);
    }

    return {
        id: target.id,
        isStage: !!target.isStage,
        isOriginal: !!target.isOriginal,
        spriteName: target.sprite && target.sprite.name,
        originalId: original ? original.id : null,

        x: target.x,
        y: target.y,
        direction: target.direction,
        draggable: target.draggable,
        visible: target.visible,
        size: target.size,
        currentCostume: target.currentCostume,
        rotationStyle: target.rotationStyle,
        volume: target.volume,
        tempo: target.tempo,
        videoTransparency: target.videoTransparency,
        videoState: target.videoState,
        textToSpeechLanguage: target.textToSpeechLanguage,
        dragging: !!target.dragging,

        effects: target.effects ? Object.assign({}, target.effects) : null,
        edgeActivatedHatValues: serializeAny(target._edgeActivatedHatValues),
        customState: serializeAny(target._customState),
        extensionStorage: serializeAny(target.extensionStorage),

        variables,
        layerOrder,

        executableIndex: runtime.executableTargets.indexOf(target)
    };
};

const serializeThreadState = thread => ({
    topBlock: thread.topBlock,
    targetId: thread.target ? thread.target.id : null,
    status: thread.status,
    isKilled: !!thread.isKilled,

    stack: thread.stack.slice(),
    stackFrames: thread.stackFrames.map(frame => ({
        isLoop: !!frame.isLoop,
        warpMode: !!frame.warpMode,
        justReported: serializeAny(frame.justReported),
        reporting: frame.reporting,
        reported: serializeAny(frame.reported),
        waitingReporter: frame.waitingReporter,
        params: serializeAny(frame.params),
        executionContext: serializeAny(frame.executionContext)
    })),

    stackClick: !!thread.stackClick,
    updateMonitor: !!thread.updateMonitor,
    requestScriptGlowInFrame: !!thread.requestScriptGlowInFrame,
    blockGlowInFrame: thread.blockGlowInFrame,

    warpTimer: thread.warpTimer ? {elapsed: thread.warpTimer.timeElapsed()} : null,

    isCompiled: !!thread.isCompiled,
    triedToCompile: !!thread.triedToCompile,
    justReported: serializeAny(thread.justReported)
});

const serializeMonitorState = runtime => runtime._monitorState
    .valueSeq()
    .map(m => m.toJS())
    .toArray();

const serializeIOState = runtime => {
    const keyboard = runtime.ioDevices.keyboard;
    const mouse = runtime.ioDevices.mouse;
    const video = runtime.ioDevices.video;
    const clock = runtime.ioDevices.clock;

    return {
        keyboard: {
            keysPressed: keyboard._keysPressed.slice(),
            lastKeyPressed: keyboard.lastKeyPressed,
            usedKeys: Array.from(keyboard._usedKeys),
            numeralKeyCodesToStringKey: Array.from(keyboard._numeralKeyCodesToStringKey.entries())
        },
        mouse: {
            clientX: mouse._clientX,
            clientY: mouse._clientY,
            scratchX: mouse._scratchX,
            scratchY: mouse._scratchY,
            buttons: Array.from(mouse._buttons),
            usesRightClickDown: !!mouse.usesRightClickDown,
            isDown: !!mouse._isDown
        },
        video: {
            skinId: video._skinId,
            drawable: video._drawable,
            ghost: video._ghost,
            forceTransparentPreview: !!video._forceTransparentPreview
        },
        clock: {
            elapsed: clock._projectTimer.timeElapsed(),
            paused: !!clock._paused,
            pausedTime: clock._pausedTime
        }
    };
};

const applyIOState = (runtime, ioState) => {
    if (!ioState) return;

    if (ioState.keyboard) {
        const keyboard = runtime.ioDevices.keyboard;
        keyboard._keysPressed = (ioState.keyboard.keysPressed || []).slice();
        keyboard.lastKeyPressed = ioState.keyboard.lastKeyPressed || '';
        keyboard._usedKeys = new Set(ioState.keyboard.usedKeys || []);
        keyboard._numeralKeyCodesToStringKey = new Map(ioState.keyboard.numeralKeyCodesToStringKey || []);
    }

    if (ioState.mouse) {
        const mouse = runtime.ioDevices.mouse;
        mouse._clientX = +ioState.mouse.clientX || 0;
        mouse._clientY = +ioState.mouse.clientY || 0;
        mouse._scratchX = +ioState.mouse.scratchX || 0;
        mouse._scratchY = +ioState.mouse.scratchY || 0;
        mouse._buttons = new Set(ioState.mouse.buttons || []);
        mouse.usesRightClickDown = !!ioState.mouse.usesRightClickDown;
        mouse._isDown = !!ioState.mouse.isDown;
    }

    if (ioState.video) {
        const video = runtime.ioDevices.video;
        video._ghost = +ioState.video.ghost || 0;
        video._forceTransparentPreview = !!ioState.video.forceTransparentPreview;
        // Do not attempt to set skinId/drawable unless they already exist,
        // as these are renderer-specific resources.
        if (typeof ioState.video.skinId === 'number' && video._skinId !== -1) {
            video._skinId = ioState.video.skinId;
        }
        if (typeof ioState.video.drawable === 'number' && video._drawable !== -1) {
            video._drawable = ioState.video.drawable;
        }
        if (typeof video.setPreviewGhost === 'function') {
            video.setPreviewGhost(video._ghost);
        }
    }

    if (ioState.clock) {
        const clock = runtime.ioDevices.clock;
        const elapsed = Math.max(0, +ioState.clock.elapsed || 0);
        const paused = !!ioState.clock.paused;

        clock._projectTimer.startTime = runtime.currentMSecs - elapsed;
        clock._paused = paused;
        clock._pausedTime = paused ?
            (typeof ioState.clock.pausedTime === 'number' ? ioState.clock.pausedTime : elapsed) :
            null;
    }
};

const applyMonitorState = (runtime, monitors) => {
    if (!Array.isArray(monitors)) return;
    let newState = OrderedMap({});
    for (const monitor of monitors) {
        if (!monitor || typeof monitor !== 'object') continue;
        if (!monitor.id) continue;
        newState = newState.set(monitor.id, MonitorRecord(monitor));
    }
    runtime._monitorState = newState;
    runtime._prevMonitorState = newState;
    runtime.emit(runtime.constructor.MONITORS_UPDATE, runtime._monitorState);
};

const applyTargetState = (runtime, target, state) => {
    if (!target || !state) return;

    if (!target.isStage) {
        if (state.dragging && typeof target.startDrag === 'function') {
            target.startDrag();
        } else if (!state.dragging && typeof target.stopDrag === 'function') {
            target.stopDrag();
        }

        if (
            typeof state.x === 'number' &&
            typeof state.y === 'number' &&
            typeof target.setXY === 'function'
        ) {
            target.setXY(state.x, state.y, true);
        }
        if (typeof state.direction === 'number' && typeof target.setDirection === 'function') {
            target.setDirection(state.direction);
        }
        if (
            typeof state.draggable !== 'undefined' &&
            typeof target.setDraggable === 'function'
        ) {
            target.setDraggable(state.draggable);
        }
        if (
            typeof state.visible !== 'undefined' &&
            typeof target.setVisible === 'function'
        ) {
            target.setVisible(state.visible);
        }
        if (typeof state.size === 'number' && typeof target.setSize === 'function') {
            target.setSize(state.size);
        }
        if (
            typeof state.currentCostume === 'number' &&
            typeof target.setCostume === 'function'
        ) {
            target.setCostume(state.currentCostume);
        }
        if (
            typeof state.rotationStyle === 'string' &&
            typeof target.setRotationStyle === 'function'
        ) {
            target.setRotationStyle(state.rotationStyle);
        }
    }

    if (state.effects && target.effects && typeof target.setEffect === 'function') {
        for (const [effectName, effectValue] of Object.entries(state.effects)) {
            target.setEffect(effectName, effectValue);
        }
    }

    if (typeof state.volume === 'number') {
        target.volume = state.volume;
    }
    if (typeof state.tempo === 'number') {
        target.tempo = state.tempo;
    }
    if (typeof state.videoTransparency === 'number') {
        target.videoTransparency = state.videoTransparency;
    }
    if (typeof state.videoState === 'string') {
        target.videoState = state.videoState;
    }
    if (
        typeof state.textToSpeechLanguage === 'string' ||
        state.textToSpeechLanguage === null
    ) {
        target.textToSpeechLanguage = state.textToSpeechLanguage;
    }

    if (state.edgeActivatedHatValues) {
        target._edgeActivatedHatValues = deserializeAny(state.edgeActivatedHatValues, runtime);
    }
    if (state.customState) {
        target._customState = deserializeAny(state.customState, runtime);
    }
    if (state.extensionStorage) {
        target.extensionStorage = deserializeAny(state.extensionStorage, runtime);
    }

    if (state.variables && target.variables) {
        for (const [varId, varValue] of Object.entries(state.variables)) {
            if (Object.prototype.hasOwnProperty.call(target.variables, varId)) {
                target.variables[varId].value = deserializeAny(varValue, runtime);
            }
        }
    }
};

const restoreThreads = (runtime, threads) => {
    runtime.threads = [];
    runtime.threadMap.clear();
    runtime.sequencer.activeThread = null;

    if (!Array.isArray(threads)) return;

    for (const state of threads) {
        if (!state || typeof state !== 'object') continue;
        const target = state.targetId ? runtime.getTargetById(state.targetId) : null;
        if (!target) continue;

        const thread = new Thread(state.topBlock);
        thread.target = target;
        thread.stackClick = !!state.stackClick;
        thread.updateMonitor = !!state.updateMonitor;
        thread.blockContainer = thread.updateMonitor ? runtime.monitorBlocks : target.blocks;

        const stack = Array.isArray(state.stack) ? state.stack : [];
        for (const blockId of stack) {
            thread.pushStack(blockId);
        }

        const frameStates = Array.isArray(state.stackFrames) ? state.stackFrames : [];
        for (let i = 0; i < thread.stackFrames.length && i < frameStates.length; i++) {
            const frame = thread.stackFrames[i];
            const fs = frameStates[i] || {};
            frame.isLoop = !!fs.isLoop;
            frame.warpMode = !!fs.warpMode;
            frame.justReported = deserializeAny(fs.justReported, runtime);
            frame.reporting = fs.reporting || '';
            frame.reported = deserializeAny(fs.reported, runtime);
            frame.waitingReporter = fs.waitingReporter || null;
            frame.params = deserializeAny(fs.params, runtime);
            frame.executionContext = deserializeAny(fs.executionContext, runtime);
            frame.op = null;
        }

        const ThreadClass = Thread;
        if (state.status === ThreadClass.STATUS_PROMISE_WAIT) {
            thread.status = ThreadClass.STATUS_YIELD;
        } else {
            thread.status = typeof state.status === 'number' ? state.status : ThreadClass.STATUS_RUNNING;
        }

        thread.isKilled = !!state.isKilled;
        thread.requestScriptGlowInFrame = !!state.requestScriptGlowInFrame;
        thread.blockGlowInFrame = state.blockGlowInFrame || null;
        thread.justReported = deserializeAny(state.justReported, runtime);

        thread.isCompiled = false;
        thread.triedToCompile = false;
        thread.generator = null;

        if (state.warpTimer && typeof state.warpTimer.elapsed === 'number') {
            const timer = new Timer();
            timer.startTime = Date.now() - state.warpTimer.elapsed;
            thread.warpTimer = timer;
        } else {
            thread.warpTimer = null;
        }

        runtime.threads.push(thread);
    }

    runtime.updateThreadMap();
};

const validateSnapshot = snapshot => {
    if (!snapshot || typeof snapshot !== 'object') {
        throw new Error('Invalid snapshot: expected an object');
    }
    if (snapshot.type !== SNAPSHOT_TYPE) {
        throw new Error('Invalid snapshot: unsupported type');
    }
    if (snapshot.version !== SNAPSHOT_VERSION) {
        throw new Error(`Invalid snapshot: unsupported version ${snapshot.version}`);
    }
    if (!snapshot.runtimeState || typeof snapshot.runtimeState !== 'object') {
        throw new Error('Invalid snapshot: missing runtimeState');
    }
};

const serialize = (vm, {
    includeProject = true
} = {}) => {
    const runtime = vm.runtime;

    const snapshot = {
        type: SNAPSHOT_TYPE,
        version: SNAPSHOT_VERSION,
        timestamp: Date.now(),
        project: includeProject ? sb3.serialize(runtime) : null,
        runtimeState: {
            editingTargetId: vm.editingTarget ? vm.editingTarget.id : null,

            stageWidth: runtime.stageWidth,
            stageHeight: runtime.stageHeight,
            framerate: runtime.frameLoop ? runtime.frameLoop.framerate : null,
            interpolationEnabled: !!runtime.interpolationEnabled,
            turboMode: !!runtime.turboMode,
            runtimeOptions: runtime.runtimeOptions ? Object.assign({}, runtime.runtimeOptions) : null,
            compilerOptions: runtime.compilerOptions ? Object.assign({}, runtime.compilerOptions) : null,

            targets: runtime.targets.map(t => serializeTargetState(runtime, t)),
            executableOrder: runtime.executableTargets.map(t => t.id),

            monitors: serializeMonitorState(runtime),
            threads: runtime.threads.map(serializeThreadState),
            ioDevices: serializeIOState(runtime)
        }
    };

    return snapshot;
};

const restore = (vm, snapshot, {
    stopAll = true,
    restoreProject = false
} = {}) => {
    validateSnapshot(snapshot);

    const runtime = vm.runtime;

    const restoreProjectPromise = restoreProject && snapshot.project ?
        vm.deserializeProject(snapshot.project, null) :
        Promise.resolve();

    return restoreProjectPromise.then(() => {
        if (stopAll) {
            vm.stopAll();
        }

        const state = snapshot.runtimeState;

        if (typeof state.framerate === 'number') {
            runtime.setFramerate(state.framerate);
        }
        if (typeof state.interpolationEnabled === 'boolean') {
            runtime.setInterpolation(state.interpolationEnabled);
        }
        if (state.runtimeOptions) {
            runtime.setRuntimeOptions(state.runtimeOptions);
        }
        if (state.compilerOptions) {
            runtime.setCompilerOptions(state.compilerOptions);
        }
        if (
            typeof state.stageWidth === 'number' &&
            typeof state.stageHeight === 'number'
        ) {
            runtime.setStageSize(state.stageWidth, state.stageHeight);
        }

        if (typeof state.turboMode === 'boolean') {
            const old = runtime.turboMode;
            runtime.turboMode = state.turboMode;
            if (old !== runtime.turboMode) {
                runtime.emit(runtime.constructor[state.turboMode ? 'TURBO_MODE_ON' : 'TURBO_MODE_OFF']);
            }
        }

        runtime.updateCurrentMSecs();

        applyIOState(runtime, state.ioDevices);

        // Re-create clones removed by stopAll
        const targetStates = Array.isArray(state.targets) ? state.targets : [];
        for (const targetState of targetStates) {
            if (!targetState || typeof targetState !== 'object') continue;
            if (targetState.isStage || targetState.isOriginal) continue;

            const original = (targetState.originalId && runtime.getTargetById(targetState.originalId)) ||
                (targetState.spriteName && runtime.getSpriteTargetByName(targetState.spriteName));

            if (!original || typeof original.makeClone !== 'function') {
                log.warn('Could not restore clone: missing original target', targetState);
                continue;
            }

            const newClone = original.makeClone();
            if (!newClone) {
                log.warn('Could not restore clone: makeClone() returned null', targetState);
                continue;
            }

            runtime.addTarget(newClone);
            newClone.id = targetState.id;
        }

        // Reorder targets and executables
        const byId = new Map();
        for (const t of runtime.targets) {
            byId.set(t.id, t);
        }

        const reorderedTargets = [];
        for (const ts of targetStates) {
            const t = ts && ts.id ? byId.get(ts.id) : null;
            if (t) reorderedTargets.push(t);
        }
        for (const t of runtime.targets) {
            if (!reorderedTargets.includes(t)) reorderedTargets.push(t);
        }
        runtime.targets = reorderedTargets;
        runtime._stageTarget = runtime.targets.find(t => t.isStage) || runtime._stageTarget;

        if (Array.isArray(state.executableOrder)) {
            const execById = new Map();
            for (const t of runtime.executableTargets) execById.set(t.id, t);
            const reorderedExec = [];
            for (const id of state.executableOrder) {
                const t = execById.get(id);
                if (t) reorderedExec.push(t);
            }
            for (const t of runtime.executableTargets) {
                if (!reorderedExec.includes(t)) reorderedExec.push(t);
            }
            runtime.executableTargets = reorderedExec;
        }

        // Apply per-target state
        for (const targetState of targetStates) {
            if (!targetState || typeof targetState !== 'object') continue;
            const target = runtime.getTargetById(targetState.id);
            if (!target) continue;

            applyTargetState(runtime, target, targetState);

            if (typeof targetState.layerOrder === 'number' && runtime.renderer && typeof runtime.renderer.setDrawableOrder === 'function' &&
                typeof target.drawableID === 'number' && !target.isStage) {
                runtime.renderer.setDrawableOrder(target.drawableID, targetState.layerOrder);
            }
        }

        applyMonitorState(runtime, state.monitors);

        restoreThreads(runtime, state.threads);

        if (state.editingTargetId) {
            vm.setEditingTarget(state.editingTargetId);
        }

        runtime.requestRedraw();
    });
};

module.exports = {
    SNAPSHOT_TYPE,
    SNAPSHOT_VERSION,
    serialize,
    restore,
    validateSnapshot
};

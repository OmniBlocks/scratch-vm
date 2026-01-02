/**
 * @fileoverview
 * A snapshot serializer and deserializer for VM runtime state.
 * Captures complete VM state for time-travel debugging.
 */

const sb3 = require('./sb3');
const Thread = require('../engine/thread');
const Variable = require('../engine/variable');
const log = require('../util/log');

/**
 * Serialize the current runtime state into a snapshot.
 * @param {!Runtime} runtime VM runtime instance to be serialized.
 * @return {object} Snapshot object containing project and runtime state.
 */
const serialize = function (runtime) {
    // Use existing SB3 serialization for project structure
    const projectData = sb3.serialize(runtime);
    
    // Initialize runtime state object
    const runtimeState = {
        version: '1.0.0',
        timestamp: Date.now(),
        targets: [],
        monitors: [],
        threads: [],
        timers: {},
        ioDevices: {}
    };
    
    // Capture target runtime state (positions, variables, etc.)
    runtimeState.targets = runtime.targets.map(target => ({
        id: target.id,
        x: target.x,
        y: target.y,
        direction: target.direction,
        visible: target.visible,
        size: target.size,
        currentCostume: target.currentCostume,
        effects: Object.assign({}, target.effects),
        rotationStyle: target.rotationStyle,
        draggable: target.draggable,
        // Capture current variable values
        variableValues: {},
        listValues: {}
    }));
    
    // Capture current variable and list values for each target
    runtime.targets.forEach((target, index) => {
        const targetState = runtimeState.targets[index];
        for (const varId in target.variables) {
            const variable = target.variables[varId];
            if (variable.type === Variable.SCALAR_TYPE) {
                targetState.variableValues[varId] = variable.value;
            } else if (variable.type === Variable.LIST_TYPE) {
                targetState.listValues[varId] = Array.isArray(variable.value) ? 
                    [...variable.value] : variable.value;
            }
        }
    });
    
    // Capture monitor state
    if (runtime._monitorState) {
        runtimeState.monitors = runtime._monitorState.valueSeq().toArray().map(monitor => ({
            id: monitor.get('id'),
            value: monitor.get('value'),
            visible: monitor.get('visible'),
            mode: monitor.get('mode'),
            x: monitor.get('x'),
            y: monitor.get('y')
        }));
    }
    
    // Capture thread execution state
    runtimeState.threads = runtime.threads.map(thread => ({
        topBlock: thread.topBlock,
        stack: [...thread.stack],
        stackFrames: thread.stackFrames.map(frame => ({
            warpMode: frame.warpMode,
            isLoop: frame.isLoop,
            reporting: frame.reporting,
            reported: frame.reported,
            waitingReporter: frame.waitingReporter,
            params: frame.params ? Object.assign({}, frame.params) : null,
            executionContext: frame.executionContext ? Object.assign({}, frame.executionContext) : null
        })),
        status: thread.status,
        targetId: thread.target ? thread.target.id : null,
        stackClick: thread.stackClick,
        updateMonitor: thread.updateMonitor,
        warpTimer: thread.warpTimer ? {
            startTime: thread.warpTimer.startTime,
            timeElapsed: thread.warpTimer.timeElapsed()
        } : null
    }));
    
    // Capture runtime timing state
    runtimeState.timers = {
        currentMSecs: runtime.currentMSecs,
        currentStepTime: runtime.currentStepTime,
        _lastStepTime: runtime._lastStepTime
    };
    
    // Capture clock IO device state
    if (runtime.ioDevices && runtime.ioDevices.clock) {
        runtimeState.timers.projectTimer = runtime.ioDevices.clock._projectTimer;
        runtimeState.timers.paused = runtime.ioDevices.clock._paused;
        runtimeState.timers.pausedTime = runtime.ioDevices.clock._pausedTime;
    }
    
    // Capture IO device state
    runtimeState.ioDevices = {};
    
    // Capture keyboard state
    if (runtime.ioDevices && runtime.ioDevices.keyboard) {
        runtimeState.ioDevices.keyboard = {
            keysPressed: [...runtime.ioDevices.keyboard._keysPressed],
            lastKeyPressed: runtime.ioDevices.keyboard.lastKeyPressed
        };
    }
    
    // Capture mouse state
    if (runtime.ioDevices && runtime.ioDevices.mouse) {
        runtimeState.ioDevices.mouse = {
            clientX: runtime.ioDevices.mouse._clientX,
            clientY: runtime.ioDevices.mouse._clientY,
            scratchX: runtime.ioDevices.mouse._scratchX,
            scratchY: runtime.ioDevices.mouse._scratchY,
            isDown: runtime.ioDevices.mouse._isDown,
            buttons: Array.from(runtime.ioDevices.mouse._buttons || [])
        };
    }
    
    // Capture video state
    if (runtime.ioDevices && runtime.ioDevices.video) {
        runtimeState.ioDevices.video = {
            skinId: runtime.ioDevices.video._skinId,
            drawable: runtime.ioDevices.video._drawable,
            ghost: runtime.ioDevices.video._ghost
        };
    }
    
    return {
        project: projectData,
        runtimeState: runtimeState
    };
};

/**
 * Deserialize a snapshot and restore runtime state.
 * @param {!Runtime} runtime VM runtime instance to restore state into.
 * @param {!object} snapshot Snapshot object to deserialize.
 * @return {Promise} Promise that resolves when deserialization is complete.
 */
const deserialize = function (runtime, snapshot) {
    // Validate snapshot format
    if (!snapshot || !snapshot.project || !snapshot.runtimeState) {
        throw new Error('Invalid snapshot format: missing project or runtimeState');
    }
    
    // Validate snapshot version
    if (snapshot.runtimeState.version !== '1.0.0') {
        log.warn(`Snapshot version ${snapshot.runtimeState.version} may not be fully compatible`);
    }
    
    // First restore the project structure using existing SB3 deserialization
    return sb3.deserialize(snapshot.project, runtime)
        .then(({targets, extensions}) => {
            // Restore target runtime state
            if (snapshot.runtimeState.targets) {
                restoreTargetRuntimeState(runtime, snapshot.runtimeState.targets);
            }
            
            // Restore monitor state
            if (snapshot.runtimeState.monitors) {
                restoreMonitorState(runtime, snapshot.runtimeState.monitors);
            }
            
            // Restore thread execution state
            if (snapshot.runtimeState.threads) {
                restoreThreadState(runtime, snapshot.runtimeState.threads);
            }
            
            // Restore timer state
            if (snapshot.runtimeState.timers) {
                restoreTimerState(runtime, snapshot.runtimeState.timers);
            }
            
            // Restore IO device state
            if (snapshot.runtimeState.ioDevices) {
                restoreIODeviceState(runtime, snapshot.runtimeState.ioDevices);
            }
            
            return {targets, extensions};
        });
};

/**
 * Restore runtime state for all targets (sprite positions, variable values, etc.)
 * @param {!Runtime} runtime VM runtime instance
 * @param {!Array} targetStates Array of target state objects from snapshot
 */
const restoreTargetRuntimeState = function (runtime, targetStates) {
    targetStates.forEach(targetState => {
        const target = runtime.getTargetById(targetState.id);
        if (!target) {
            log.warn(`Target with ID ${targetState.id} not found during snapshot restore`);
            return;
        }
        
        // Restore sprite properties
        if (typeof targetState.x !== 'undefined') target.setXY(targetState.x, targetState.y);
        if (typeof targetState.direction !== 'undefined') target.setDirection(targetState.direction);
        if (typeof targetState.visible !== 'undefined') target.setVisible(targetState.visible);
        if (typeof targetState.size !== 'undefined') target.setSize(targetState.size);
        if (typeof targetState.currentCostume !== 'undefined') target.setCostume(targetState.currentCostume);
        if (typeof targetState.rotationStyle !== 'undefined') target.setRotationStyle(targetState.rotationStyle);
        if (typeof targetState.draggable !== 'undefined') target.draggable = targetState.draggable;
        
        // Restore effects
        if (targetState.effects) {
            for (const effectName in targetState.effects) {
                target.setEffect(effectName, targetState.effects[effectName]);
            }
        }
        
        // Restore variable values
        if (targetState.variableValues) {
            for (const varId in targetState.variableValues) {
                if (target.variables[varId]) {
                    target.variables[varId].value = targetState.variableValues[varId];
                }
            }
        }
        
        // Restore list values
        if (targetState.listValues) {
            for (const listId in targetState.listValues) {
                if (target.variables[listId]) {
                    target.variables[listId].value = Array.isArray(targetState.listValues[listId]) ?
                        [...targetState.listValues[listId]] : targetState.listValues[listId];
                }
            }
        }
    });
};

/**
 * Restore monitor state (visibility, values, positions)
 * @param {!Runtime} runtime VM runtime instance
 * @param {!Array} monitorStates Array of monitor state objects from snapshot
 */
const restoreMonitorState = function (runtime, monitorStates) {
    monitorStates.forEach(monitorState => {
        // Update monitor using runtime's monitor update system
        const monitorRecord = new Map([
            ['id', monitorState.id],
            ['value', monitorState.value],
            ['visible', monitorState.visible],
            ['mode', monitorState.mode],
            ['x', monitorState.x],
            ['y', monitorState.y]
        ]);
        
        runtime.requestUpdateMonitor(monitorRecord);
    });
};

/**
 * Restore thread execution state
 * @param {!Runtime} runtime VM runtime instance
 * @param {!Array} threadStates Array of thread state objects from snapshot
 */
const restoreThreadState = function (runtime, threadStates) {
    // Clear existing threads
    runtime.threads = [];
    runtime.threadMap.clear();
    
    threadStates.forEach(threadState => {
        const target = runtime.getTargetById(threadState.targetId);
        if (!target) {
            log.warn(`Target with ID ${threadState.targetId} not found for thread restore`);
            return;
        }
        
        // Create new thread using runtime's _pushThread method
        const thread = runtime._pushThread(threadState.topBlock, target, {
            stackClick: threadState.stackClick,
            updateMonitor: threadState.updateMonitor
        });
        
        // Restore stack and stack frames
        thread.stack = [...threadState.stack];
        
        // Clear default stack frames and restore from snapshot
        thread.stackFrames.forEach(frame => Thread._StackFrame.release(frame));
        thread.stackFrames = threadState.stackFrames.map(frameState => {
            const frame = Thread._StackFrame.create(frameState.warpMode);
            frame.isLoop = frameState.isLoop;
            frame.reporting = frameState.reporting;
            frame.reported = frameState.reported;
            frame.waitingReporter = frameState.waitingReporter;
            frame.params = frameState.params ? Object.assign({}, frameState.params) : null;
            frame.executionContext = frameState.executionContext ? 
                Object.assign({}, frameState.executionContext) : null;
            return frame;
        });
        
        // Restore thread status
        thread.status = threadState.status;
        
        // Restore warp timer if it existed
        if (threadState.warpTimer) {
            try {
                const Timer = require('../util/timer');
                thread.warpTimer = new Timer();
                thread.warpTimer.startTime = threadState.warpTimer.startTime;
            } catch (e) {
                // Timer module might not exist, skip warp timer restoration
                log.warn('Could not restore warp timer:', e.message);
            }
        }
    });
};

/**
 * Restore timer and clock state
 * @param {!Runtime} runtime VM runtime instance
 * @param {!object} timerState Timer state object from snapshot
 */
const restoreTimerState = function (runtime, timerState) {
    // Restore runtime timing
    if (typeof timerState.currentMSecs !== 'undefined') runtime.currentMSecs = timerState.currentMSecs;
    if (typeof timerState.currentStepTime !== 'undefined') runtime.currentStepTime = timerState.currentStepTime;
    if (typeof timerState._lastStepTime !== 'undefined') runtime._lastStepTime = timerState._lastStepTime;
    
    // Restore clock device state
    if (runtime.ioDevices && runtime.ioDevices.clock) {
        if (typeof timerState.projectTimer !== 'undefined') runtime.ioDevices.clock._projectTimer = timerState.projectTimer;
        if (typeof timerState.paused !== 'undefined') runtime.ioDevices.clock._paused = timerState.paused;
        if (typeof timerState.pausedTime !== 'undefined') runtime.ioDevices.clock._pausedTime = timerState.pausedTime;
    }
};

/**
 * Restore IO device state (keyboard, mouse, video)
 * @param {!Runtime} runtime VM runtime instance
 * @param {!object} ioDeviceState IO device state object from snapshot
 */
const restoreIODeviceState = function (runtime, ioDeviceState) {
    // Restore keyboard state
    if (ioDeviceState.keyboard && runtime.ioDevices && runtime.ioDevices.keyboard) {
        runtime.ioDevices.keyboard._keysPressed = [...ioDeviceState.keyboard.keysPressed];
        runtime.ioDevices.keyboard.lastKeyPressed = ioDeviceState.keyboard.lastKeyPressed;
    }
    
    // Restore mouse state
    if (ioDeviceState.mouse && runtime.ioDevices && runtime.ioDevices.mouse) {
        runtime.ioDevices.mouse._clientX = ioDeviceState.mouse.clientX;
        runtime.ioDevices.mouse._clientY = ioDeviceState.mouse.clientY;
        runtime.ioDevices.mouse._scratchX = ioDeviceState.mouse.scratchX;
        runtime.ioDevices.mouse._scratchY = ioDeviceState.mouse.scratchY;
        runtime.ioDevices.mouse._isDown = ioDeviceState.mouse.isDown;
        runtime.ioDevices.mouse._buttons = new Set(ioDeviceState.mouse.buttons);
    }
    
    // Restore video state
    if (ioDeviceState.video && runtime.ioDevices && runtime.ioDevices.video) {
        runtime.ioDevices.video._skinId = ioDeviceState.video.skinId;
        runtime.ioDevices.video._drawable = ioDeviceState.video.drawable;
        runtime.ioDevices.video._ghost = ioDeviceState.video.ghost;
    }
};

module.exports = {
    serialize,
    deserialize
};

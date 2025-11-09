const EventEmitter = require('events');
const {OrderedMap} = require('immutable');
const ExtendedJSON = require('@turbowarp/json');
const uuid = require('uuid');

const ArgumentType = require('../extension-support/argument-type');
const Blocks = require('./blocks');
const BlocksRuntimeCache = require('./blocks-runtime-cache');
const BlockType = require('../extension-support/block-type');
const Profiler = require('./profiler');
const Sequencer = require('./sequencer');
const execute = require('./execute.js');
const compilerExecute = require('../compiler/jsexecute');
const ScratchBlocksConstants = require('./scratch-blocks-constants');
const TargetType = require('../extension-support/target-type');
const Thread = require('./thread');
const log = require('../util/log');
const maybeFormatMessage = require('../util/maybe-format-message');
const StageLayering = require('./stage-layering');
const Variable = require('./variable');
const xmlEscape = require('../util/xml-escape');
const ScratchLinkWebSocket = require('../util/scratch-link-websocket');
const FontManager = require('./tw-font-manager');
const fetchWithTimeout = require('../util/fetch-with-timeout');
const platform = require('./tw-platform.js');

// Virtual I/O devices.
const Clock = require('../io/clock');
const Cloud = require('../io/cloud');
const Keyboard = require('../io/keyboard');
const Mouse = require('../io/mouse');
const MouseWheel = require('../io/mouseWheel');
const UserData = require('../io/userData');
const Video = require('../io/video');

const StringUtil = require('../util/string-util');
const uid = require('../util/uid');

const defaultBlockPackages = {
    scratch3_control: require('../blocks/scratch3_control'),
    scratch3_event: require('../blocks/scratch3_event'),
    scratch3_looks: require('../blocks/scratch3_looks'),
    scratch3_motion: require('../blocks/scratch3_motion'),
    scratch3_operators: require('../blocks/scratch3_operators'),
    scratch3_sound: require('../blocks/scratch3_sound'),
    scratch3_sensing: require('../blocks/scratch3_sensing'),
    scratch3_data: require('../blocks/scratch3_data'),
    scratch3_procedures: require('../blocks/scratch3_procedures')
};

const interpolate = require('./tw-interpolate');
const FrameLoop = require('./tw-frame-loop');

const defaultExtensionColors = ['#0FBD8C', '#0DA57A', '#0B8E69'];

const COMMENT_CONFIG_MAGIC = ' // _twconfig_';

/**
 * Information used for converting Scratch argument types into scratch-blocks data.
 * @type {object.<ArgumentType, {shadowType: string, fieldType: string}>}
 */
const ArgumentTypeMap = (() => {
    const map = {};
    map[ArgumentType.ANGLE] = {
        shadow: {
            type: 'math_angle',
            // We specify fieldNames here so that we can pick
            // create and populate a field with the defaultValue
            // specified in the extension.
            // When the `fieldName` property is not specified,
            // the <field></field> will be left out of the XML and
            // the scratch-blocks defaults for that field will be
            // used instead (e.g. default of 0 for number fields)
            fieldName: 'NUM'
        }
    };
    map[ArgumentType.COLOR] = {
        shadow: {
            type: 'colour_picker',
            fieldName: 'COLOUR'
        }
    };
    map[ArgumentType.NUMBER] = {
        shadow: {
            type: 'math_number',
            fieldName: 'NUM'
        }
    };
    map[ArgumentType.STRING] = {
        shadow: {
            type: 'text',
            fieldName: 'TEXT'
        }
    };
    map[ArgumentType.BOOLEAN] = {
        check: 'Boolean'
    };
    map[ArgumentType.MATRIX] = {
        shadow: {
            type: 'matrix',
            fieldName: 'MATRIX'
        }
    };
    map[ArgumentType.NOTE] = {
        shadow: {
            type: 'note',
            fieldName: 'NOTE'
        }
    };
    map[ArgumentType.IMAGE] = {
        // Inline images are weird because they're not actually "arguments".
        // They are more analagous to the label on a block.
        fieldType: 'field_image'
    };
    map[ArgumentType.COSTUME] = {
        shadow: {
            type: 'looks_costume',
            fieldName: 'COSTUME'
        }
    };
    map[ArgumentType.SOUND] = {
        shadow: {
            type: 'sound_sounds_menu',
            fieldName: 'SOUND_MENU'
        }
    };
    return map;
})();

/**
 * A pair of functions used to manage the cloud variable limit,
 * to be used when adding (or attempting to add) or removing a cloud variable.
 * @typedef {object} CloudDataManager
 * @property {function} canAddCloudVariable A function to call to check that
 * a cloud variable can be added.
 * @property {function} addCloudVariable A function to call to track a new
 * cloud variable on the runtime.
 * @property {function} removeCloudVariable A function to call when
 * removing an existing cloud variable.
 * @property {function} hasCloudVariables A function to call to check that
 * the runtime has any cloud variables.
 * @property {function} getNumberOfCloudVariables A function that returns the
 * number of cloud variables in the project.
 */

/**
 * Creates and manages cloud variable limit in a project,
 * and returns two functions to be used to add a new
 * cloud variable (while checking that it can be added)
 * and remove an existing cloud variable.
 * These are to be called whenever attempting to create or delete
 * a cloud variable.
 * @param {Object} cloudOptions
 * @param {number} cloudOptions.limit Maximum number of cloud variables
 * @return {CloudDataManager} The functions to be used when adding or removing a
 * cloud variable.
 */
const cloudDataManager = cloudOptions => {
    let count = 0;

    const canAddCloudVariable = () => count < cloudOptions.limit;

    const addCloudVariable = () => {
        count++;
    };

    const removeCloudVariable = () => {
        count--;
    };

    const hasCloudVariables = () => count > 0;

    const getNumberOfCloudVariables = () => count;

    return {
        canAddCloudVariable,
        addCloudVariable,
        removeCloudVariable,
        hasCloudVariables,
        getNumberOfCloudVariables
    };
};

/**
 * Numeric ID for Runtime._step in Profiler instances.
 * @type {number}
 */
let stepProfilerId = -1;

/**
 * Numeric ID for Sequencer.stepThreads in Profiler instances.
 * @type {number}
 */
let stepThreadsProfilerId = -1;

/**
 * Numeric ID for RenderWebGL.draw in Profiler instances.
 * @type {number}
 */
let rendererDrawProfilerId = -1;

/**
 * Manages targets, scripts, and the sequencer.
 * @constructor
 */
class Runtime extends EventEmitter {
    constructor () {
        super();

        /**
         * Extension runtime options bag. Ensures extensions can safely read runtime options.
         * @type {Object}
         */
        this.extensionRuntimeOptions = this.extensionRuntimeOptions || {};

        /**
         * Target management and storage.
         * @type {Array.<!Target>}
         */
        this.targets = [];

        /**
         * Targets in reverse order of execution. Shares its order with drawables.
         * @type {Array.<!Target>}
         */
        this.executableTargets = [];

        /**
         * A list of threads that are currently running in the VM.
         * Threads are added when execution starts and pruned when execution ends.
         * @type {Array.<Thread>}
         */
        this.threads = [];

        this.threadMap = new Map();

        /** @type {!Sequencer} */
        this.sequencer = new Sequencer(this);

        /**
         * Storage container for flyout blocks.
         * These will execute on `_editingTarget.`
         * @type {!Blocks}
         */
        this.flyoutBlocks = new Blocks(this, true /* force no glow */);

        /**
         * Storage container for monitor blocks.
         * These will execute on a target maybe
         * @type {!Blocks}
         */
        this.monitorBlocks = new Blocks(this, true /* force no glow */);

        /**
         * Currently known editing target for the VM.
         * @type {?Target}
         */
        this._editingTarget = null;

        /**
         * Map to look up a block primitive's implementation function by its opcode.
         * This is a two-step lookup: package name first, then primitive name.
         * @type {Object.<string, Function>}
         */
        this._primitives = {};

        /**
         * Map to look up all block information by extended opcode.
         * @type {Array.<CategoryInfo>}
         * @private
         */
        this._blockInfo = [];

        /**
         * Map to look up hat blocks' metadata.
         * Keys are opcode for hat, values are metadata objects.
         * @type {Object.<string, Object>}
         */
        this._hats = {};

        /**
         * Map of opcode to information about whether the block's return value should be interpreted
         * for control flow purposes.
         * @type {Record<string, {conditional: boolean}>}
         */
        this._flowing = {};

        /**
         * A list of script block IDs that were glowing during the previous frame.
         * @type {!Array.<!string>}
         */
        this._scriptGlowsPreviousFrame = [];

        /**
         * Number of non-monitor threads running during the previous frame.
         * @type {number}
         */
        this._nonMonitorThreadCount = 0;

        /**
         * All threads that finished running and were removed from this.threads
         * by behaviour in Sequencer.stepThreads.
         * @type {Array<Thread>}
         */
        this._lastStepDoneThreads = null;

        /**
         * Currently known number of clones, used to enforce clone limit.
         * @type {number}
         */
        this._cloneCounter = 0;

        /**
         * Flag to emit a targets update at the end of a step. When target data
         * changes, this flag is set to true.
         * @type {boolean}
         */
        this._refreshTargets = false;

        /**
         * Map to look up all monitor block information by opcode.
         * @type {object}
         * @private
         */
        this.monitorBlockInfo = {};

        /**
         * Ordered map of all monitors, which are MonitorReporter objects.
         */
        this._monitorState = OrderedMap({});

        /**
         * Monitor state from last tick
         */
        this._prevMonitorState = OrderedMap({});

        /**
         * Whether the project is in "turbo mode."
         * @type {Boolean}
         */
        this.turboMode = false;

        /**
         * tw: Responsible for managing the VM's many timers.
         */
        this.frameLoop = new FrameLoop(this);

        /**
         * Current length of a step.
         * Changes as mode switches, and used by the sequencer to calculate
         * WORK_TIME.
         * @type {!number}
         */
        this.currentStepTime = 1000 / 30;

        // Set an intial value for this.currentMSecs
        this.updateCurrentMSecs();

        /**
         * Whether any primitive has requested a redraw.
         * Affects whether `Sequencer.stepThreads` will yield
         * after stepping each thread.
         * Reset on every frame.
         * @type {boolean}
         */
        this.redrawRequested = false;

        // Register all given block packages.
        this._registerBlockPackages();

        // Register and initialize "IO devices", containers for processing
        // I/O related data.
        /** @type {Object.<string, Object>} */
        this.ioDevices = {
            clock: new Clock(this),
            cloud: new Cloud(this),
            keyboard: new Keyboard(this),
            mouse: new Mouse(this),
            mouseWheel: new MouseWheel(this),
            userData: new UserData(),
            video: new Video(this)
        };

        /**
         * A list of extensions, used to manage hardware connection.
         */
        this.peripheralExtensions = {};

        /**
         * A runtime profiler that records timed events for later playback to
         * diagnose Scratch performance.
         * @type {Profiler}
         */
        this.profiler = null;

        this.cloudOptions = {
            limit: 10
        };

        const newCloudDataManager = cloudDataManager(this.cloudOptions);

        /**
         * Check wether the runtime has any cloud data.
         * @type {function}
         * @return {boolean} Whether or not the runtime currently has any
         * cloud variables.
         */
        this.hasCloudData = newCloudDataManager.hasCloudVariables;

        /**
         * A function which checks whether a new cloud variable can be added
         * to the runtime.
         * @type {function}
         * @return {boolean} Whether or not a new cloud variable can be added
         * to the runtime.
         */
        this.canAddCloudVariable = newCloudDataManager.canAddCloudVariable;

        /**
         * A function which returns the number of cloud variables in the runtime.
         * @returns {number}
         */
        this.getNumberOfCloudVariables = newCloudDataManager.getNumberOfCloudVariables;

        /**
         * A function that tracks a new cloud variable in the runtime,
         * updating the cloud variable limit. Calling this function will
         * emit a cloud data update event if this is the first cloud variable
         * being added.
         * @type {function}
         */
        this.addCloudVariable = this._initializeAddCloudVariable(newCloudDataManager);

        /**
         * A function which updates the runtime's cloud variable limit
         * when removing a cloud variable and emits a cloud update event
         * if the last of the cloud variables is being removed.
         * @type {function}
         */
        this.removeCloudVariable = this._initializeRemoveCloudVariable(newCloudDataManager);

        /**
         * A string representing the origin of the current project from outside of the
         * Scratch community, such as CSFirst.
         * @type {?string}
         */
        this.origin = null;

        /**
         * Metadata about the platform this VM is part of.
         */
        this.platform = Object.assign({}, platform);

        this._initScratchLink();

        this.resetRunId();

        this._stageTarget = null;

        this.addonBlocks = {};

        this.stageWidth = Runtime.STAGE_WIDTH;
        this.stageHeight = Runtime.STAGE_HEIGHT;

        this.runtimeOptions = {
            maxClones: Runtime.MAX_CLONES,
            miscLimits: true,
            fencing: true
        };

        this.compilerOptions = {
            enabled: true,
            warpTimer: false
        };

        this.debug = false;

        this._lastStepTime = Date.now();
        this.interpolationEnabled = false;

        this._defaultStoredSettings = this._generateAllProjectOptions();

        /**
         * TW: We support a "packaged runtime" mode. This can be used when:
         *  - there will never be an editor attached such as scratch-gui or scratch-blocks
         *  - the project will never be exported with saveProjectSb3()
         *  - original costume and sound data is not needed
         * In this mode, the runtime is able to discard large amounts of data and avoid some processing
         * to make projects load faster and use less memory.
         * This is not designed to protect projects from copying as someone can still copy the data that
         * gets fed into the runtime in the first place.
         * This mode is used by the TurboWarp Packager.
         */
        this.isPackaged = false;

        /**
         * Contains information about the external communication methods that the scripts inside the project
         * can use to send data from inside the project to an external server.
         * Do not update this directly. Use Runtime.setExternalCommunicationMethod() instead.
         */
        this.externalCommunicationMethods = {
            cloudVariables: false,
            customExtensions: false
        };
        this.on(Runtime.HAS_CLOUD_DATA_UPDATE, enabled => {
            this.setExternalCommunicationMethod('cloudVariables', enabled);
        });

        /**
         * If set to true, features such as reading colors from the user's webcam will be disabled
         * when the project has access to any external communication method to protect user privacy.
         * Requires TurboWarp/scratch-render.
         * Do not update this directly. Use Runtime.setEnforcePrivacy() instead.
         */
        this.enforcePrivacy = true;

        /**
         * Internal map of opaque identifiers to the callback to run that function.
         * @type {Map<string, function>}
         */
        this.extensionButtons = new Map();

        /**
         * Responsible for managing custom fonts.
         */
        this.fontManager = new FontManager(this);

        /**
         * Maps extension ID to a JSON-serializable value.
         * @type {Object.<string, object>}
         */
        this.extensionStorage = {};

        /**
         * Total number of scratch-storage load() requests since the runtime was created or cleared.
         */
        this.totalAssetRequests = 0;

        /**
         * Total number of finished or errored scratch-storage load() requests since the runtime was created or cleared.
         */
        this.finishedAssetRequests = 0;
    }

    /**
     * Width of the stage, in pixels.
     * @const {number}
     */
    static get STAGE_WIDTH () {
        // tw: stage size is set per-runtime, this is only the initial value
        return 480;
    }

    /**
     * Height of the stage, in pixels.
     * @const {number}
     */
    static get STAGE_HEIGHT () {
        // tw: stage size is set per-runtime, this is only the initial value
        return 360;
    }

    /**
     * Event name for glowing a script.
     * @const {string}
     */
    static get SCRIPT_GLOW_ON () {
        return 'SCRIPT_GLOW_ON';
    }

    /**
     * Event name for unglowing a script.
     * @const {string}
     */
    static get SCRIPT_GLOW_OFF () {
        return 'SCRIPT_GLOW_OFF';
    }

    /**
     * Event name for glowing a block.
     * @const {string}
     */
    static get BLOCK_GLOW_ON () {
        return 'BLOCK_GLOW_ON';
    }

    /**
     * Event name for unglowing a block.
     * @const {string}
     */
    static get BLOCK_GLOW_OFF () {
        return 'BLOCK_GLOW_OFF';
    }

    /**
     * Event name for a cloud data update
     * to this project.
     * @const {string}
     */
    static get HAS_CLOUD_DATA_UPDATE () {
        return 'HAS_CLOUD_DATA_UPDATE';
    }

    /**
     * Event name for turning on turbo mode.
     * @const {string}
     */
    static get TURBO_MODE_ON () {
        return 'TURBO_MODE_ON';
    }

    /**
     * Event name for turning off turbo mode.
     * @const {string}
     */
    static get TURBO_MODE_OFF () {
        return 'TURBO_MODE_OFF';
    }

    /**
     * Event name for runtime options changing.
     * @const {string}
     */
    static get RUNTIME_OPTIONS_CHANGED () {
        return 'RUNTIME_OPTIONS_CHANGED';
    }

    /**
     * Event name for compiler options changing.
     * @const {string}
     */
    static get COMPILER_OPTIONS_CHANGED () {
        return 'COMPILER_OPTIONS_CHANGED';
    }

    /**
     * Event name for framerate changing.
     * @const {string}
     */
    static get FRAMERATE_CHANGED () {
        return 'FRAMERATE_CHANGED';
    }

    /**
     * Event name for interpolation changing.
     * @const {string}
     */
    static get INTERPOLATION_CHANGED () {
        return 'INTERPOLATION_CHANGED';
    }

    /**
     * Event name for stage size changing.
     * @const {string}
     */
    static get STAGE_SIZE_CHANGED () {
        return 'STAGE_SIZE_CHANGED';
    }

    /**
     * Event name for compiler errors.
     * @const {string}
     */
    static get COMPILE_ERROR () {
        return 'COMPILE_ERROR';
    }

    /**
     * Event called before any block is executed.
     */
    static get BEFORE_EXECUTE () {
        return 'BEFORE_EXECUTE';
    }

    /**
     * Event called after every block in the project has been executed.
     */
    static get AFTER_EXECUTE () {
        return 'AFTER_EXECUTE';
    }

    /**
     * Event name for reporting asset download progress. Fired with finished, total
     * @const {string}
     */
    static get ASSET_PROGRESS () {
        return 'ASSET_PROGRESS';
    }

    /**
     * Event name when the project is started (threads may not necessarily be
     * running).
     * @const {string}
     */
    static get PROJECT_START () {
        return 'PROJECT_START';
    }

    /**
     * Event name when threads start running.
     * Used by the UI to indicate running status.
     * @const {string}
     */
    static get PROJECT_RUN_START () {
        return 'PROJECT_RUN_START';
    }

    /**
     * Event name when threads stop running
     * Used by the UI to indicate not-running status.
     * @const {string}
     */
    static get PROJECT_RUN_STOP () {
        return 'PROJECT_RUN_STOP';
    }

    /**
     * Event name for project being stopped or restarted by the user.
     * Used by blocks that need to reset state.
     * @const {string}
     */
    static get PROJECT_STOP_ALL () {
        return 'PROJECT_STOP_ALL';
    }

    /**
     * Event name for target being stopped by a stop for target call.
     * Used by blocks that need to stop individual targets.
     * @const {string}
     */
    static get STOP_FOR_TARGET () {
        return 'STOP_FOR_TARGET';
    }

    /**
     * Event name for visual value report.
     * @const {string}
     */
    static get VISUAL_REPORT () {
        return 'VISUAL_REPORT';
    }

    /**
     * Event name for project loaded report.
     * @const {string}
     */
    static get PROJECT_LOADED () {
        return 'PROJECT_LOADED';
    }

    /**
     * Event name for report that a change was made that can be saved
     * @const {string}
     */
    static get PROJECT_CHANGED () {
        return 'PROJECT_CHANGED';
    }

    /**
     * Event name for report that a change was made to an extension in the toolbox.
     * @const {string}
     */
    static get TOOLBOX_EXTENSIONS_NEED_UPDATE () {
        return 'TOOLBOX_EXTENSIONS_NEED_UPDATE';
    }

    /**
     * Event name for targets update report.
     * @const {string}
     */
    static get TARGETS_UPDATE () {
        return 'TARGETS_UPDATE';
    }

    /**
     * Event name for monitors update.
     * @const {string}
     */
    static get MONITORS_UPDATE () {
        return 'MONITORS_UPDATE';
    }

    /**
     * Event name for block drag update.
     * @const {string}
     */
    static get BLOCK_DRAG_UPDATE () {
        return 'BLOCK_DRAG_UPDATE';
    }

    /**
     * Event name for block drag end.
     * @const {string}
     */
    static get BLOCK_DRAG_END () {
        return 'BLOCK_DRAG_END';
    }

    /**
     * Event name for reporting that an extension was added.
     * @const {string}
     */
    static get EXTENSION_ADDED () {
        return 'EXTENSION_ADDED';
    }
    /**
     * Event name for reporting that an extension was removed.
     * @const {string}
     */
    static get EXTENSION_REMOVED () {
        return 'EXTENSION_REMOVED';
    }
    /**
     * Event name for reporting that an extension as asked for a custom field to be added
     * @const {string}
     */
    static get EXTENSION_FIELD_ADDED () {
        return 'EXTENSION_FIELD_ADDED';
    }

    /**
     * Event name for updating the available set of peripheral devices.
     * This causes the peripheral connection modal to update a list of
     * available peripherals.
     * @const {string}
     */
    static get PERIPHERAL_LIST_UPDATE () {
        return 'PERIPHERAL_LIST_UPDATE';
    }

    /**
     * Event name for when the user picks a bluetooth device to connect to
     * via Companion Device Manager (CDM)
     * @const {string}
     */
    static get USER_PICKED_PERIPHERAL () {
        return 'USER_PICKED_PERIPHERAL';
    }

    /**
     * Event name for reporting that a peripheral has connected.
     * This causes the status button in the blocks menu to indicate 'connected'.
     * @const {string}
     */
    static get PERIPHERAL_CONNECTED () {
        return 'PERIPHERAL_CONNECTED';
    }

    /**
     * Event name for reporting that a peripheral has been intentionally disconnected.
     * This causes the status button in the blocks menu to indicate 'disconnected'.
     * @const {string}
     */
    static get PERIPHERAL_DISCONNECTED () {
        return 'PERIPHERAL_DISCONNECTED';
    }

    /**
     * Event name for reporting that a peripheral has encountered a request error.
     * This causes the peripheral connection modal to switch to an error state.
     * @const {string}
     */
    static get PERIPHERAL_REQUEST_ERROR () {
        return 'PERIPHERAL_REQUEST_ERROR';
    }

    /**
     * Event name for reporting that a peripheral connection has been lost.
     * This causes a 'peripheral connection lost' error alert to display.
     * @const {string}
     */
    static get PERIPHERAL_CONNECTION_LOST_ERROR () {
        return 'PERIPHERAL_CONNECTION_LOST_ERROR';
    }

    /**
     * Event name for reporting that a peripheral has not been discovered.
     * This causes the peripheral connection modal to show a timeout state.
     * @const {string}
     */
    static get PERIPHERAL_SCAN_TIMEOUT () {
        return 'PERIPHERAL_SCAN_TIMEOUT';
    }

    /**
     * Event name to indicate that the microphone is being used to stream audio.
     * @const {string}
     */
    static get MIC_LISTENING () {
        return 'MIC_LISTENING';
    }

    /**
     * Event name for reporting that blocksInfo was updated.
     * @const {string}
     */
    static get BLOCKSINFO_UPDATE () {
        return 'BLOCKSINFO_UPDATE';
    }

    /**
     * Event name when the runtime tick loop has been started.
     * @const {string}
     */
    static get RUNTIME_STARTED () {
        return 'RUNTIME_STARTED';
    }

    /**
     * Event name when the runtime tick loop has been stopped.
     * @const {string}
     */
    static get RUNTIME_STOPPED () {
        return 'RUNTIME_STOPPED';
    }

    /**
     * Event name when the runtime dispose has been called.
     * @const {string}
     */
    static get RUNTIME_DISPOSED () {
        return 'RUNTIME_DISPOSED';
    }

    /**
     * Event name for reporting that a block was updated and needs to be rerendered.
     * @const {string}
     */
    static get BLOCKS_NEED_UPDATE () {
        return 'BLOCKS_NEED_UPDATE';
    }

    /**
     * Event name when platform name inside a project does not match the runtime.
     */
    static get PLATFORM_MISMATCH () {
        return 'PLATFORM_MISMATCH';
    }

    /**
     * How rapidly we try to step threads by default, in ms.
     */
    static get THREAD_STEP_INTERVAL () {
        // tw: not used, only exists for compatibility
        return 1000 / 60;
    }

    /**
     * In compatibility mode, how rapidly we try to step threads, in ms.
     */
    static get THREAD_STEP_INTERVAL_COMPATIBILITY () {
        // tw: not used, only exists for compatibility
        return 1000 / 30;
    }

    /**
     * How many clones can be created at a time.
     * @const {number}
     */
    static get MAX_CLONES () {
        // tw: clone limit is set per-runtime in runtimeOptions, this is only the initial value
        return 300;
    }

    // -----------------------------------------------------------------------------
    // -----------------------------------------------------------------------------

    // Helper function for initializing the addCloudVariable function
    _initializeAddCloudVariable (newCloudDataManager) {
        // The addCloudVariable function
        return (() => {
            const hadCloudVarsBefore = this.hasCloudData();
            newCloudDataManager.addCloudVariable();
            if (!hadCloudVarsBefore && this.hasCloudData()) {
                this.emit(Runtime.HAS_CLOUD_DATA_UPDATE, true);
            }
        });
    }

    // Helper function for initializing the removeCloudVariable function
    _initializeRemoveCloudVariable (newCloudDataManager) {
        return (() => {
            const hadCloudVarsBefore = this.hasCloudData();
            newCloudDataManager.removeCloudVariable();
            if (hadCloudVarsBefore && !this.hasCloudData()) {
                this.emit(Runtime.HAS_CLOUD_DATA_UPDATE, false);
            }
        });
    }

    /**
     * Register default block packages with this runtime.
     * @todo Prefix opcodes with package name.
     * @private
     */
    _registerBlockPackages () {
        for (const packageName in defaultBlockPackages) {
            if (Object.prototype.hasOwnProperty.call(defaultBlockPackages, packageName)) {
                // @todo pass a different runtime depending on package privilege?
                const packageObject = new (defaultBlockPackages[packageName])(this);
                // Collect primitives from package.
                if (packageObject.getPrimitives) {
                    const packagePrimitives = packageObject.getPrimitives();
                    for (const op in packagePrimitives) {
                        if (Object.prototype.hasOwnProperty.call(packagePrimitives, op)) {
                            this._primitives[op] =
                                packagePrimitives[op].bind(packageObject);
                        }
                    }
                }
                // Collect hat metadata from package.
                if (packageObject.getHats) {
                    const packageHats = packageObject.getHats();
                    for (const hatName in packageHats) {
                        if (Object.prototype.hasOwnProperty.call(packageHats, hatName)) {
                            this._hats[hatName] = packageHats[hatName];
                        }
                    }
                }
                // Collect monitored from package.
                if (packageObject.getMonitored) {
                    this.monitorBlockInfo = Object.assign({}, this.monitorBlockInfo, packageObject.getMonitored());
                }

                this.compilerRegisterExtension(packageName, packageObject);
            }
        }
    }

    compilerRegisterExtension (name, extensionObject) {
        this[`ext_${name}`] = extensionObject;
    }

    getMonitorState () {
        return this._monitorState;
    }

    /**
     * Generate an extension-specific menu ID.
     * @param {string} menuName - the name of the menu.
     * @param {string} extensionId - the ID of the extension hosting the menu.
     * @returns {string} - the constructed ID.
     * @private
     */
    _makeExtensionMenuId (menuName, extensionId) {
        return `${extensionId}_menu_${menuName}`;
    }

    /**
     * Create a context ("args") object for use with `formatMessage` on messages which might be target-specific.
     * @param {Target} [target] - the target to use as context. If a target is not provided, default to the current
     * editing target or the stage.
     */
    makeMessageContextForTarget (target) {
        const context = {};
      d.
        if (this.sequencer.activeThread !== null) {
            this._stopThread(this.sequencer.activeThread);
        }
        // Remove all remaining threads from executing in the next tick.
        this.threads = [];
        this.threadMap.clear();

        this.resetRunId();
    }

    _renderInterpolatedPositions () {
        const frameStarted = this._lastStepTime;
        const now = Date.now();
        const timeSinceStart = now - frameStarted;
        const progressInFrame = Math.min(1, Math.max(0, timeSinceStart / this.currentStepTime));

        interpolate.interpolate(this, progressInFrame);

        if (this.renderer) {
            this.renderer.draw();
        }
    }

    updateThreadMap () {
        this.threadMap.clear();
        for (const thread of this.threads) {
            if (!thread.stackClick && !thread.updateMonitor) {
                this.threadMap.set(thread.getId(), thread);
            }
        }
    }

    /**
     * Repeatedly run `sequencer.stepThreads` and filter out
     * inactive threads after each iteration.
     */
    _step () {
        if (this.interpolationEnabled) {
            interpolate.setupInitialState(this);
        }

        if (this.profiler !== null) {
            if (stepProfilerId === -1) {
                stepProfilerId = this.profiler.idByName('Runtime._step');
            }
            this.profiler.start(stepProfilerId);
        }

        // Clean up threads that were told to stop during or since the last step
        this.threads = this.threads.filter(thread => !thread.isKilled);
        this.updateThreadMap();

        // Find all edge-activated hats, and add them to threads to be evaluated.
        for (const hatType in this._hats) {
            if (!Object.prototype.hasOwnProperty.call(this._hats, hatType)) continue;
            const hat = this._hats[hatType];
            if (hat.edgeActivated) {
                this.startHats(hatType);
            }
        }
        this.redrawRequested = false;
        this._pushMonitors();
        if (this.profiler !== null) {
            if (stepThreadsProfilerId === -1) {
                stepThreadsProfilerId = this.profiler.idByName('Sequencer.stepThreads');
            }
            this.profiler.start(stepThreadsProfilerId);
        }
        this.emit(Runtime.BEFORE_EXECUTE);
        const doneThreads = this.sequencer.stepThreads();
        if (this.profiler !== null) {
            this.profiler.stop();
        }
        this.emit(Runtime.AFTER_EXECUTE);
        this._updateGlows(doneThreads);
        // Add done threads so that even if a thread finishes within 1 frame, the green
        // flag will still indicate that a script ran.
        this._emitProjectRunStatus(
            this.threads.length + doneThreads.length -
                this._getMonitorThreadCount([...this.threads, ...doneThreads]));
        // Store threads that completed this iteration for testing and other
        // internal purposes.
        this._lastStepDoneThreads = doneThreads;
        if (this.renderer) {
            // @todo: Only render when this.redrawRequested or clones rendered.
        lity with Scratch 2,
     * which sometimes uses a `currentMSecs` timestamp value in Interpreter.as
     */
    updateCurrentMSecs () {
        this.currentMSecs = Date.now();
    }

    updatePrivacy () {
        const enforceRestrictions = (
            this.enforcePrivacy &&
            Object.values(this.externalCommunicationMethods).some(i => i)
        );
        if (this.renderer && this.renderer.setPrivateSkinAccess) {
            this.renderer.setPrivateSkinAccess(!enforceRestrictions);
        }
    }

    /**
     * @param {boolean} enabled True if restrictions should be enforced to protect user privacy.
     */
    setEnforcePrivacy (enabled) {
        this.enforcePrivacy = enabled;
        this.updatePrivacy();
    }

    /**
     * @param {string} method Name of the method in Runtime.externalCommunicationMethods
     * @param {boolean} enabled True if the feature is enabled.
     */
    setExternalCommunicationMethod (method, enabled) {
        if (!Object.prototype.hasOwnProperty.call(this.externalCommunicationMethods, method)) {
            throw new Error(`Unknown method: ${method}`);
        }
        this.externalCommunicationMethods[method] = enabled;
        this.updatePrivacy();
    }

    emitAssetProgress () {
        this.emit(Runtime.ASSET_PROGRESS, this.finishedAssetRequests, this.totalAssetRequests);
    }

    resetProgress () {
        this.finishedAssetRequests = 0;
        this.totalAssetRequests = 0;
        this.emitAssetProgress();
    }

    /**
     * Wrap an asset loading promise with progress support.
     * @template T
     * @param {() => Promise<T>} callback
     * @returns {Promise<T>}
     */
    wrapAssetRequest (callback) {
        this.totalAssetRequests++;
        this.emitAssetProgress();

        const onSuccess = result => {
            this.finishedAssetRequests++;
            this.emitAssetProgress();
            return result;
        };

        const onError = error => {
            this.finishedAssetRequests++;
            this.emitAssetProgress();
            throw error;
        };

        return callback().then(onSuccess, onError);
    }
}

/**
 * Event fired after a new target has been created, possibly by cloning an existing target.
 *
 * @event Runtime#targetWasCreated
 * @param {Target} newTarget - the newly created target.
 * @param {Target} [sourceTarget] - the target used as a source for the new clone, if any.
 */

module.exports = Runtime;

/* exported Class, Module */

const GObject = imports.gi.GObject;
const Lang = imports.lang;

const Knowledge = imports.app.knowledge;

/**
 * Class: Class
 * Counterpart to Lang.Class for modules
 *
 * To create a new module, use this metaclass as you would use Lang.Class to
 * create a regular class:
 *
 * > const MyModule = new Module.Class({
 * >     Name: 'MyModule',
 * >     Extends: GObject.Object,
 * > });
 *
 * The <Module.Module> interface is implemented automatically even if you don't
 * specify it, since all modules must implement this interface.
 */
const Class = new Lang.Class({
    Name: 'Class',
    Extends: Knowledge.Class,

    _construct: function (props={}) {
        // Make sure Module is implemented before chaining
        props.Implements = props.Implements || [];
        if (props.Implements.indexOf(Module) === -1)
            props.Implements.unshift(Module);

        let slots = _construct_slot_type(props, 'Slots', '__slots__');
        let references = _construct_slot_type(props, 'References', '__references__');

        let module = this.parent(props);

        _construct_slot_props(module, '__slots__', slots);
        _construct_slot_props(module, '__references__', references);

        /**
         * Method: get_slot_names
         * Class method for listing names of slots
         *
         * Returns an array containing the names of slots offered by this module.
         */
        module.get_slot_names = function () {
            return Object.keys(this.__slots__);
        };

        return module;
    },
});

function _construct_slot_type(props, slot_type, __slot_type__) {
    let slots = {};
    // Looking for the slot type properties on the interface's prototype
    // allows us to get away with not defining a separate meta-interface
    // for module interfaces. If we need something more fancy, such as
    // freezing the interface's slots object, we can switch later.
    props.Implements.forEach(iface =>
        Lang.copyProperties(iface.prototype[slot_type], slots));
    Lang.copyProperties(props.Extends[__slot_type__], slots);
    Lang.copyProperties(props[slot_type], slots);
    delete props[slot_type];

    if (Object.keys(slots).some(name => name.indexOf('.') !== -1))
        throw new Error(slot_type + ' names should never contain a "."');

    return slots;
}

function _construct_slot_props(module, __slot_type__, slots) {
    Object.defineProperty(module, __slot_type__, {
        writable: false,
        configurable: false,
        enumerable: false,
        value: _freeze_recurse(slots),
    });
}

function _freeze_recurse(o) {
    if (typeof o !== 'object')
        return o;
    Object.getOwnPropertyNames(o).forEach(prop => _freeze_recurse(o[prop]));
    return Object.freeze(o);
}

/**
 * Interface: Module
 */
const Module = new Lang.Interface({
    Name: 'Module',
    Requires: [ GObject.Object ],

    Properties: {
        /**
         * Property: factory
         *
         * The <ModuleFactory> widget that is used to construct and return
         * the module to its parent application. The type of this property
         * is flexible to allow for factory mocking in tests.
         */
        'factory': GObject.ParamSpec.object('factory', 'Factory', 'Factory',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            GObject.Object.$gtype),

        /**
         * Property: factory_path
         * Path indicating where a module comes from in the app.json
         *
         * The factory path is used to identify this module within the app.json.
         * It is a string, like "root.submodule.multislot.345.content", though
         * you should not count on its contents being stable between releases.
         * This string is unique for each instance created and is used
         * internally.
         */
        'factory-path': GObject.ParamSpec.string('factory-path', 'Factory path',
            'Path indicating where a module comes from in the app.json',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            ''),

        /**
         * Property: factory_id
         *
         * The factory_id is used to identify this specific module instance. The
         * factory uses the id to pass this instance to other modules.
         */
        'factory-id': GObject.ParamSpec.string('factory-id', 'Module ID', 'Module ID',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            ''),
    },

    _submodules: function () {
        if (typeof this._submodule_array === 'undefined')
            this._submodule_array = [];
        return this._submodule_array;
    },

    /**
     * Method: create_submodule
     * Create a new instance of a submodule
     *
     * Creates an instance of a submodule through the factory, optionally adding
     * some construct properties.
     * This doesn't pack the submodule anywhere, just returns it.
     *
     * Properties:
     *   slot - the slot for which to create the module (string)
     *   extra_props - dictionary of construct properties
     */
    create_submodule: function (slot, extra_props={}) {
        let submodule = this.factory.create_module_for_slot(this, slot,
            extra_props);

        if (submodule) {
            if (submodule.constructor === Array) {
                this._submodule_array = this._submodules().concat(submodule);
            } else {
                this._submodules().push(submodule);
            }
        }
        return submodule;
    },

    /**
     * Method: reference_module
     * Pass an existing module instance defined elsewhere
     *
     * Passes an existing module instance defined elsewhere in the app. The
     * instance is passed through the callback as soon as the module instance
     * is available.
     *
     * Parameters:
     *   reference_slot - reference slot to the module (string)
     *   callback - function to be called whenever the module is available
     */
    reference_module: function (reference_slot, callback) {
        this.factory.request_module_reference(this, reference_slot, callback);
    },

    /**
     * Method: make_ready
     * Prepare the module to show contents on screen
     *
     * Parameters:
     *   callback - function to be called whenever the module is ready.
     */
    make_ready: function (cb) {
        let count = 0;
        if (this._submodules().length === 0 && typeof cb !== 'undefined')
            cb();

        this._submodules().forEach((submodule) => {
            submodule.make_ready(() => {
                count++;
                if (count == this._submodules().length && typeof cb !== 'undefined')
                    cb();
            });
        });
    },
});

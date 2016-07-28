imports.gi.versions.WebKit2 = '4.0';

const Endless = imports.gi.Endless;
const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;

const Actions = imports.app.actions;
const Dispatcher = imports.app.dispatcher;
const Engine = imports.search.engine;
const Knowledge = imports.app.knowledge;
const ControllerLoader = imports.app.controllerLoader;
const Utils = imports.search.utils;

const KnowledgeSearchIface = '\
<node> \
  <interface name="com.endlessm.KnowledgeSearch"> \
    <method name="LoadItem"> \
      <arg type="s" name="EknID" direction="in" /> \
      <arg type="s" name="Query" direction="in" /> \
      <arg type="u" name="Timestamp" direction="in" /> \
    </method> \
    <method name="LoadQuery"> \
      <arg type="s" name="Query" direction="in" /> \
      <arg type="u" name="Timestamp" direction="in" /> \
    </method> \
  </interface> \
</node>';

/**
 * Class: Application
 */
const Application = new Knowledge.Class({
    Name: 'Application',
    Extends: Endless.Application,

    Properties: {
        /**
         * Property: resource-path
         * Path to applications gresource.
         */
        'resource-path': GObject.ParamSpec.string('resource-path',
            'Resource Path', 'Resource Path',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY, ''),
    },

    _init: function (props={}) {
        this.parent(props);
        this._controller = null;
        this._knowledge_search_impl = Gio.DBusExportedObject.wrapJSObject(KnowledgeSearchIface, this);

        Engine.get_default().default_app_id = this.application_id;

        this.add_main_option('data-path', 0, GLib.OptionFlags.NONE, GLib.OptionArg.FILENAME,
                             'Optional argument to set the default data path', null);
    },

    vfunc_handle_local_options: function (options) {
        let path = options.lookup_value('data-path', null);
        if (path)
            Engine.get_default().default_data_path = path.deep_unpack().toString();
        return -1;
    },

    vfunc_dbus_register: function (connection, path) {
        this.parent(connection, path);
        this._knowledge_search_impl.export(connection, path);
        return true;
    },

    vfunc_dbus_unregister: function (connection, path) {
        this.parent(connection, path);
        this._knowledge_search_impl.unexport_from_connection(connection);
    },

    vfunc_startup: function () {
        this.parent();
        Engine.get_default().update_and_preload_default_domain();
    },

    LoadItem: function (ekn_id, query, timestamp) {
        this.ensure_controller();
        Dispatcher.get_default().dispatch({
            action_type: Actions.DBUS_LOAD_ITEM_CALLED,
            ekn_id: ekn_id,
            query: query,
            timestamp: timestamp,
        });
    },

    LoadQuery: function (query, timestamp) {
        this.ensure_controller();
        Dispatcher.get_default().dispatch({
            action_type: Actions.DBUS_LOAD_QUERY_CALLED,
            query: query,
            timestamp: timestamp,
        });
    },

    vfunc_activate: function () {
        this.parent();
        this.ensure_controller();
        Dispatcher.get_default().dispatch({
            action_type: Actions.LAUNCHED_FROM_DESKTOP,
            timestamp: Gdk.CURRENT_TIME,
        });
    },

    // To be overridden in subclass
    ensure_controller: function () {
        if (this._controller === null) {
            this._controller = ControllerLoader.create_controller(this, this.resource_path);
            this._controller.make_ready();
        }
    },

    vfunc_shutdown: function () {
        Dispatcher.get_default().pause();
        this.parent();
    },
});

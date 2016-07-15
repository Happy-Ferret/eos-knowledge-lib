// Copyright 2014 Endless Mobile, Inc.

/* exported Simple */

const Endless = imports.gi.Endless;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;

const Actions = imports.app.actions;
const Dispatcher = imports.app.dispatcher;
const HistoryStore = imports.app.historyStore;
const Module = imports.app.interfaces.module;
const Pages = imports.app.pages;
const SearchBox = imports.app.modules.navigation.searchBox;
const Utils = imports.app.utils;

/**
 * Class: Window.Simple
 * Window with default functionality
 *
 * Slots:
 *   lightbox - optional
 *   navigation - optional
 *   pager
 *   search - optional
 */
const Simple = new Module.Class({
    Name: 'Window.Simple',
    Extends: Endless.Window,

    Slots: {
        'lightbox': {},
        'navigation': {},  // optional
        'pager': {},
        'search': {},
    },

    WINDOW_WIDTH_THRESHOLD: 800,
    WINDOW_HEIGHT_THRESHOLD: 600,

    _init: function (props) {
        this.parent(props);

        // Set window title from desktop application file
        let app_id = Gio.Application.get_default().application_id;
        let app_info = Gio.DesktopAppInfo.new(app_id + '.desktop');
        this.title = (app_info) ? app_info.get_display_name() : app_id;

        // We need to pack a bunch of modules inside each other, but some of
        // them are optional. "matryoshka" is the innermost widget that needs to
        // have something packed around it.
        this._pager = this.create_submodule('pager');
        let matryoshka = this._pager;

        let navigation = this.create_submodule('navigation');
        if (navigation) {
            navigation.add(matryoshka);
            matryoshka = navigation;
        }

        let lightbox = this.create_submodule('lightbox');
        if (lightbox) {
            lightbox.add(matryoshka);
            matryoshka = lightbox;
        }

        this._home_button = new Endless.TopbarHomeButton();
        this._history_buttons = new Endless.TopbarNavButton();

        // Keep the search bar in a stack for two reasons
        //  - our top bar will always be constant sized
        //  - showing the search bar will not trigger a window resize
        this._search_stack = new Gtk.Stack();
        this._invisible_frame = new Gtk.Frame();
        this._search_stack.add(this._invisible_frame);
        this._search_box = this.create_submodule('search');
        if (this._search_box)
            this._search_stack.add(this._search_box);
        this._search_stack.show_all();

        let button_box = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL
        });
        button_box.add(this._home_button);
        button_box.add(this._history_buttons);

        this.page_manager.add(matryoshka, {
            left_topbar_widget: button_box,
            center_topbar_widget: this._search_stack,
        });

        let dispatcher = Dispatcher.get_default();

        this._home_button.connect('clicked', () => {
            dispatcher.dispatch({ action_type: Actions.HOME_CLICKED });
        });
        this._history_buttons.back_button.connect('clicked', () => {
            dispatcher.dispatch({ action_type: Actions.HISTORY_BACK_CLICKED });
        });
        this._history_buttons.forward_button.connect('clicked', () => {
            dispatcher.dispatch({ action_type: Actions.HISTORY_FORWARD_CLICKED });
        });

        let store = HistoryStore.get_default();
        store.connect('changed', this._on_history_change.bind(this));
        dispatcher.register((payload) => {
            switch(payload.action_type) {
                case Actions.LAUNCHED_FROM_DESKTOP:
                case Actions.DBUS_LOAD_QUERY_CALLED:
                case Actions.DBUS_LOAD_ITEM_CALLED:
                    this._needs_present(payload.timestamp);
                    break;
            }
        });

        this._history_buttons.get_style_context().add_class(Gtk.STYLE_CLASS_LINKED);
        button_box.show_all();

        let focused_widget = null;
        store.connect('notify::animating', () => {
            if (store.animating) {
                focused_widget = this.get_focus();
                Utils.squash_all_window_content_updates_heavy_handedly(this);
            } else {
                Utils.unsquash_all_window_content_updates_heavy_handedly(this);
                if (focused_widget && !this.get_focus()) {
                    focused_widget.grab_focus();
                    focused_widget = null;
                }
            }
        });

        this.get_child().show_all();
    },

    _on_history_change: function (history) {
        this._home_button.sensitive = history.get_current_item().page_type !== Pages.HOME;
        this._history_buttons.back_button.sensitive = history.can_go_back();
        this._history_buttons.forward_button.sensitive = history.can_go_forward();

        if (Utils.shows_descendant_with_type(this.page_manager, SearchBox.SearchBox)) {
            this._search_stack.visible_child = this._invisible_frame;
        } else {
            this._search_stack.visible_child = this._search_box;
        }

        this._present_if_needed();
    },

    _needs_present: function (timestamp) {
        this._pending_present = true;
        this._present_timestamp = timestamp;
        if (this._present_ready)
            this._present();
    },

    _present_if_needed: function () {
        if (this._pending_present) {
            this._present();
        } else {
            this._present_ready = true;
        }
    },

    _present: function () {
        if (this._present_timestamp)
            this.present_with_time(this._present_timestamp);
        else
            this.present();
        this._pending_present = false;
        this._present_timestamp = null;
    },

    make_ready: function (cb=function () {}) {
        this._pager.make_ready(() => {
            this._present_if_needed();
            cb();
        });
    },

    vfunc_size_allocate: function (alloc) {
        this.parent(alloc);

        let context = this.get_style_context();
        if (alloc.width <= this.WINDOW_WIDTH_THRESHOLD || alloc.height <= this.WINDOW_HEIGHT_THRESHOLD) {
            context.remove_class('window-large');
            context.add_class('window-small');
        } else {
            context.remove_class('window-small');
            context.add_class('window-large');
        }
    }
});

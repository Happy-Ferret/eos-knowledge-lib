// Copyright 2014 Endless Mobile, Inc.

const EosKnowledge = imports.gi.EosKnowledge;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const Utils = imports.utils;

/**
 * Class: NavButtonOverlay
 *
 * An overlay with a back and forwards buttons on either side of the widget.
 * Either of buttons can be turned invisible using <back-visible> or
 * <forward-visible>.
 *
 * Emits <back-clicked> and <forward-clicked> signals when the corresponding
 * button is clicked.
 */
const NavButtonOverlay = new Lang.Class({
    Name: 'NavButtonOverlay',
    GTypeName: 'EknNavButtonOverlay',
    Extends: Gtk.Overlay,
    Properties: {
        /**
         * Property: back-visible
         * Whether the back button should be displayed
         */
        'back-visible': GObject.ParamSpec.boolean('back-visible',
            'Is Back Visible',
            'Boolean property to manage whether the back button should be shown. Defaults to true',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT, true),

        /**
         * Property: forward-visible
         * Whether the forward button should be displayed
         */
        'forward-visible': GObject.ParamSpec.boolean('forward-visible',
            'Is Forward Visible',
            'Boolean property to manage whether the Forward button should be shown. Defaults to true',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT, true),
    },

    Signals: {
        /**
         * Event: back-clicked
         * This event is triggered when the Back button is clicked.
         */
        'back-clicked': {},

        /**
         * Event: forward-clicked
         * This event is triggered when the Forward button is clicked.
         */
        'forward-clicked': {},
    },

    _ARROW_SIZE: 20,

    _init: function (props) {
        /*
         * Back button
         */
        let back_image = new Gtk.Image({
            icon_name: 'go-previous-symbolic',
            pixel_size: this._ARROW_SIZE,
        });
        this._back_button = new Gtk.Button({
            image: back_image,
            halign: Gtk.Align.START,
            valign: Gtk.Align.CENTER,
            no_show_all: true,
        });
        this._back_button.connect('clicked', function () {
            this.emit('back-clicked');
        }.bind(this));
        this._back_button.get_style_context().add_class(EosKnowledge.STYLE_CLASS_NAV_BACK_BUTTON);
        this._back_button.show_all();
        // Our button size changes via css state selectors on hover, and for
        // some reason Gtk isn't handling this queue resize for us
        this._back_button.connect('state-flags-changed', function (button) {
            button.queue_resize();
        });

        /*
         * Forward button
         */
        let forward_image = new Gtk.Image({
            icon_name: 'go-next-symbolic',
            pixel_size: this._ARROW_SIZE,
        });
        this._forward_button = new Gtk.Button({
            image: forward_image,
            halign: Gtk.Align.END,
            valign: Gtk.Align.CENTER,
            no_show_all: true,
        });
        this._forward_button.connect('clicked', function () {
            this.emit('forward-clicked');
        }.bind(this));
        this._forward_button.get_style_context().add_class(EosKnowledge.STYLE_CLASS_NAV_FORWARD_BUTTON);
        this._forward_button.show_all();
        this._forward_button.connect('state-flags-changed', function (button) {
            button.queue_resize();
        });

        this.parent(props);

        this._style_nav_button(this._back_button, this.back_image_uri, 'go-previous-symbolic', 'go-previous-rtl-symbolic');
        this._style_nav_button(this._forward_button, this.forward_image_uri, 'go-next-symbolic', 'go-next-rtl-symbolic');

        Utils.set_hand_cursor_on_widget(this._back_button);
        Utils.set_hand_cursor_on_widget(this._forward_button);

        this.parent(props);
        this.add_overlay(this._back_button);
        this.add_overlay(this._forward_button);
    },

    set back_visible (v) {
        if (this._back_button.visible === v)
            return;
        this._back_button.visible = v;
        this.notify('back-visible');
    },

    get back_visible () {
        return this._back_button.visible;
    },

    set forward_visible (v) {
        if (this._forward_button.visible === v)
            return;
        this._forward_button.visible = v;
        this.notify('forward-visible');
    },

    get forward_visible () {
        return this._forward_button.visible;
    },

    _style_nav_button: function (button, image_uri, fallback_icon_name, fallback_rtl_icon_name) {
        if (this.get_default_direction() === Gtk.TextDirection.RTL) {
            button.image = this._create_new_image(image_uri, fallback_rtl_icon_name);
            button.get_style_context().add_class(EosKnowledge.STYLE_CLASS_RTL);
        } else {
            button.image = this._create_new_image(image_uri, fallback_icon_name);
        }
    },

    _create_new_image: function (image_uri, fallback_icon_name) {
        // If the image URIs exists, create new icons for it; otherwise fallback to icon.
        let new_image;
        if (image_uri) {
            let file = Gio.File.new_for_uri(image_uri);
            let icon = new Gio.FileIcon({ file: file });
            new_image = new Gtk.Image({ gicon: icon });
        } else {
            new_image = new Gtk.Image({
                icon_name: fallback_icon_name,
                pixel_size: this._ARROW_SIZE,
            });
        }
        return new_image;
    },
});

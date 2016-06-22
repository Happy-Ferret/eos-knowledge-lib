// Copyright 2016 Endless Mobile, Inc.

/* exported ParallaxBackground */

const GdkPixbuf = imports.gi.GdkPixbuf;
const Gio = imports.gi.Gio;
const GObject = imports.gi.GObject;

const Module = imports.app.interfaces.module;
const Simple = imports.app.modules.pager.simple;
const Utils = imports.app.utils;

/**
 * Class: ParallaxBackground
 * Pager that provides a parallax effect on its page backgrounds
 *
 * FIXME: if GTK gains support for the 'vmax' CSS unit, then we can move this
 * effect to pure CSS and get rid of this module and its extra disk I/O.
 * https://developer.mozilla.org/en-US/docs/Web/CSS/length
 *
 * CSS classes:
 *   PagerParallaxBackground--center - when on the appropriate page
 *   PagerParallaxBackground--landscape - when the window is sized to a wider
 *     ratio than the background image
 *   PagerParallaxBackground--left - when on the appropriate page
 *   PagerParallaxBackground--parallax - when parallax animations are enabled
 *   PagerParallaxBackground--portrait - when the window is sized to a taller
 *     ratio than the background image
 *   PagerParallaxBackground--right - when on the appropriate page
 */
const ParallaxBackground = new Module.Class({
    Name: 'Pager.ParallaxBackground',
    Extends: Simple.Simple,

    Properties: {
        /**
         * Property: background-image-uri
         * The background image of this window
         *
         * Used for size calculations.
         */
        'background-image-uri': GObject.ParamSpec.string('background-image-uri',
            'Background image URI', 'The background image of this window',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            ''),
    },

    _init: function (props={}) {
        this.parent(props);

        this._style_classes = {};
        ['parallax', 'left', 'center', 'right', 'portrait', 'landscape'].forEach(modifier => {
            this._style_classes[modifier] =
                Utils.get_modifier_style_class(ParallaxBackground, modifier);
        });

        this._landscape = true;
        let context = this.get_style_context();
        context.add_class(this._style_classes['landscape']);

        if (!Utils.low_performance_mode())
            context.add_class(this._style_classes['parallax']);

        this._background_image_ratio = 1.0;
        if (this.background_image_uri) {
            try {
                let stream = Gio.File.new_for_uri(this.background_image_uri).read(null);
                let bg_pixbuf = GdkPixbuf.Pixbuf.new_from_stream(stream, null);
                this._background_image_ratio = bg_pixbuf.width / bg_pixbuf.height;
            } catch (e) {
                logError(e, 'Background image URI is not a valid format.');
            }
        }

        this.connect('notify::visible-child',
            this._on_visible_child_changed.bind(this));
        this._on_visible_child_changed();
    },

    _on_visible_child_changed: function () {
        let context = this.get_style_context();
        context.remove_class(this._style_classes['left']);
        context.remove_class(this._style_classes['center']);
        context.remove_class(this._style_classes['right']);

        let new_page = this.visible_child;
        if (this._is_page_on_left(new_page)) {
            context.add_class(this._style_classes['left']);
        } else if (this._is_page_on_center(new_page)) {
            context.add_class(this._style_classes['center']);
        } else {
            context.add_class(this._style_classes['right']);
        }
    },

    vfunc_size_allocate: function (alloc) {
        this.parent(alloc);

        if (Utils.low_performance_mode())
            return;

        let ratio = alloc.width / alloc.height;
        let landscape = ratio >= this._background_image_ratio;
        if (landscape === this._landscape)
            return;

        let context = this.get_style_context();
        if (landscape && !this._landscape) {
            context.remove_class(this._style_classes['portrait']);
            context.add_class(this._style_classes['landscape']);
        } else {
            context.remove_class(this._style_classes['landscape']);
            context.add_class(this._style_classes['portrait']);
        }
        this._landscape = landscape;
    },
});

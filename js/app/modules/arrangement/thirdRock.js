// Copyright 2015 Endless Mobile, Inc.

/* exported ThirdRock */

const Endless = imports.gi.Endless;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;

const Arrangement = imports.app.interfaces.arrangement;
const Card = imports.app.interfaces.card;
const Knowledge = imports.app.knowledge;
const Module = imports.app.interfaces.module;
const Utils = imports.app.utils;

const _HorizontalMode = {
    TINY: 'TINY',
    LARGE: 'LARGE',
};
const _HorizontalThreshold = {
    TINY: 720,
};
const _PreferredCardWidth = {
    TINY: Card.MinSize.B,
    LARGE: Card.MinSize.D,
};
const _CardHeight = {
    Normal: {
        TINY: Card.MinSize.C,
        LARGE: Card.MinSize.D,
    },
    Compact: {
        TINY: Card.MinSize.B,
        LARGE: Card.MinSize.C,
    }
};
const _CARD_COUNT = 3;

const _ThirdRockLayout = new Knowledge.Class({
    Name: 'Arrangement.ThirdRockLayout',
    Extends: Endless.CustomContainer,

    _init: function (props={}) {
        this.spacing = 0;
        this.compact_mode = false;

        this.parent(props);
    },

    // Removing a widget should recalculate the positions of all widgets
    vfunc_remove: function (widget) {
        this.parent(widget);
        this.queue_resize();
    },

    vfunc_get_request_mode: function () {
        return Gtk.SizeRequestMode.HEIGHT_FOR_WIDTH;
    },

    vfunc_get_preferred_width: function () {
        return [Arrangement.get_size_with_spacing(_PreferredCardWidth.TINY, _CARD_COUNT, this.spacing),
            Arrangement.get_size_with_spacing(_PreferredCardWidth.LARGE, _CARD_COUNT, this.spacing)];
    },

    vfunc_get_preferred_height_for_width: function (width) {
        let horizontal_mode = this._get_horizontal_mode(width);
        let height = _CardHeight[this.compact_mode ? 'Compact' : 'Normal'][horizontal_mode];

        return [height, height];
    },

    vfunc_size_allocate: function (alloc) {
        this.parent(alloc);

        if (this.get_children().length === 0)
            return;

        let all_cards = this.get_parent().get_cards();

        let horizontal_mode = this._get_horizontal_mode(alloc.width);
        let available_width = alloc.width - (_CARD_COUNT - 1) * this.spacing;
        let child_width = Math.floor(available_width / _CARD_COUNT);
        let child_height = _CardHeight[this.compact_mode ? 'Compact' : 'Normal'][horizontal_mode];;

        let delta_x = child_width + this.spacing;
        let spare_pixels = alloc.width - (Arrangement.get_size_with_spacing(child_width, _CARD_COUNT, this.spacing));
        let x = alloc.x;
        let y = alloc.y;

        all_cards.slice(0, _CARD_COUNT).forEach((card, i) => {
            Arrangement.place_card(card, x, y, child_width, child_height);

            let sp = Arrangement.get_spare_pixels_for_card_index(spare_pixels, _CARD_COUNT, i);
            x += delta_x + sp;
        });

        all_cards.slice(_CARD_COUNT).forEach((card) => {
            card.set_child_visible(false);
        });

        Utils.set_container_clip(this);
    },

    _get_horizontal_mode: function (width) {
        let horizontal_mode;
        if (width <= _HorizontalThreshold.TINY) {
            horizontal_mode = _HorizontalMode.TINY;
        } else {
            horizontal_mode = _HorizontalMode.LARGE;
        }
        return horizontal_mode;
    },
});

/**
 * Class: ThirdRock
 * Arrangement with three full-height cards.
 *
 * This arrangement shows three democratic cards at full-height. It has two modes:
 *  - Normal mode: The full height is given to each card.
 *  - Compact mode: a short version of the arrangement is presented, and the cards
 *    adjust accordingly.
 */
const ThirdRock = new Module.Class({
    Name: 'Arrangement.ThirdRock',
    Extends: Gtk.Grid,
    Implements: [Arrangement.Arrangement],

    Properties: {
        /**
         * Property: compact-mode
         * Whether the arrangement should show its compact form
         *
         * By default, the ThirdRock Arrangement shows three full-height cards.
         * But on compact mode, it shortens the height of its cards.
         *
         * Default:
         *   false (default arrangement layout)
         */
        'compact-mode': GObject.ParamSpec.boolean('compact-mode',
            'Compact mode',
            'Whether the arrangement should show its compact form',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            false),
    },

    _init: function (props={}) {
        this._layout = new _ThirdRockLayout({
            visible: true,
            expand: true,
        });
        this.parent(props);

        this.add(this._layout);
    },


    // Arrangement implementation
    get_max_cards: function () {
        return _CARD_COUNT;
    },

    // Arrangement override
    pack_card: function (card) {
        this._layout.add(card);
    },

    // Arrangement override
    unpack_card: function (card) {
        this._layout.remove(card);
    },

    get compact_mode() {
        return this._layout.compact_mode;
    },

    set compact_mode(value) {
        if (this._layout.compact_mode === value)
            return;
        this._layout.compact_mode = value;
        this.notify('compact-mode');
    },

    get all_visible() {
        return this.get_card_count() <= _CARD_COUNT;
    },

    get spacing() {
        return this._layout.spacing;
    },

    set spacing(value) {
        if (this._layout.spacing === value)
            return;
        this._layout.spacing = value;
        this.notify('spacing');
        this._layout.queue_resize();
    },
});

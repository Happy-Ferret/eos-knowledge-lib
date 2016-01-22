// Copyright 2015 Endless Mobile, Inc.

/* exported WindshieldArrangement */

const Endless = imports.gi.Endless;
const Gdk = imports.gi.Gdk;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const Arrangement = imports.app.interfaces.arrangement;
const Card = imports.app.interfaces.card;
const Module = imports.app.interfaces.module;
const Utils = imports.app.utils;

const SECOND_ROW_CARD_COUNT = 3;
const CARD_SIZE_SMALL = Card.MinSize.B;
const CARD_SIZE_BIG = Card.MinSize.C;
const CARD_SIZE_MAX = Card.MinSize.D;

/**
 * Class: WindshieldArrangement
 * Arrangement with featured card on prominent spot and three supporting cards
 *
 * This arrangement shows a featured card in a very prominent spot, followed by
 * three secondary cards.
 */
const WindshieldArrangement = new Lang.Class({
    Name: 'WindshieldArrangement',
    GTypeName: 'EknWindshieldArrangement',
    Extends: Endless.CustomContainer,
    Implements: [ Module.Module, Arrangement.Arrangement ],

    Properties: {
        'factory': GObject.ParamSpec.override('factory', Module.Module),
        'factory-name': GObject.ParamSpec.override('factory-name', Module.Module),
        'all-visible': GObject.ParamSpec.override('all-visible', Arrangement.Arrangement),
        'spacing': GObject.ParamSpec.override('spacing', Arrangement.Arrangement),
    },

    _init: function (props={}) {
        this._small_mode = false;
        this._spacing = 0;

        this.parent(props);
    },

    add_card: function (widget) {
        this.add(widget);
    },

    get_cards: function () {
        return this.get_children();
    },

    clear: function () {
        this.get_children().forEach((child) => this.remove(child));
    },

    get_max_cards: function () {
        return SECOND_ROW_CARD_COUNT + 1;
    },

    // Removing a visible widget should recalculate the positions of all widgets
    vfunc_remove: function (widget) {
        let needs_resize = widget.get_child_visible();
        this.parent(widget);
        if (needs_resize)
            this.queue_resize();
    },

    vfunc_get_request_mode: function () {
        return Gtk.SizeRequestMode.HEIGHT_FOR_WIDTH;
    },

    vfunc_get_preferred_width: function () {
        return [this._get_size_with_spacing(CARD_SIZE_SMALL, SECOND_ROW_CARD_COUNT),
            this._get_size_with_spacing(CARD_SIZE_MAX, SECOND_ROW_CARD_COUNT)];
    },

    vfunc_get_preferred_height_for_width: function (width) {
        this._small_mode = (width < this._get_size_with_spacing(CARD_SIZE_BIG, SECOND_ROW_CARD_COUNT));
        let card_size = CARD_SIZE_SMALL * (this._small_mode ? SECOND_ROW_CARD_COUNT - 1 : SECOND_ROW_CARD_COUNT);
        let height = card_size + this._spacing;
        return [height, height];
    },

    vfunc_size_allocate: function (alloc) {
        this.parent(alloc);

        // If arrangement has no child cards yet, simply exit
        if (this.get_children().length === 0)
            return;

        this._small_mode = (alloc.width < this._get_size_with_spacing(CARD_SIZE_BIG, SECOND_ROW_CARD_COUNT));

        let available_width = alloc.width - ((SECOND_ROW_CARD_COUNT - 1) * this._spacing);
        let available_height = alloc.height - this._spacing;

        let featured_height_factor = this._small_mode ? 0.5 : 2 / 3;
        let featured_height = Math.floor(available_height * featured_height_factor);
        let child_width = Math.floor(available_width / SECOND_ROW_CARD_COUNT);
        let child_height = Math.floor(available_height * (1 - featured_height_factor));
        let delta_x = child_width + this._spacing;

        // Calculate spare pixels
        // The floor operation we do above may lead us to have 1,2 spare pixels
        let spare_pixels = alloc.width - (this._get_size_with_spacing(child_width, SECOND_ROW_CARD_COUNT));
        let all_children = this.get_children();

        // Featured card:
        // Place the featured card at the at top of the arrangement
        // FIXME: For now, we show the first-added card as the featured card.
        // This should change to have a model with the featured flag added in
        // this spot, but for that we'd need the arrangement interface to
        // receive a model, instead of a widget in the "add" method.
        let featured_card = all_children[0];
        let featured_card_alloc = new Gdk.Rectangle({
            x: alloc.x,
            y: alloc.y,
            width: alloc.width,
            height: featured_height,
        });
        featured_card.set_child_visible(true);
        featured_card.size_allocate(featured_card_alloc);

        let x = alloc.x;
        let y = alloc.y + featured_height + this._spacing;

        // Support cards:
        // Place three support cards in a row below the featured cards
        all_children.slice(1, SECOND_ROW_CARD_COUNT + 1).forEach((card, i) => {
            card.set_child_visible(true);
            let child_alloc = new Gdk.Rectangle({
                x: x,
                y: y,
                width: child_width,
                height: child_height,
            });
            card.size_allocate(child_alloc);
            x += delta_x + (i < spare_pixels ? 1 : 0);
        });

        // Additional cards:
        // Should not be visible!
        all_children.slice(SECOND_ROW_CARD_COUNT + 1, all_children.length).forEach((card) => {
            card.set_child_visible(false);
        });
        Utils.set_container_clip(this);
    },

    get spacing() {
        return this._spacing;
    },

    set spacing(value) {
        if (this._spacing === value)
            return;
        this._spacing = value;
        this.notify('spacing');
        this.queue_resize();
    },

    _get_size_with_spacing: function (size, count) {
        return size * count + this._spacing * (count - 1);
    },
});

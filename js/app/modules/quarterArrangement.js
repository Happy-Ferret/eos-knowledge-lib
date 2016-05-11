// Copyright 2016 Endless Mobile, Inc.

/* exported QuarterArrangement */

const Endless = imports.gi.Endless;
const Gtk = imports.gi.Gtk;

const Arrangement = imports.app.interfaces.arrangement;
const Card = imports.app.interfaces.card;
const Knowledge = imports.app.knowledge;
const Module = imports.app.interfaces.module;
const Utils = imports.app.utils;

const _HorizontalMode = {
    TINY: 1,
    SMALL: 2,
    LARGE: 3,
};
const _HorizontalThreshold = {
    TINY: 720,
    SMALL: 900,
};
const FEATURED_CARD_HEIGHT = Card.MinSize.C;
const FEATURED_CARD_MIN_WIDTH = Card.MinSize.C;
const FEATURED_CARD_MAX_WIDTH = Card.MinSize.H;
const _FeaturedCardCount = {
    TINY: 2,
    SMALL: 3,
    LARGE: 4,
};
const SUPPORT_CARD_HEIGHT = Card.MinSize.B;
const SUPPORT_CARD_COUNT = 3;

const _QuarterArrangementLayout = new Knowledge.Class({
    Name: 'QuarterArrangementLayout',
    Extends: Endless.CustomContainer,

    _init: function (props={}) {
        this.spacing = 0;

        this.parent(props);
    },

    // Removal of any card should cause a recalculate
    vfunc_remove: function (widget) {
        this.parent(widget);
        this.queue_resize();
    },

    vfunc_get_request_mode: function () {
        return Gtk.SizeRequestMode.HEIGHT_FOR_WIDTH;
    },

    vfunc_get_preferred_width: function () {
        return [Arrangement.get_size_with_spacing(FEATURED_CARD_MIN_WIDTH, _FeaturedCardCount.TINY, this.spacing),
            Arrangement.get_size_with_spacing(FEATURED_CARD_MAX_WIDTH, _FeaturedCardCount.LARGE, this.spacing)];
    },

    vfunc_get_preferred_height_for_width: function (width) {
        let [featured_cards_to_show, support_cards_per_row] = this._determine_horizontal_mode(width);
        let all_cards_count = this.get_children().length;

        // Calculate vertical space for featured cards row
        let featured_cards_height_alloc = FEATURED_CARD_HEIGHT + this.spacing;

        // Calculate vertical space for support card rows
        let support_cards = all_cards_count - featured_cards_to_show;
        let support_rows = Math.ceil(support_cards / support_cards_per_row);
        let support_cards_height_alloc = Arrangement.get_size_with_spacing(SUPPORT_CARD_HEIGHT, support_rows, this.spacing);
        let height = featured_cards_height_alloc + support_cards_height_alloc;

        return [height, height];
    },

    vfunc_size_allocate: function (alloc) {
        this.parent(alloc);

        if (this.get_children().length === 0)
            return;

        let all_cards = this.get_parent().get_cards();

        let [featured_cards_to_show, support_cards_per_row] = this._determine_horizontal_mode(alloc.width);

        let featured_card_width = this._get_card_width(alloc.width, featured_cards_to_show);
        let spare_pixels = alloc.width - Arrangement.get_size_with_spacing(featured_card_width, featured_cards_to_show, this.spacing);

        let x = alloc.x;
        let y = alloc.y;
        let delta_x = featured_card_width + this.spacing + spare_pixels;

        // Featured cards:
        // Place two-four featured cards per row at top of arrangement
        all_cards.slice(0, featured_cards_to_show).forEach((card) => {
            Arrangement.place_card(card, x, y, featured_card_width, FEATURED_CARD_HEIGHT);
            x += delta_x;
        });

        let support_card_width = this._get_card_width(alloc.width, support_cards_per_row);
        spare_pixels = alloc.width - Arrangement.get_size_with_spacing(support_card_width, support_cards_per_row, this.spacing);

        x = alloc.x;
        y += FEATURED_CARD_HEIGHT + this.spacing;
        delta_x = support_card_width + this.spacing + spare_pixels;
        let delta_y = SUPPORT_CARD_HEIGHT + this.spacing;

        // Support cards:
        // Place rest of cards below the featured cards, in as many rows as needed
        all_cards.slice(featured_cards_to_show).forEach((card, ix) => {
            Arrangement.place_card(card, x, y, support_card_width, SUPPORT_CARD_HEIGHT);

            if ((ix + 1) % support_cards_per_row === 0) {
                x = alloc.x;
                y += delta_y;
            } else {
                x += delta_x + Arrangement.get_spare_pixels_for_card_index(spare_pixels, support_cards_per_row, ix);
            }
        });

        Utils.set_container_clip(this);
    },

    _determine_horizontal_mode: function (width) {
        let featured_cards_to_show;
        let support_cards_per_row
        if (width <= _HorizontalThreshold.TINY) {
            featured_cards_to_show = _FeaturedCardCount.TINY;
            support_cards_per_row = SUPPORT_CARD_COUNT - 1;
        } else if (width <= _HorizontalThreshold.SMALL) {
            featured_cards_to_show = _FeaturedCardCount.SMALL;
            support_cards_per_row = SUPPORT_CARD_COUNT - 1;
        } else {
            featured_cards_to_show = _FeaturedCardCount.LARGE;
            support_cards_per_row = SUPPORT_CARD_COUNT;
        }
        return [featured_cards_to_show, support_cards_per_row];
    },

    _get_card_width: function (total_width, card_count) {
        return Math.floor((total_width - (this.spacing * (card_count - 1))) / card_count);
    },
});

/**
 * Class: QuarterArrangement
 * Arrangement with a row of (2-4) featured cards and as many supporting cards as desired
 *
 * This arrangement shows a row of featured cards featuring from two to four cards,
 * depending on the arrangement width. The featured row is followed by as many
 * supporting cards as needed in subsequent rows.
 *
 * Each row of supporting cards packs either two or three, depending on the total
 * width of the arrangement.
 */
const QuarterArrangement = new Module.Class({
    Name: 'QuarterArrangement',
    CssName: 'EknQuarterArrangement',
    Extends: Gtk.Grid,
    Implements: [Arrangement.Arrangement],

    _init: function (props={}) {
        this._layout = new _QuarterArrangementLayout({
            visible: true,
            expand: true,
        });
        this.parent(props);

        this.add(this._layout);
    },

    // Arrangement override
    pack_card: function (card) {
        this._layout.add(card);
    },

    // Arrangement override
    unpack_card: function (card) {
        this._layout.remove(card);
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

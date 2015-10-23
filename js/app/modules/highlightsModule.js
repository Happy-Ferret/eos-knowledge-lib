// Copyright 2015 Endless Mobile, Inc.

/* exported HighlightsModule */

const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const Actions = imports.app.actions;
const Dispatcher = imports.app.dispatcher;
const Engine = imports.search.engine;
const Module = imports.app.interfaces.module;
const QueryObject = imports.search.queryObject;
const Utils = imports.app.utils;

/**
 * Class: HighlightsModule
 * Module for showing featured articles as well as themes
 *
 * This module is designed for apps that have both featured and non-featured
 * sets, where the non-featured sets act as "themes" which unite articles across
 * the featured sets.
 *
 * This module shows a few arrangements consecutively.
 * We recommend placing it in a <ScrollingTemplate> or another module that can
 * allow it to scroll.
 * The top arrangement shows an assortment of cards from all sets.
 * Each subsequent arrangement shows the highlights of one non-featured
 * (thematic) set.
 * Clicking on a card in the arrangement takes you directly to that article.
 * Above each arrangement is a card ("header") showing the title of the set
 * which can also be clicked to show more information about that set.
 *
 * Slots:
 *   large-arrangement - large arrangement to display cards in
 *   small-arrangement - smaller arrangement to display cards in
 *   card-type - type of cards to create for articles
 *   header-card-type - type of cards to create for sets
 */
const HighlightsModule = new Lang.Class({
    Name: 'HighlightsModule',
    GTypeName: 'EknHighlightsModule',
    Extends: Gtk.Grid,
    Implements: [ Module.Module ],

    Properties: {
        'factory': GObject.ParamSpec.override('factory', Module.Module),
        'factory-name': GObject.ParamSpec.override('factory-name', Module.Module),
    },

    // Overridable in tests
    RESULTS_BATCH_SIZE: 15,

    _init: function (props={}) {
        props.orientation = Gtk.Orientation.VERTICAL;
        this.parent(props);

        this._featured_arrangement = this.create_submodule('large-arrangement');
        this._set_arrangements = [];

        this.add(this._featured_arrangement);

        Dispatcher.get_default().register((payload) => {
            switch (payload.action_type) {
                case Actions.CLEAR_SETS:
                    this._clear_all();
                    break;
                case Actions.CLEAR_ITEMS:
                    this._clear_items();
                    break;
                case Actions.APPEND_SETS:
                    let models = payload.models.filter(model => !model.featured);
                    let rand_sequence = models.map(GLib.random_double);
                    Utils.shuffle(models, rand_sequence);
                    this._add_set(models[0], 'small-arrangement');
                    this._add_set(models[1], 'large-arrangement');
                    this._load_all_articles();
                    break;
            }
        });
    },

    // Module override
    get_slot_names: function () {
        return ['large-arrangement', 'small-arrangement', 'card-type',
            'header-card-type'];
    },

    _create_set_card: function (model) {
        let card = this.create_submodule('header-card-type', {
            model: model,
        });
        card.connect('clicked', () => {
            Dispatcher.get_default().dispatch({
                action_type: Actions.SET_CLICKED,
                model: model,
            });
        });
        return card;
    },

    _create_article_card: function (model) {
        let card = this.create_submodule('card-type', {
            model: model,
        });
        card.connect('clicked', () => {
            Dispatcher.get_default().dispatch({
                action_type: Actions.ITEM_CLICKED,
                model: model,
            });
        });
        return card;
    },

    // Load all articles in order to populate the arrangements with them. This
    // happens after APPEND_SETS.
    // It's unfortunate that we don't have a way to determine whether an
    // arrangement already contains a particular model. Otherwise, we could load
    // articles from each set as that set was appended. But as it is, if we did
    // that, we'd end up with duplicate cards in some arrangements.
    _load_all_articles: function () {
        this._clear_items();

        let process_results = (engine, res) => {
            let models, get_more;
            try {
                [models, get_more] = engine.get_objects_by_query_finish(res);
            } catch (e) {
                logError(e, 'Failed to load articles from database');
                return;
            }

            if (get_more)
                engine.get_objects_by_query(get_more, null, process_results);

            models.forEach(this._add_item, this);
        };
        let query = new QueryObject.QueryObject({
            limit: this.RESULTS_BATCH_SIZE,
            tags: ['EknArticleObject'],
        });
        Engine.get_default().get_objects_by_query(query, null, process_results);
    },

    _add_set: function (model, arrangement_slot) {
        let header = this._create_set_card(model);
        header.show_all();
        this.add(header);

        let arrangement = this.create_submodule(arrangement_slot, {
            vexpand: true,
        });
        arrangement.accepted_child_tags = model.child_tags.slice();
        arrangement.show_all();
        this.add(arrangement);
        this._set_arrangements.push(arrangement);
    },

    _add_item: function (model) {
        this._featured_arrangement.add_card(this._create_article_card(model));

        this._set_arrangements.forEach(arrangement => {
            if (model.tags.some(tag =>
                arrangement.accepted_child_tags.indexOf(tag) !== -1)) {
                arrangement.add_card(this._create_article_card(model));
            }
        });
    },

    _clear_all: function () {
        this.get_children().filter(child => child !== this._featured_arrangement)
            .forEach(this.remove, this);
        this._set_arrangements = [];
    },

    _clear_items: function () {
        this._featured_arrangement.clear();
        this._set_arrangements.forEach(arrangement => arrangement.clear());
    },
});

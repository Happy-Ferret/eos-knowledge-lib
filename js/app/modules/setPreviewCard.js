// Copyright 2016 Endless Mobile, Inc.

const GObject = imports.gi.GObject;
const Lang = imports.lang;

const Actions = imports.app.actions;
const Card = imports.app.interfaces.card;
const CardContainer = imports.app.modules.cardContainer;
const Dispatcher = imports.app.dispatcher;
const Engine = imports.search.engine;
const Module = imports.app.interfaces.module;
const QueryObject = imports.search.queryObject;

const NUM_ARTICLES_TO_SHOW = 3;

/**
 * Class: SetPreviewCard
 *
 * Class to show cards backed by a <SetObjectModel> in the knowledge lib UI
 *
 * This card will represent a set from our knowledge app database. It will show
 * the set title, followed by a small number of articles from that set, as a
 * preview. Clicking on the set title will then presumably take you to a page
 * showing a more complete version of the set's contents.
 *
 * Style classes:
 *   card - on the widget itself
 *   title - on the title label
 *
 * Slots:
 *   arrangement - arrangement in which to display this sets article cards.
 *   card-type - type of cards to create for articles
 */
const SetPreviewCard = new Lang.Class({
    Name: 'SetPreviewCard',
    GTypeName: 'EknSetPreviewCard',
    Extends: CardContainer.CardContainer,
    Implements: [ Module.Module, Card.Card ],

    Properties: {
        'factory': GObject.ParamSpec.override('factory', Module.Module),
        'factory-name': GObject.ParamSpec.override('factory-name', Module.Module),
        'model': GObject.ParamSpec.override('model', Card.Card),
        'title-capitalization': GObject.ParamSpec.override('title-capitalization',
            Card.Card),
        'context-capitalization': GObject.ParamSpec.override('context-capitalization',
            Card.Card),
        'highlight-string': GObject.ParamSpec.override('highlight-string', Card.Card),
        'text-halign': GObject.ParamSpec.override('text-halign', Card.Card),
    },

    _init: function (props={}) {
        props.title = props.model.title;
        this.parent(props);

        this.title_button.connect('clicked', () => {
            Dispatcher.get_default().dispatch({
                action_type: Actions.SET_CLICKED,
                model: this.model,
            });
        });

        this.see_more_button.connect('clicked', () => {
            Dispatcher.get_default().dispatch({
                action_type: Actions.SET_CLICKED,
                model: this.model,
            });
        });
    },

    load_content: function () {
        this.arrangement.visible = true;
        let query = new QueryObject.QueryObject({
            limit: NUM_ARTICLES_TO_SHOW,
            tags: this.model.child_tags,
        });
        Engine.get_default().get_objects_by_query(query, null, (engine, res) => {
            let models, get_more;
            try {
                [models, get_more] = engine.get_objects_by_query_finish(res);
            } catch (e) {
                logError(e, 'Failed to load articles from database');
                return;
            }
            models.forEach(model => this.arrangement.add_model(model));
            this.see_more_button.visible = !this.arrangement.all_visible;
        });
    },

    // Module override
    get_slot_names: function () {
        return ['arrangement', 'card-type'];
    },
});

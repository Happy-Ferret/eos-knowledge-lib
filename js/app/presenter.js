const EosKnowledgePrivate = imports.gi.EosKnowledgePrivate;
const EosMetrics = imports.gi.EosMetrics;
const Format = imports.format;
const Gio = imports.gi.Gio;
const Gettext = imports.gettext;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const ArticleCard = imports.app.articleCard;
const ArticlePresenter = imports.app.articlePresenter;
const CardA = imports.app.cardA;
const CardB = imports.app.cardB;
const Config = imports.app.config;
const Engine = imports.search.engine;
const HistoryPresenter = imports.app.historyPresenter;
const Launcher = imports.app.launcher;
const LightboxPresenter = imports.app.lightboxPresenter;
const MediaObjectModel = imports.search.mediaObjectModel;
const PdfCard = imports.app.pdfCard;
const QueryObject = imports.search.queryObject;
const TextCard = imports.app.textCard;
const Utils = imports.app.utils;
const WebkitContextSetup = imports.app.webkitContextSetup;
const Window = imports.app.window;

String.prototype.format = Format.format;
let _ = Gettext.dgettext.bind(null, Config.GETTEXT_PACKAGE);

const RESULTS_SIZE = 10;
const _SEARCH_METRIC = 'a628c936-5d87-434a-a57a-015a0f223838';

/**
 * Class: Presenter
 *
 * A presenter module to manage this application. It initializes an application
 * from a JSON file. It will set up the <Card> widgets on the home page
 * and connect to signal events on those card widgets
 *
 * It has one property, which is the window, representing the top level view
 * of the application.
 *
 */
const Presenter = new Lang.Class({
    Name: 'Presenter',
    GTypeName: 'EknPresenter',
    Extends: Launcher.Launcher,
    _ARTICLE_PAGE: 'article',
    _HOME_PAGE: 'home',
    _SEARCH_PAGE: 'search',
    _SECTION_PAGE: 'section',
    _CATEGORIES_PAGE: 'categories',

    Properties: {
        /**
         * Property: application
         * The GApplication for the knowledge app
         *
         * This should always be set except for during testing. If this is not
         * set in unit testing, make sure to mock out view object. The real
         * Endless.Window requires a application on construction.
         *
         * Flags:
         *   Construct only
         */
        'application': GObject.ParamSpec.object('application', 'Application',
            'Presenter for article page',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            GObject.Object.$gtype),
        /**
         * Property: article-presenter
         * Presenter for article page
         *
         * Pass an instance of <ArticlePresenter> to this property.
         * This is a property for purposes of dependency injection during
         * testing.
         *
         * Flags:
         *   Construct only
         */
        'article-presenter': GObject.ParamSpec.object('article-presenter', 'Article Presenter',
            'Presenter for article page',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            GObject.Object.$gtype),
        /**
         * Property: engine
         * Handle to EOS knowledge engine
         *
         * Pass an instance of <Engine> to this property.
         * This is a property for purposes of dependency injection during
         * testing.
         *
         * Flags:
         *   Construct only
         */
        'engine': GObject.ParamSpec.object('engine', 'Engine',
            'Handle to EOS knowledge engine',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            GObject.Object.$gtype),
        /**
         * Property: view
         * Knowledge app view
         *
         * Pass an instance of <Window> to this property.
         * This is a property for purposes of dependency injection during
         * testing.
         *
         * Flags:
         *   Construct only
         */
        'view': GObject.ParamSpec.object('view', 'View',
            'Knowledge app view',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            GObject.Object.$gtype),
    },

    _init: function (app_json, props) {
        this._template_type = app_json['templateType'];

        let css = Gio.File.new_for_uri('resource:///com/endlessm/knowledge/endless_knowledge.css');
        Utils.add_css_provider_from_file(css, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);

        // Needs to happen before before any webviews are created
        WebkitContextSetup.register_webkit_extensions(props.application.application_id);

        props.view = props.view || new Window.Window({
            application: props.application,
            template_type: this._template_type,
        });
        props.engine = props.engine || Engine.Engine.get_default();
        props.article_presenter = props.article_presenter || new ArticlePresenter.ArticlePresenter({
                article_view: props.view.article_page,
                template_type: this._template_type,
        });
        this.parent(props);

        this.view.title = app_json['appTitle'];
        this.view.home_page.title_image_uri = app_json['titleImageURI'];
        this.view.background_image_uri = app_json['backgroundHomeURI'];
        this.view.blur_background_image_uri = app_json['backgroundSectionURI'];
        this._set_sections(app_json['sections']);

        this._lightbox_presenter = new LightboxPresenter.LightboxPresenter({
            engine: this.engine,
            view: this.view,
        });

        // Keeps track of the broad query that led to an individual article.
        this._latest_origin_query_obj = new QueryObject.QueryObject();
        this._latest_article_card_title = '';
        this._latest_search_text = '';
        this._target_page_title = '';
        this._history_presenter = new HistoryPresenter.HistoryPresenter({
            history_model: new EosKnowledgePrivate.HistoryModel(),
            view: this.view,
        });
        this._add_history_object_for_home_page();

        // Connect signals
        this.view.connect('back-clicked', this._on_topbar_back_clicked.bind(this));
        this.view.connect('forward-clicked', this._on_topbar_forward_clicked.bind(this));
        this.view.connect('search-focused', this._on_search_focus.bind(this));
        this.view.connect('search-text-changed', this._on_search_text_changed.bind(this));
        this.view.connect('search-entered', function (view, query) {
            this._update_ui_and_search(query);
        }.bind(this));
        this.view.connect('article-selected', this._on_article_selection.bind(this));

        this.view.connect('sidebar-back-clicked', this._on_back.bind(this));

        this.view.home_page.connect('search-entered', function (view, query) {
            this._update_ui_and_search(query);
        }.bind(this));
        this.view.home_page.connect('search-text-changed', this._on_search_text_changed.bind(this));
        this.view.home_page.connect('article-selected', this._on_article_selection.bind(this));

        this.view.section_page.connect('load-more-results', this._on_load_more_results.bind(this));

        this.view.home_page.connect('show-categories', this._on_categories_button_clicked.bind(this));
        this.article_presenter.connect('ekn-link-clicked', this._on_ekn_link_clicked.bind(this));
        this.view.categories_page.connect('show-home', this._on_home_button_clicked.bind(this));
        this._original_page = this.view.home_page;
        this._search_origin_page = this.view.home_page;
        this._autocomplete_results = [];
    },

    // Launcher override
    desktop_launch: function (timestamp) {
        this.view.present_with_time(timestamp);
    },

    // Should be mocked out during tests so that we don't actually send metrics
    record_search_metric: function (query) {
        let recorder = EosMetrics.EventRecorder.get_default();
        recorder.record_event(_SEARCH_METRIC, new GLib.Variant('(ss)',
            [query, this.application.application_id]));
    },

    _on_load_more_results: function () {
        this._get_more_results(RESULTS_SIZE, function (err, results, get_more_results_func) {
            if (err !== undefined) {
                printerr(err);
                printerr(err.stack);
            } else {
                let cards = results.map(this._new_card_from_article_model.bind(this));
                if (cards.length > 0) {
                    if (this._template_type === 'B') {
                        this.view.section_page.cards = this.view.section_page.cards.concat(cards);
                    } else {
                        let article_segment_title = _("Articles");
                        this.view.section_page.append_to_segment(article_segment_title, cards);
                    }
                }
                this._get_more_results = get_more_results_func;
            }
        }.bind(this));
    },

    _on_topbar_back_clicked: function () {
        this._lightbox_presenter.hide_lightbox();
        this._history_presenter.go_back();
        this._replicate_history_state(EosKnowledgePrivate.LoadingAnimationType.BACKWARDS_NAVIGATION);
    },

    _on_topbar_forward_clicked: function () {
        this._lightbox_presenter.hide_lightbox();
        this._history_presenter.go_forward();
        this._replicate_history_state(EosKnowledgePrivate.LoadingAnimationType.FORWARDS_NAVIGATION);
    },

    _replicate_history_state: function (animation_type) {
        let current_item = this._history_presenter.history_model.current_item;
        let article_origin_query_obj = current_item.article_origin_query_obj;
        switch (current_item.page_type) {
            case this._SEARCH_PAGE:
                this._perform_search(this.view, current_item.query_obj);
                break;
            case this._SECTION_PAGE:
                this._target_page_title = current_item.title;
                this.engine.get_objects_by_query(article_origin_query_obj, this._load_section_page.bind(this));
                break;
            case this._ARTICLE_PAGE:
                if (article_origin_query_obj.query !== this._latest_origin_query_obj.query) {
                    this.engine.get_objects_by_query(article_origin_query_obj, this._refresh_sidebar_callback.bind(this));
                }
                this.article_presenter.load_article(current_item.article_model, animation_type);
                // For Template B, we reset the highlight to the card with the same title
                if (this._template_type === 'B')
                    this.view.section_page.highlight_card_with_name(
                        current_item.title,
                        current_item.article_origin_page
                    );
                this.view.show_article_page();
                break;
            case this._CATEGORIES_PAGE:
                this.view.show_categories_page();
                break;
            default:
                this.view.show_home_page();
        }

        // Update latest origin query.
        this._latest_origin_query_obj = current_item.article_origin_query_obj;
    },

    _refresh_sidebar_callback: function (err, results, get_more_results_func) {
        this._set_section_page_content(results);
        this._get_more_results = get_more_results_func;
    },

    _set_sections: function(sections) {
        let new_card_from_section = (section) => {
            let card;
            let title = section['title'].charAt(0).toUpperCase() + section['title'].slice(1);
            if (this._template_type === 'A') {
                card = new CardA.CardA({
                    title: title,
                });
            } else {
                card = new CardB.CardB({
                    title: title,
                });
            }

            if (section.hasOwnProperty('thumbnailURI')) {
                card.thumbnail_uri = section['thumbnailURI'];
            } else {
                // log a warning that this category is missing its thumbnail
                printerr("WARNING: Missing category thumbnail for " + title);
            }

            if (section.hasOwnProperty('featured')) {
                card.featured = section['featured'];
            }

            card.connect('clicked', this._on_section_card_clicked.bind(this, section['tags']));
            return card;
        };

        if (this._template_type === 'A') {
            for (let page of [this.view.home_page, this.view.categories_page]) {
                let category_cards = sections.map(new_card_from_section);
                page.cards = category_cards;
            }
        } else {
            this.view.home_page.cards = sections.map(new_card_from_section);
        }
    },

    _on_categories_button_clicked: function (button) {
        this._original_page = this.view.categories_page;
        this._add_history_object_for_categories_page();
        this.view.show_categories_page();
    },

    _on_home_button_clicked: function (button) {
        this._original_page = this.view.home_page;
        this._add_history_object_for_home_page();
        this.view.show_home_page();
    },

    _on_section_card_clicked: function (tags, card) {
        this.view.lock_ui();

        let query_obj = new QueryObject.QueryObject({
            'tags': tags,
            'limit': RESULTS_SIZE,
        });
        this._target_page_title = card.title;
        this._add_history_object_for_section_page(query_obj);
        this.engine.get_objects_by_query(query_obj, this._load_section_page.bind(this));
    },

    // Launcher override
    search: function (timestamp, query) {
        this._update_ui_and_search(query);
        this.view.present_with_time(timestamp);
    },

    _update_ui_and_search: function (query) {
        query = Utils.sanitize_query(query);

        // Ignore empty queries
        if (query.length === 0) {
            return;
        }

        this.record_search_metric(query);

        let query_obj = new QueryObject.QueryObject({
            query: query,
            limit: RESULTS_SIZE,
        });

        this.view.search_box.text = query;
        this._add_history_object_for_search_page(query_obj);
        this._perform_search(this.view, query_obj);
    },

    _perform_search: function (view, query_obj) {
        this._search_query = query_obj.query;
        /* TRANSLATORS: this appears on top of the search results page; %s will
        be replaced with the string that the user searched for. */
        this._target_page_title = _("Results for \"%s\"").format(query_obj.query);
        this.view.lock_ui();

        // We clear the search box in the home page after each search.
        // The topbar search box should also clear once an article has been chosen.
        this.view.home_page.search_box.text = '';

        this.engine.get_objects_by_query(query_obj, this._load_section_page.bind(this));
    },

    _on_search_focus: function (view, focused) {
        // If the user focused the search box, ensure that the lightbox is hidden
        this._lightbox_presenter.hide_lightbox();
    },

    /*
     * Returns either the title or origin_title of the obj, depending on which one
     * is closer to having query as a prefix. Doesn't use a simple indexOf, because
     * of the fact that query might not be accented, even when titles are.
     */
    _get_prefixed_title: function (obj, query) {
        let title = obj.title.toLowerCase();
        let original_title = obj.original_title.toLowerCase();
        query = query.toLowerCase();

        for (let i = 0; i < query.length; i++) {
            if (title[i] !== original_title[i]) {
                if (title[i] === query[i]) {
                    return obj.title;
                } else if (original_title[i] === query[i]) {
                    return obj.original_title;
                }
            }
        }

        return obj.title;
    },

    _on_search_text_changed: function (view, entry) {
        let query = Utils.sanitize_query(entry.text);
        this._latest_search_text = query;
        // Ignore empty queries
        if (query.length === 0) {
            return;
        }

        let query_obj = new QueryObject.QueryObject({
            query: query,
            limit: RESULTS_SIZE,
        });
        this.engine.get_objects_by_query(query_obj, function (err, results, get_more_results_func) {
            if (err !== undefined) {
                printerr(err);
                printerr(err.stack);
            } else {
                entry.set_menu_items(results.map(function (obj) {
                    return {
                        title: this._get_prefixed_title(obj, query),
                        id: obj.ekn_id
                    };
                }.bind(this)));
                this._autocomplete_results = results;
                this._get_more_results_from_search = get_more_results_func;
            }
        }.bind(this));
    },

    _on_article_selection: function (view, id) {
        if (view === this.view.home_page) {
            this._search_origin_page = this.view.home_page;
        } else {
            this._search_origin_page = this.view.section_page;
        }
        this._get_more_results = this._get_more_results_from_search;

        this._latest_origin_query_obj = new QueryObject.QueryObject({
            query: this._latest_search_text,
        });
        // If template B, we need to set the autocomplete results as the cards on the
        // section page
        if (this._template_type === 'B') {
            let cards = this._autocomplete_results.map(this._new_card_from_article_model.bind(this));
            this.view.section_page.cards = cards;
        }

        let selected_model = this._autocomplete_results.filter(function (element) {
            return element.ekn_id === id;
        }, id)[0];
        this._add_history_object_for_article_page(selected_model);
        this.article_presenter.load_article(selected_model, EosKnowledgePrivate.LoadingAnimationType.NONE, function () {
            this.view.show_article_page();
        }.bind(this));
    },

    // Launcher override
    activate_search_result: function (timestamp, ekn_id, query) {
        let query_obj = new QueryObject.QueryObject({
            query: query,
            limit: RESULTS_SIZE,
        });
        this.engine.get_objects_by_query(query_obj, this._refresh_sidebar_callback.bind(this));
        this._latest_origin_query_obj = query_obj;

        this.engine.get_object_by_id(ekn_id, function (err, model) {
            if (err !== undefined) {
                printerr(err);
                printerr(err.stack);
            } else {
                this._add_history_object_for_article_page(model);
                this.article_presenter.load_article(model, EosKnowledgePrivate.LoadingAnimationType.NONE,
                                                    function () {
                                                        this.view.search_box.text = query;
                                                        this.view.show_article_page();
                                                    }.bind(this));
            }
        }.bind(this));
        this.view.present_with_time(timestamp);
    },

    _on_article_card_clicked: function (card, model) {
        let animation_type = this.view.get_visible_page() !== this.view.article_page ? EosKnowledgePrivate.LoadingAnimationType.NONE : EosKnowledgePrivate.LoadingAnimationType.FORWARDS_NAVIGATION;

        // Grab the title of the latest article card clicked.
        // All subsequent navigations from this article page need to add a visual cue to this card.
        this._latest_article_card_title = model.title;

        this._add_history_object_for_article_page(model);
        this.article_presenter.load_article(model, animation_type, function () {
            this.view.show_article_page();
        }.bind(this));
        if (this._template_type === 'B')
            this.view.section_page.highlight_card(card);
    },

    _add_history_object_for_article_page: function (model) {
        this._history_presenter.set_current_item(
            model.title, // title
            this._ARTICLE_PAGE, // page_type
            model, // article_model
            null, // query_obj
            this._latest_origin_query_obj, // article_origin_query_obj
            this._latest_article_card_title // article_origin_page
        );
    },

    _add_history_object_for_search_page: function (query_obj) {
        this._latest_origin_query_obj = query_obj;
        this._history_presenter.set_current_item(
            this._target_page_title, // title
            this._SEARCH_PAGE, // page_type
            null, // article_model
            query_obj, // query_obj
            this._latest_origin_query_obj // article_origin_query_obj
        );
    },

    _add_history_object_for_section_page: function (query_obj) {
        this._latest_origin_query_obj = query_obj;
        this._history_presenter.set_current_item(
            this._target_page_title, // title
            this._SECTION_PAGE, // page_type
            null, // article_model
            query_obj, // query_obj
            this._latest_origin_query_obj // article_origin_query_obj
        );
    },

    _add_history_object_for_home_page: function () {
        this._history_presenter.set_current_item(
            '', // title
            this._HOME_PAGE, // page_type
            null, // article_model
            null, // query_obj
            this._latest_origin_query_obj // article_origin_query_obj
        );
    },

    _add_history_object_for_categories_page: function () {
        this._history_presenter.set_current_item(
            '', // title
            this._CATEGORIES_PAGE, // page_type
            null, // article_model
            null, // query_obj
            this._latest_origin_query_obj // article_origin_query_obj
        );
    },

    _on_ekn_link_clicked: function (article_presenter, ekn_id) {
        this.engine.get_object_by_id(ekn_id, function (err, model) {
            if (typeof err === 'undefined') {
                if (model instanceof MediaObjectModel.MediaObjectModel) {
                    this._lightbox_presenter.show_media_object(article_presenter.article_model, model);
                } else {
                    this._add_history_object_for_article_page(model);
                    this.article_presenter.load_article(model, EosKnowledgePrivate.LoadingAnimationType.FORWARDS_NAVIGATION);

                    if (this._template_type === 'B')
                        this.view.section_page.highlight_card_with_name(model.title, this._latest_article_card_title);
                }
            } else {
                printerr(err);
                printerr(err.stack);
            }
        }.bind(this));
    },

    _on_back: function () {
        let visible_page = this.view.get_visible_page();
        if (visible_page === this.view.article_page) {
            if (this._search_origin_page === this.view.home_page) {
                this._add_history_object_for_home_page();
                this.view.show_home_page();
            } else {
                this._add_history_object_for_section_page(this._latest_origin_query_obj);
                this.view.show_section_page();
            }
            if (this._template_type === 'B')
                this.view.section_page.clear_highlighted_cards();
        } else if (visible_page === this.view.section_page || visible_page === this.view.no_search_results_page) {
            if (this._original_page === this.view.home_page) {
                this._add_history_object_for_home_page();
                this.view.show_home_page();
            } else if (this._original_page === this.view.categories_page) {
                this.view.show_categories_page();
            }
        } else {
            // Do nothing
        }
    },

    _load_section_page: function (err, results, get_more_results_func) {
        if (err !== undefined) {
            printerr(err);
            printerr(err.stack);
        } else if (results.length === 0) {
            this.view.no_search_results_page.query = this._search_query;
            this._search_origin_page = this.view.section_page;
            this.view.unlock_ui();
            this.view.show_no_search_results_page();
        } else {
            this.view.section_page.title = this._target_page_title;
            this._set_section_page_content(results);
            this._get_more_results = get_more_results_func;
            this._search_origin_page = this.view.section_page;
            this.view.unlock_ui();
            this.view.show_section_page();
        }
    },

    _set_section_page_content: function (results) {
        let cards = results.map(this._new_card_from_article_model.bind(this));
        if (this._template_type === 'B') {
            this.view.section_page.cards = cards;
        } else {
            let article_segment_title = _("Articles");
            this.view.section_page.remove_all_segments();
            this.view.section_page.append_to_segment(article_segment_title, cards);
        }
    },

    _new_card_from_article_model: function (model) {
        let fade_in = true;
        let card_class = ArticleCard.ArticleCard;
        if (model.content_type === 'application/pdf') {
            card_class = PdfCard.PdfCard;
        } else if (this._template_type === 'B') {
            fade_in = false;
            card_class = TextCard.TextCard;
        }
        let card = new card_class({
            title: model.title,
            synopsis: model.synopsis,
            fade_in: fade_in,
        });
        card.connect('clicked', function () {
            this._on_article_card_clicked(card, model);
        }.bind(this));
        return card;
    },
});

// Copyright 2015 Endless Mobile, Inc.

/* exported Card, MinSize, MaxSize */

const EosKnowledgePrivate = imports.gi.EosKnowledgePrivate;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const Mainloop = imports.mainloop;

const ArticleObjectModel = imports.search.articleObjectModel;
const ContentObjectModel = imports.search.contentObjectModel;
const Engine = imports.search.engine;
const ImageCoverFrame = imports.app.widgets.imageCoverFrame;
const Module = imports.app.interfaces.module;
const SearchUtils = imports.search.utils;
const SetMap = imports.app.setMap;
const SetObjectModel = imports.search.setObjectModel;
const SpaceContainer = imports.app.widgets.spaceContainer;
const Utils = imports.app.utils;

/**
 * Enum: Sequence
 *
 * PREVIOUS - Previous article in the sequence.
 * NEXT     - Next article in the sequence.
 * NONE     - Not part of a sequence.
 */
const Sequence = SearchUtils.define_enum(['PREVIOUS', 'NEXT', 'NONE']);

/**
 * Constant: WIDTH_STYLE_CLASSES
 *
 * This object packs the different CSS classes that describe the width of a card
 * widget.
 */
const WIDTH_STYLE_CLASSES = {
    A: 'width-a',
    B: 'width-b',
    C: 'width-c',
    D: 'width-d',
    E: 'width-e',
    F: 'width-f',
    G: 'width-g',
    H: 'width-h',
};

/**
 * Constant: HEIGHT_STYLE_CLASSES
 *
 * This object packs the different CSS classes that describe the height of a card
 * widget.
 */
const HEIGHT_STYLE_CLASSES = {
    A: 'height-a',
    B: 'height-b',
    C: 'height-c',
    D: 'height-d',
    E: 'height-e',
};

/**
 * Constants: MinSize
 * Minimum size of cards for each size class
 *
 * Members:
 *  A - Smallest possible size for cards
 *  B - Size B
 *  C - Size C
 *  D - Size D
 *  E - Size E
 *  F - Currently width-only
 *  G - Currently width-only
 *  H - Currently width-only
 */
const MinSize = {
    A: 100,
    B: 200,
    C: 300,
    D: 400,
    E: 600,
    F: 800,
    G: 1000,
    H: 1200,
};

/**
 * Constants: MaxSize
 * Maximum size of a card for each size class
 *
 * Members:
 *  A - Size A
 *  B - Size B
 *  C - Size C
 *  D - Size D
 *  E - This is the largest height class that a card will currently get.
 *      Even cards that are taller than this will still get class E.
 *  F - Currently width-only
 *  G - Currently width-only
 *  H - Currently width-only.
 *      Even cards that are wider than this will still get class H.
 */
const MaxSize = {
    A: MinSize.B - 1,
    B: MinSize.C - 1,
    C: MinSize.D - 1,
    D: MinSize.E - 1,
    E: MinSize.F - 1,
    F: MinSize.G - 1,
    G: MinSize.H - 1,
    H: 1399,
};

/**
 * Interface: Card
 * Interface for card modules
 *
 * Requires:
 *   Gtk.Widget
 */
const Card = new Lang.Interface({
    Name: 'Card',
    GTypeName: 'EknCard',
    Requires: [ Gtk.Widget, Module.Module ],

    Properties: {
        /**
         * Property: model
         * Record backing this card
         *
         * Every card is backed by a record in the database.
         * A card's record is represented by a <ContentObjectModel> or one of
         * its subclasses.
         *
         * Type:
         *   <ContentObjectModel>
         *
         * Flags:
         *   Construct only
         */
        'model': GObject.ParamSpec.object('model', 'Model',
            'Card model with which to create this card',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            ContentObjectModel.ContentObjectModel),
        /**
         * Property: title-capitalization
         * Manner in which the card's title is formatted
         *
         * This property is a temporary stand-in for achieving this via the CSS
         * *text-transform* property.
         */
        'title-capitalization': GObject.ParamSpec.enum('title-capitalization',
            'Title capitalization', 'Manner in which the title is formatted',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            EosKnowledgePrivate.TextTransformType,
            EosKnowledgePrivate.TextTransform.NONE),
        /**
         * Property: context-capitalization
         * Manner in which the card's context label is formatted
         *
         * This property is a temporary stand-in for achieving this via the CSS
         * *text-transform* property.
         */
        'context-capitalization': GObject.ParamSpec.enum('context-capitalization',
            'Title capitalization', 'Manner in which the context is formatted',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            EosKnowledgePrivate.TextTransformType,
            EosKnowledgePrivate.TextTransform.NONE),
        /**
         * Property: highlight-string
         * A substring within a card's title or synopsis to get highlighted
         *
         * Sometimes we want to highlight a particular substring with the
         * text of a card. This property specifies which substring to highlight.
         */
        'highlight-string': GObject.ParamSpec.string('highlight-string',
            'Highlight string', 'Substring to be highlighted on card',
            GObject.ParamFlags.READWRITE,
            ''),
        /**
         * Property: text-halign
         * Horizontal alignment of text when card is in _not_ in horizontal mode.
         *
         * Default value:
         *   **Gtk.Align.CENTER**
         */
        'text-halign': GObject.ParamSpec.enum('text-halign',
            'Title halign', 'Horizontal alignment of title text',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            Gtk.Align.$gtype, Gtk.Align.CENTER),
        /**
         * Property: sequence
         * A <Sequence> value for the card. Previous or next.
         */
        'sequence': GObject.ParamSpec.uint('sequence', 'Sequence', 'Sequence',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            0, Object.keys(Sequence).length, Sequence.NONE),
    },

    set css (v) {
        if (this._css === v)
            return;
        this._css = v;
        if (this._css) {
            Utils.apply_css_to_widget(this._css, this);
        }
        this.notify('css');
    },

    get css () {
        if (this._css)
            return this._css;
        return '';
    },

    get highlight_string () {
        if (this._highlight_string)
            return this._highlight_string;
        return '';
    },

    set highlight_string (value) {
        if (this._highlight_string === value)
            return;
        this._highlight_string = value;
        this.update_highlight_string();
        this.notify('highlight-string');
    },

    get sequence () {
        if (typeof this._sequence !== 'undefined')
            return this._sequence;
        return Sequence.NONE;
    },

    set sequence (value) {
        if (this._sequence === value)
            return;
        this._sequence = value;
        if (this._sequence === Sequence.PREVIOUS) {
            this.get_style_context().add_class('previous');
        }
        if (this._sequence === Sequence.NEXT) {
            this.get_style_context().add_class('next');
        }
        this.notify('sequence');
    },

    // Overridable in tests; otherwise keep synchronized with the CSS
    FADE_IN_TIME_MS: 1000,
    NUM_STYLE_VARIANTS: 3,

    /**
     * Method: set_label_or_hide
     *
     * Sets a label contents and hides if contents is empty.
     */
    set_label_or_hide: function (label, text) {
        label.label = GLib.markup_escape_text(text, -1);
        label.visible = !!text;
    },

    /**
     * Method: create_context_widget_from_model
     *
     * Sets the text on a context label. The context is the list of tags
     * associated with this article. Tags are also incidentally the same
     * as set titles.
     *
     * According to designs (and based on what fits on screen), we only want
     * to show a maximum of two set titles in the context label.
     * Moreover, we want to exclude the 'Ekn'-prefixed tags which won't mean
     * anything to the user.
     */
    create_context_widget_from_model: function () {
        let widget = new SpaceContainer.SpaceContainer({
            orientation: Gtk.Orientation.HORIZONTAL,
        });

        // Sort the context tags from shortest to longest in order to
        // maximise chances that we can fit two of them on the card.
        let titles = this.get_parent_set_titles().sort((a, b) => a.length - b.length);
        if (titles.length > 0) {
            let first_tag = new Gtk.Label({
                lines: 1,
                label: Utils.format_capitals(titles[0], this.context_capitalization),
            });
            widget.add(first_tag);

            if (titles.length > 1) {
                let second_tag = new Gtk.Label({
                    lines: 1,
                    label: ' | ' + Utils.format_capitals(titles[1], this.context_capitalization),
                });
                widget.add(second_tag);
            }
        }

        widget.get_style_context().add_class('card-context');
        widget.show_all();
        return widget;
    },

    /**
     * Method: get_parent_set_titles
     *
     * Gets the unique list of titles of this article's parent sets.
     */
    get_parent_set_titles: function () {
        return this.model.tags.filter((tag) => !tag.startsWith('Ekn'))
                              .map((tag) => SetMap.get_set_for_tag(tag))
                              .filter((set) => typeof set !== 'undefined')
                              .map((set) => set.title)
                              .filter((title, pos, self) => self.indexOf(title) === pos);
    },

    /**
     * Method: set_thumbnail_frame_from_model
     *
     * Sets up a frame to show the model's thumbnail uri.
     */
    set_thumbnail_frame_from_model: function (frame) {
        frame.visible = false;
        if (!this.model.thumbnail_uri)
            return;

        let coveredFrame = new ImageCoverFrame.ImageCoverFrame();
        frame.add(coveredFrame);

        let cancellable = null;
        let file = Gio.File.new_for_uri(this.model.thumbnail_uri);
        let stream = file.read(cancellable);
        coveredFrame.set_content(stream);
        frame.visible = true;
    },

    /**
     * Method: set_label_with_highlight
     *
     * Sets up a label that should highlight any substrings within it that
     * match the card's highlight-string property.
     * Does the same as <set_label_or_hide()> but highlights the highlight
     * string in the label as well.
     */
    set_label_with_highlight: function (label, str) {
        let title = GLib.markup_escape_text(str, -1);
        label.visible = !!title;
        if (this.highlight_string.length == 0) {
            label.label = title;
            return;
        }
        // parenthesize the targeted string so we can reference it later on in
        // the replace step using '$1'. This is so we can preserve case
        // sensitivity when doing the replacement.
        let regex = new RegExp('(' + this.highlight_string + ')', 'gi');
        let update_highlight = function (context) {
            context.save();
            context.add_class('highlighted');
            let span = Utils.style_context_to_markup_span(label.get_style_context(), Gtk.StateFlags.NORMAL);
            context.restore();
            label.label = title.replace(regex, span + '$1</span>');
        }
        let context = label.get_style_context();
        update_highlight(context);
        label.get_style_context().connect('changed', update_highlight);
    },

    /**
     * Method: update_highlight_string
     * Implement for highlighting card titles and synopses
     *
     * Implement this method in order to allow highlighting search terms on
     * card titles and synopses.
     * If not overridden, then setting <highlight-string> will have no effect.
     *
     * Note that this may be called early in the construct phase of your object,
     * so make sure that you check whether any widgets you access exist.
     * Also, make sure to call it after chaining up in your constructor.
     *
     * There is no need to chain up when overriding this method, since it has no
     * effect by default.
     */
    update_highlight_string: function () {
        // no-op unless overridden, but not mandatory to override
    },

    /**
     * Method: set_title_label_from_model
     *
     * Sets up a label to show the model's title.
     */
    set_title_label_from_model: function (label) {
        this.set_label_or_hide(label,
            Utils.format_capitals(this.model.title, this.title_capitalization));
    },

    /**
     * Method: set_title_label_with_highlight
     *
     * Sets up a label to show the model's title, and also highlights the
     * highlight string in the title.
     */
    set_title_label_with_highlight: function (label) {
        this.set_label_with_highlight(label,
            Utils.format_capitals(this.model.title, this.title_capitalization));
    },

    /**
     * Method: set_author_label_from_model
     *
     * Sets up a label to show the model's authors.
     */
    set_author_label_from_model: function (label) {
        this.set_label_or_hide(label, Utils.format_authors(this.model.authors));
    },

    /**
     * Method: update_card_sizing_classes
     * Assigns the appropriate CSS classes based on the height and width
     *
     * This method takes the height and width of the card widget and assigns the
     * appropriate CSS classes, according to our design constraints.
     */
    update_card_sizing_classes: function (height, width) {
        let width_class = WIDTH_STYLE_CLASSES['H'];
        ['A', 'B', 'C', 'D', 'E', 'F', 'G'].reverse().forEach((name) => {
            if (width <= MaxSize[name])
                width_class = WIDTH_STYLE_CLASSES[name];
        });

        let height_class = HEIGHT_STYLE_CLASSES['E'];
        ['A', 'B', 'C', 'D'].reverse().forEach((name) => {
            if (height <= MaxSize[name])
                height_class = HEIGHT_STYLE_CLASSES[name];
        });

        let context = this.get_style_context();
        if (!context.has_class(width_class)) {
            Object.keys(WIDTH_STYLE_CLASSES)
                .filter(klass => klass !== width_class)
                .forEach(klass => context.remove_class(klass));
            context.add_class(width_class);
        }

        if (!context.has_class(height_class)) {
            Object.keys(HEIGHT_STYLE_CLASSES)
                .filter(klass => klass !== height_class)
                .forEach(klass => context.remove_class(klass));
            context.add_class(height_class);
        }
    },

    /**
     * Method: fade_in
     * Use instead of *Gtk.Widget.show()* or *Gtk.Widget.show_all()*.
     */
    fade_in: function () {
        if (Utils.low_performance_mode()) {
            this.show();
            return;
        }

        let context = this.get_style_context();
        context.add_class('invisible');
        // FIXME: for some reason even if initial opacity = 0 in css, the
        // opacity will start at 1. Triggering a 'notify' on opacity seems to
        // get the actual initial opacity value in css to be respected
        this.opacity = 0;
        this.opacity = 1;
        // Cards not sensitive till fully faded in
        this.sensitive = false;
        Mainloop.timeout_add(this.FADE_IN_TIME_MS, () => {
            this.sensitive = true;
            context.remove_class('invisible');
            context.remove_class('fade-in');
            return GLib.SOURCE_REMOVE;
        });
        this.show();
        context.add_class('fade-in');
    },
});

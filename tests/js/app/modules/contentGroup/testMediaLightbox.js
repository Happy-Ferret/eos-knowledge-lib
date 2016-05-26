const Gtk = imports.gi.Gtk;

const Utils = imports.tests.utils;
Utils.register_gresource();

const Actions = imports.app.actions;
const ArticleObjectModel = imports.search.articleObjectModel;
const MediaObjectModel = imports.search.mediaObjectModel;
const Minimal = imports.tests.minimal;
const MockDispatcher = imports.tests.mockDispatcher;
const MockEngine = imports.tests.mockEngine;
const MockFactory = imports.tests.mockFactory;
const MediaLightbox = imports.app.modules.contentGroup.mediaLightbox;
const WidgetDescendantMatcher = imports.tests.WidgetDescendantMatcher;

Gtk.init(null);

describe('ContentGroup.MediaLightbox', function () {
    let module, engine, factory, dispatcher;

    beforeEach(function () {
        jasmine.addMatchers(WidgetDescendantMatcher.customMatchers);
        dispatcher = MockDispatcher.mock_default();
        engine = MockEngine.mock_default();

        [module, factory] = MockFactory.setup_tree({
            type: MediaLightbox.MediaLightbox,
            slots: {
                'card-type': { type: Minimal.MinimalCard },
            },
        });
    });

    it('creates pack a card module from the card-type slot', function () {
        let media_object_uri = 'ekn://foo/bar';
        let media_object = new MediaObjectModel.MediaObjectModel({
            ekn_id: media_object_uri,
        });
        let article_model = new ArticleObjectModel.ArticleObjectModel({
            resources: [media_object_uri],
        });
        dispatcher.dispatch({
            action_type: Actions.SHOW_ARTICLE,
            model: article_model,
        });
        dispatcher.dispatch({
            action_type: Actions.SHOW_MEDIA,
            model: media_object,
        });
        expect(module).toHaveDescendantWithClass(Minimal.MinimalCard);
    });

    it('loads media into lightbox if and only if it is a member of article\'s resource array', function () {
        let media_object_uri = 'ekn://foo/bar';
        let media_object = new MediaObjectModel.MediaObjectModel({
            ekn_id: media_object_uri,
        });
        let article_model = new ArticleObjectModel.ArticleObjectModel({
            resources: [media_object_uri],
        });
        dispatcher.dispatch({
            action_type: Actions.SHOW_ARTICLE,
            model: article_model,
        });
        dispatcher.dispatch({
            action_type: Actions.SHOW_MEDIA,
            model: media_object,
        });
        expect(factory.get_created('card-type').length).toBe(1);

        let nonexistant_media_object = new MediaObjectModel.MediaObjectModel({
            ekn_id: 'ekn://no/media',
        });
        dispatcher.dispatch({
            action_type: Actions.SHOW_MEDIA,
            model: nonexistant_media_object,
        });
        expect(factory.get_created('card-type').length).toBe(1);
    });
});

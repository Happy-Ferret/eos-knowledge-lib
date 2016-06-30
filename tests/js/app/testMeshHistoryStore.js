const Actions = imports.app.actions;
const AppUtils = imports.app.utils;
const ArticleObjectModel = imports.search.articleObjectModel;
const MediaObjectModel = imports.search.mediaObjectModel;
const MeshHistoryStore = imports.app.meshHistoryStore;
const MockDispatcher = imports.tests.mockDispatcher;
const MockEngine = imports.tests.mockEngine;
const Pages = imports.app.pages;
const SetObjectModel = imports.search.setObjectModel;

describe('MeshHistoryStore', function () {
    let store, dispatcher, engine;

    beforeEach(function () {
        dispatcher = MockDispatcher.mock_default();
        engine = MockEngine.mock_default();
        store = new MeshHistoryStore.MeshHistoryStore();
        store.set_current_item_from_props({ page_type: Pages.HOME });
        spyOn(AppUtils, 'record_search_metric');
    });

    it('goes back to the home page when home button is clicked', function () {
        dispatcher.dispatch({
            action_type: Actions.HOME_CLICKED,
        });
        expect(store.get_current_item().page_type).toBe(Pages.HOME);
    });

    it('goes to the home page when launched from desktop', function () {
        dispatcher.dispatch({
            action_type: Actions.LAUNCHED_FROM_DESKTOP,
        });
        expect(store.get_current_item().page_type).toBe(Pages.HOME);
    });

    it('shows the set page when a set model is clicked', function () {
        let model = new SetObjectModel.SetObjectModel({
            ekn_id: 'ekn://foo/set',
        });
        dispatcher.dispatch({
            action_type: Actions.ITEM_CLICKED,
            model: model,
        });
        expect(store.get_current_item().page_type).toBe(Pages.SET);
    });

    it('shows the article page when item clicked', function () {
        let model = new ArticleObjectModel.ArticleObjectModel({
            ekn_id: 'ekn://foo/bar',
        });
        dispatcher.dispatch({
            action_type: Actions.ITEM_CLICKED,
            model: model,
        });
        expect(store.get_current_item().page_type).toBe(Pages.ARTICLE);
    });

    it('goes back to the home page via the sidebar from search page', function () {
        store.set_current_item_from_props({
            page_type: Pages.SEARCH,
        });
        dispatcher.dispatch({
            action_type: Actions.NAV_BACK_CLICKED,
        });
        expect(store.get_current_item().page_type).toBe(Pages.HOME);
    });

    it('goes back to the home page via the sidebar from set page', function () {
        store.set_current_item_from_props({
            page_type: Pages.SET,
        });
        dispatcher.dispatch({
            action_type: Actions.NAV_BACK_CLICKED,
        });
        expect(store.get_current_item().page_type).toBe(Pages.HOME);
    });

    it('goes back to the home page via the sidebar from article page after having gone directly there', function () {
        store.set_current_item_from_props({
            page_type: Pages.ARTICLE,
        });
        dispatcher.dispatch({
            action_type: Actions.NAV_BACK_CLICKED,
        });
        expect(store.get_current_item().page_type).toBe(Pages.HOME);
    });

    it('goes back to the search page via the sidebar from article page', function () {
        store.set_current_item_from_props({
            page_type: Pages.SEARCH,
        });
        store.set_current_item_from_props({
            page_type: Pages.ARTICLE,
        });
        dispatcher.dispatch({
            action_type: Actions.NAV_BACK_CLICKED,
        });
        expect(store.get_current_item().page_type).toBe(Pages.SEARCH);
    });

    it('goes back to the set page via the sidebar from article page', function () {
        store.set_current_item_from_props({
            page_type: Pages.SET,
        });
        store.set_current_item_from_props({
            page_type: Pages.ARTICLE,
        });
        dispatcher.dispatch({
            action_type: Actions.NAV_BACK_CLICKED,
        });
        expect(store.get_current_item().page_type).toBe(Pages.SET);
    });

    it('sets the appropriate state when item clicked with a query (e.g. autocomplete)', function () {
        let model = new ArticleObjectModel.ArticleObjectModel({
            ekn_id: 'ekn://foo/bar',
        });
        dispatcher.dispatch({
            action_type: Actions.ITEM_CLICKED,
            model: model,
            query: 'foo',
        });
        let item = store.get_current_item();
        expect(item.page_type).toBe(Pages.ARTICLE);
        expect(item.model.ekn_id).toBe(model.ekn_id);
        expect(item.query).toBe('foo');
    });

    function test_search_action (action, descriptor) {
        describe('when ' + descriptor, function () {
            beforeEach(function () {
                dispatcher.dispatch({
                    action_type: action,
                    query: 'foo',
                });
            });

            it('goes to the search page', function () {
                expect(store.get_current_item().page_type).toBe(Pages.SEARCH);
            });

            it('records a metric', function () {
                expect(AppUtils.record_search_metric).toHaveBeenCalled();
            });
        });
    }
    test_search_action(Actions.SEARCH_TEXT_ENTERED, 'search text entered');
    test_search_action(Actions.DBUS_LOAD_QUERY_CALLED, 'desktop search opened');

    describe('when link in article clicked', function () {
        it('goes to article page', function () {
            let model = new ArticleObjectModel.ArticleObjectModel({
                ekn_id: 'ekn://foo/bar',
            });
            engine.get_object_by_id_finish.and.returnValue(model);
            dispatcher.dispatch({
                action_type: Actions.ARTICLE_LINK_CLICKED,
                model: model,
            });
            expect(store.get_current_item().page_type).toBe(Pages.ARTICLE);
        });

        it('shows lightbox if link was media', function () {
            let model = new MediaObjectModel.MediaObjectModel({
                ekn_id: 'ekn://foo/pix',
            });
            engine.get_object_by_id_finish.and.returnValue(model);
            dispatcher.dispatch({
                action_type: Actions.ARTICLE_LINK_CLICKED,
                model: model,
            });
            expect(dispatcher.last_payload_with_type(Actions.SHOW_MEDIA))
                .toBeDefined();
        });
    });

    describe('when desktop search result opened', function () {
        let model;

        beforeEach(function () {
            model = new ArticleObjectModel.ArticleObjectModel({
                ekn_id: 'ekn:///foo',
            });
            engine.get_object_by_id_finish.and.returnValue(model);
            dispatcher.dispatch({
                action_type: Actions.DBUS_LOAD_ITEM_CALLED,
                query: 'foo',
                ekn_id: 'ekn:///foo',
            });
        });

        it('loads an item', function () {
            expect(engine.get_object_by_id).toHaveBeenCalled();
            expect(engine.get_object_by_id.calls.mostRecent().args[0])
                .toBe('ekn:///foo');
        });

        it('goes to the article page', function () {
            expect(store.get_current_item().page_type).toBe(Pages.ARTICLE);
        });
    });
});

const Gtk = imports.gi.Gtk;
Gtk.init(null);

const Actions = imports.app.actions;
const CssClassMatcher = imports.tests.CssClassMatcher;
const HistoryStore = imports.app.historyStore;
const MockDispatcher = imports.tests.mockDispatcher;
const MockFactory = imports.tests.mockFactory;
const Pages = imports.app.pages;
const Simple = imports.app.modules.pager.simple;
const Utils = imports.tests.utils;

describe('Pager.Simple', function () {
    let pager, factory, dispatcher, store;

    beforeEach(function () {
        jasmine.addMatchers(CssClassMatcher.customMatchers);
        dispatcher = MockDispatcher.mock_default();
        store = new HistoryStore.HistoryStore();
        HistoryStore.set_default(store);
    });

    describe('without brand page', function () {
        beforeEach(function () {
            [pager, factory] = MockFactory.setup_tree({
                type: Simple.Simple,
                slots: {
                    'home-page': { type: null },
                    'set-page': { type: null },
                    'search-page': { type: null },
                    'article-page': { type: null },
                    'all-sets-page': { type: null },
                },
            });
        });

        it('updates the visible page when dispatcher says so', function () {
            let home_page = factory.get_last_created('home-page');
            let set_page = factory.get_last_created('set-page');
            let search_page = factory.get_last_created('search-page');
            let article_page = factory.get_last_created('article-page');
            let all_sets_page = factory.get_last_created('all-sets-page');
            store.set_current_item_from_props({ page_type: 'home' });
            expect(pager.visible_child).toBe(home_page);
            store.set_current_item_from_props({ page_type: 'set' });
            expect(pager.visible_child).toBe(set_page);
            store.set_current_item_from_props({ page_type: 'search' });
            expect(pager.visible_child).toBe(search_page);
            store.set_current_item_from_props({ page_type: 'article' });
            expect(pager.visible_child).toBe(article_page);
            store.set_current_item_from_props({ page_type: 'all-sets' });
            expect(pager.visible_child).toBe(all_sets_page);
        });

        it('starts on home page', function () {
            let home_page = factory.get_last_created('home-page');
            expect(pager.visible_child).toBe(home_page);
        });

        it('makes its home page ready', function () {
            let home_page = factory.get_last_created('home-page');
            spyOn(home_page, 'make_ready');
            pager.make_ready();
            expect(home_page.make_ready).toHaveBeenCalled();
        });

        // Need a way to reliably test this without relying on timing
        it('has the animating style class when animating');

        it('does not have the animating style class when not animating', function () {
            expect(pager).not.toHaveCssClass('PagerSimple--animating');
        });

        it('pre-shows the article page when desktop search result opened', function () {
            dispatcher.dispatch({ action_type: Actions.DBUS_LOAD_ITEM_CALLED });
            let article_page = factory.get_last_created('article-page');
            expect(pager.visible_child).toBe(article_page);
        });

        it('indicates busy while showing pages', function () {
            spyOn(pager, '_set_busy');
            store.set_current_item_from_props({ page_type: 'set' });
            expect(pager._set_busy).toHaveBeenCalledWith(true);
        });
    });

    describe('with a brand page', function () {
        beforeEach(function () {
            [pager, factory] = MockFactory.setup_tree({
                type: Simple.Simple,
                slots: {
                    'brand-page': { type: null },
                    'home-page': { type: null },
                    'set-page': { type: null },
                    'search-page': { type: null },
                    'article-page': { type: null },
                    'all-sets-page': { type: null },
                },
            });
        });

        it('starts on the brand page', function () {
            let brand_page = factory.get_last_created('brand-page');
            expect(pager.visible_child).toBe(brand_page);
        });

        it('shows the brand page until timeout has expired and home page is ready', function () {
            let brand_page = factory.get_last_created('brand-page');
            let home_page = factory.get_last_created('home-page');
            let home_page_ready = false;
            spyOn(home_page, 'make_ready').and.callFake(function (cb) {
                home_page_ready = true;
                if (cb) cb();
            });
            pager.BRAND_PAGE_TIME_MS = 0;
            store.set_current_item_from_props({
                page_type: Pages.HOME,
            });
            expect(pager.visible_child).toBe(brand_page);
            Utils.update_gui();
            expect(pager.visible_child).toBe(home_page);
            expect(home_page_ready).toBeTruthy();
        });

        it('shows the brand page only once', function () {
            store.set_current_item_from_props({
                page_type: Pages.HOME,
            });
            let brand_page = factory.get_last_created('brand-page');
            expect(pager.visible_child).toBe(brand_page);

            store.set_current_item_from_props({
                page_type: Pages.ARTICLE,
            });
            expect(pager.visible_child).not.toBe(brand_page);
            store.set_current_item_from_props({
                page_type: Pages.HOME,
            });
            expect(pager.visible_child).not.toBe(brand_page);
        });

        it('does not show the brand page on other launch methods', function () {
            store.set_current_item_from_props({
                page_type: Pages.ARTICLE,
            });
            let brand_page = factory.get_last_created('brand-page');
            expect(pager.visible_child).not.toBe(brand_page);
        });

        it('adds the correct CSS classes to all its pages', function () {
            let brand_page = factory.get_last_created('brand-page');
            expect(brand_page).toHaveCssClass('brand-page');
            let home_page = factory.get_last_created('home-page');
            expect(home_page).toHaveCssClass('home-page');
            let set_page = factory.get_last_created('set-page');
            expect(set_page).toHaveCssClass('set-page');
            let search_page = factory.get_last_created('search-page');
            expect(search_page).toHaveCssClass('search-page');
            let article_page = factory.get_last_created('article-page');
            expect(article_page).toHaveCssClass('article-page');
            let all_sets_page = factory.get_last_created('all-sets-page');
            expect(all_sets_page).toHaveCssClass('all-sets-page');
        });
    });

    it('still works without all optional components', function () {
        expect(() => {
            [pager] = MockFactory.setup_tree({
                type: Simple.Simple,
                slots: {
                    'home-page': { type: null },
                },
            });
        }).not.toThrow();
    });
});

// Copyright 2015 Endless Mobile, Inc.

const Gtk = imports.gi.Gtk;

const BannerSet = imports.app.modules.banner.set;
const HistoryStore = imports.app.historyStore;
const MockFactory = imports.tests.mockFactory;
const Minimal = imports.tests.minimal;
const Pages = imports.app.pages;
const SetObjectModel = imports.search.setObjectModel;
const WidgetDescendantMatcher = imports.tests.WidgetDescendantMatcher;

Gtk.init(null);

describe('Banner.Set', function () {
    let module, factory, store;

    beforeEach(function () {
        jasmine.addMatchers(WidgetDescendantMatcher.customMatchers);
        store = new HistoryStore.HistoryStore();
        HistoryStore.set_default(store);

        [module, factory] = MockFactory.setup_tree({
            type: BannerSet.Set,
            slots: {
                'card': { type: Minimal.MinimalCard },
            },
        });
    });

    it('creates a card when state changes to set page', function () {
        let model = new SetObjectModel.SetObjectModel();
        store.set_current_item_from_props({
            page_type: Pages.SET,
            model: model,
        });
        let card = factory.get_last_created('card');
        expect(card.model).toBe(model);
        expect(module).toHaveDescendant(card);
    });

    it('creates a new card for each new set model on set page', function () {
        let model1 = new SetObjectModel.SetObjectModel();
        let model2 = new SetObjectModel.SetObjectModel();
        store.set_current_item_from_props({
            page_type: Pages.SET,
            model: model1,
        });
        store.set_current_item_from_props({
            page_type: Pages.SET,
            model: model2,
        });
        expect(factory.get_created('card').length).toBe(2);
    });

    it('does not change for the same set model', function () {
        let model = new SetObjectModel.SetObjectModel();
        store.set_current_item_from_props({
            page_type: Pages.SET,
            model: model,
        });
        store.set_current_item_from_props({
            page_type: Pages.HOME,
        });
        store.set_current_item_from_props({
            page_type: Pages.SET,
            model: model,
        });
        expect(factory.get_created('card').length).toBe(1);
    });
});

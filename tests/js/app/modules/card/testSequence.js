const Gtk = imports.gi.Gtk;

const Utils = imports.tests.utils;
Utils.register_gresource();

const ContentObjectModel = imports.search.contentObjectModel;
const CssClassMatcher = imports.tests.CssClassMatcher;
const Sequence = imports.app.modules.card.sequence;

Gtk.init(null);

describe('Card.Sequence', function () {
    let model;

    beforeEach(function () {
        jasmine.addMatchers(CssClassMatcher.customMatchers);

        model = new ContentObjectModel.ContentObjectModel({
            title: '!!!',
        });
    });

    it('has a label with title class', function () {
        let card = new Sequence.Sequence({
            model: model,
        });
        expect(card).toHaveDescendantWithCssClass('title');
    });

    it('has a label with previous/next style classes', function () {
        let card = new Sequence.Sequence({
            model: model,
        });
        expect(card).toHaveDescendantWithCssClass('previous-label');
        expect(card).toHaveDescendantWithCssClass('next-label');
    });

    it('has title label that understand Pango markup', function () {
        let card = new Sequence.Sequence({
            model: model,
        });
        expect(Gtk.test_find_label(card, '*!!!*').use_markup).toBeTruthy();
    });
});

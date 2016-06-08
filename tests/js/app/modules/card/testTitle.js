const Gtk = imports.gi.Gtk;

const Utils = imports.tests.utils;
Utils.register_gresource();

const ContentObjectModel = imports.search.contentObjectModel;
const CssClassMatcher = imports.tests.CssClassMatcher;
const Title = imports.app.modules.card.title;

Gtk.init(null);

describe('Card.Title', function () {
    let card;

    beforeEach(function () {
        jasmine.addMatchers(CssClassMatcher.customMatchers);

        card = new Title.Title({
            model: new ContentObjectModel.ContentObjectModel(),
        });
    });

    it('has a label with title class', function () {
        expect(card).toHaveDescendantWithCssClass('title');
    });

    it('has a widget with before class', function () {
        expect(card).toHaveDescendantWithCssClass('before');
    });

    it('has a widget with after class', function () {
        expect(card).toHaveDescendantWithCssClass('after');
    });

    it('has labels that understand Pango markup', function () {
        let card = new Title.Title({
            model: new ContentObjectModel.ContentObjectModel({
                title: '!!!',
            }),
        });
        expect(Gtk.test_find_label(card, '*!!!*').use_markup).toBeTruthy();
    });
});

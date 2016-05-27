// Copyright 2016 Endless Mobile, Inc.

const ContentObjectModel = imports.search.contentObjectModel;
const Featured = imports.app.modules.filter.featured;

describe('Filter.Featured', function () {
    const MODELS = [true, false].map(featured =>
        new ContentObjectModel.ContentObjectModel({
            featured: featured,
        }));
    let filter;

    describe('normal mode', function () {
        beforeEach(function () {
            filter = new Featured.Featured();
        });

        it('is the default', function () {
            expect(filter.invert).toBeFalsy();
        });

        it('filters out a non-featured card', function () {
            expect(filter.include(MODELS[0])).toBeTruthy();
            expect(filter.include(MODELS[1])).toBeFalsy();
        });
    });

    describe('inverse mode', function () {
        beforeEach(function () {
            filter = new Featured.Featured({
                invert: true,
            });
        });

        it('filters out a featured card', function () {
            expect(filter.include(MODELS[0])).toBeFalsy();
            expect(filter.include(MODELS[1])).toBeTruthy();
        });
    });
});

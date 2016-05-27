const Gtk = imports.gi.Gtk;

const ArticleObjectModel = imports.search.articleObjectModel;
const InstanceOfMatcher = imports.tests.InstanceOfMatcher;

describe ('Article Object Model', function () {
    let articleObject, jsonld;

    beforeEach(function () {
        jasmine.addMatchers(InstanceOfMatcher.customMatchers);

        jsonld = {
            '@id': 'ekn:asoiaf/House_Greyjoy',
            'title': 'House Greyjoy',
            'synopsis': 'We Do Not Sow',
            'authors': ['Dalton Greyjoy', 'Dagon Greyjoy'],
            'tableOfContents': [
                {
                    '@id': '_:1',
                    'hasIndex': 0,
                    'hasIndexLabel': '1',
                    'hasLabel': 'History',
                    'hasContent': 'ekn://asoiaf/House_Greyjoy#History'
                },
            ],
        };
        articleObject = new ArticleObjectModel.ArticleObjectModel({}, jsonld);
    });

    describe ('JSON-LD marshaler', function () {
        it ('should construct from a JSON-LD document', function () {
            expect(articleObject).toBeDefined();
        });

        it ('should inherit properties set by parent class (ContentObjectModel)', function () {
            expect(articleObject.title).toBeDefined();
            expect(articleObject.synopsis).toBeDefined();
            expect(articleObject.resources).toBeDefined();
        });

        it ('should marshal a GtkTreeStore from JSON-LD TreeNodes', function () {
            expect(articleObject.table_of_contents).toBeA(Gtk.TreeStore);
        });

        it('marshals an authors array', function () {
            expect(articleObject.authors).toEqual(jsonld['authors']);
        });

        it('makes a deep copy of the authors array', function () {
            jsonld['authors'].push('Loron Greyjoy');
            expect(articleObject.authors).not.toEqual(jsonld['authors']);
        });
    });
});

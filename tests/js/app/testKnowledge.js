const ByteArray = imports.byteArray;
const EosKnowledgePrivate = imports.gi.EosKnowledgePrivate;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

Gtk.init(null);

const CssClassMatcher = imports.tests.CssClassMatcher;
const Knowledge = imports.app.knowledge;

describe('Syntactic sugar metaclass', function () {
    beforeEach(function () {
        jasmine.addMatchers(CssClassMatcher.customMatchers);
    });

    it('automatically sets the correct GTypeName', function () {
        const MyTypeName = new Knowledge.Class({
            Name: 'MyTypeName',
            Extends: GObject.Object,
        });
        expect(MyTypeName.$gtype.name).toEqual('EknMyTypeName');
    });

    it('sanitizes dots out of the autogenerated GTypeName', function () {
        const MyTypeDotName = new Knowledge.Class({
            Name: 'MyType.Name',
            Extends: GObject.Object,
        });
        expect(MyTypeDotName.$gtype.name).toEqual('EknMyType_Name');
    });

    it('can still set a custom GTypeName', function () {
        const MyCustomTypeName = new Knowledge.Class({
            Name: 'MyCustomTypeName',
            GTypeName: 'Barry',
            Extends: GObject.Object,
        });
        expect(MyCustomTypeName.$gtype.name).toEqual('Barry');
    });

    it('overrides properties automatically (this test should not warn)', function () {
        const MyGObjectInterface = new Lang.Interface({
            Name: 'MyGObjectInterface',
            Requires: [GObject.Object],
            Properties: {
                'foo': GObject.ParamSpec.boolean('foo', '', '',
                    GObject.ParamFlags.READWRITE, false),
            },
        });
        const MyClass = new Knowledge.Class({
            Name: 'MyModule',
            Extends: GObject.Object,
            Implements: [MyGObjectInterface],
        });
        expect(() => new MyClass()).not.toThrow();
    });

    it('does not try to override properties on a non-GObject interface', function () {
        const MyInterface = new Lang.Interface({
            Name: 'MyInterface',
        });
        expect(() => new Knowledge.Class({
            Name: 'MyClassImplementingLangInterface',
            Extends: GObject.Object,
            Implements: [MyInterface],
        })).not.toThrow();
    });

    it('works okay with GtkWidget subclasses', function () {
        let MyWidgetModule = new Knowledge.Class({
            Name: 'MyWidgetModule',
            Extends: Gtk.Grid,
            Template: ByteArray.fromString('<interface>' +
                '  <template class="EknMyWidgetModule" parent="GtkGrid">' +
                '    <child>' +
                '      <object class="GtkLabel" id="child"/>' +
                '    </child>' +
                '  </template>' +
                '</interface>'),
            InternalChildren: ['child'],
            _init: function (props={}) {
                this.parent(props);
                expect(this._child).toBeDefined();
            },
        });
        new MyWidgetModule();
    });

    it('can install style properties', function () {
        let MyStyleModule = new Knowledge.Class({
            Name: 'MyStyleModule',
            Extends: Gtk.Grid,
            StyleProperties: {
                'foo': GObject.ParamSpec.int('foo', '', '',
                    GObject.ParamFlags.READABLE, 0, 10, 5),
            },
            read_foo: function () {
                return EosKnowledgePrivate.style_context_get_custom_int(this.get_style_context(), 'foo');
            },
        });
        let widget = new MyStyleModule();
        expect(widget.read_foo()).toEqual(5);
    });

    it("won't install style properties on a non-GtkWidget", function () {
        expect(() => new Knowledge.Class({
            Name: 'MyNonWidget',
            Extends: GObject.Object,
            StyleProperties: {
                'foo': GObject.ParamSpec.int('foo', '', '',
                    GObject.ParamFlags.READABLE, 0, 10, 5),
            },
        })).toThrow();
    });

    it('autogenerates css class name from class name', function () {
        let MyStyleModule = new Knowledge.Class({
            Name: 'MyClassyModule',
            Extends: Gtk.Grid,
        });
        let widget = new MyStyleModule();
        expect(widget).toHaveCssClass('MyClassyModule');
    });

    it('ignores dots in class name when generating css name', function () {
        let MyStyleModule = new Knowledge.Class({
            Name: 'My...Classy..Module',
            Extends: Gtk.Grid,
        });
        let widget = new MyStyleModule();
        expect(widget).toHaveCssClass('MyClassyModule');
    });

    const MyInitInterface = new Lang.Interface({
        Name: 'MyInitInterface',
        _interface_init: function () {
            this.my_interface_inited = true;
        },
    });
    const MyInitGObjectInterface = new Lang.Interface({
        Name: 'MyInitGObjectInterface',
        Requires: [GObject.Object],
        _interface_init: function () {
            this.my_gobject_interface_inited = true;
        },
    });
    const MyInitedClass = new Knowledge.Class({
        Name: 'MyInitedClass',
        Extends: Gtk.Widget,
        Implements: [MyInitInterface, MyInitGObjectInterface],
        _init: function (props={}) {
            this.parent(props);
            this.class_inited = true;
        },
    });

    it('calls _interface_init() functions of implemented interfaces', function () {
        let object = new MyInitedClass();
        expect(object.my_interface_inited).toBeTruthy();
        expect(object.my_gobject_interface_inited).toBeTruthy();
        expect(object.class_inited).toBeTruthy();
    });

    it('calls _interface_init() functions of interfaces implemented by parents', function () {
        const MyInitedSubclass = new Knowledge.Class({
            Name: 'MyInitedSubclass',
            Extends: MyInitedClass,
        });
        let object = new MyInitedSubclass();
        expect(object.my_interface_inited).toBeTruthy();
        expect(object.my_gobject_interface_inited).toBeTruthy();
        expect(object.class_inited).toBeTruthy();
    });

    it('does not clobber unoverridden _init() functions of parents', function () {
        const MyPropertiesClass = new Knowledge.Class({
            Name: 'MyPropertiesClass',
            Extends: GObject.Object,
            Implements: [MyInitInterface],
            Properties: {
                'foo': GObject.ParamSpec.string('foo', '', '',
                    GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
                    'not inited'),
            },
        });
        let object = new MyPropertiesClass({
            'foo': 'inited',
        });
        expect(object.my_interface_inited).toBeTruthy();
        expect(object.foo).toEqual('inited');
    });

    it('does not call _interface_init() functions twice', function () {
        const MyCounterInterface = new Lang.Interface({
            Name: 'MyCounterInterface',
            _interface_init: function () {
                if (!this.iface_init_count)
                    this.iface_init_count = 0;
                this.iface_init_count++;
            },
        });
        const MyCounterParent = new Knowledge.Class({
            Name: 'MyCounterParent',
            Extends: GObject.Object,
        });
        const MyCounterSubclass = new Knowledge.Class({
            Name: 'MyCounterSubclass',
            Extends: MyCounterParent,
            Implements: [MyCounterInterface],
        });
        let object = new MyCounterSubclass();
        expect(object.iface_init_count).toEqual(1);
    });

    it('autogenerates css class name for implemented interfaces', function () {
        let widget = new MyInitedClass();
        expect(widget).toHaveCssClass('MyInitInterface');
        expect(widget).toHaveCssClass('MyInitGObjectInterface');
    });
});

// Copyright 2015 Endless Mobile, Inc.

const Cairo = imports.gi.cairo;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const Module = imports.app.interfaces.module;
const StyleClasses = imports.app.styleClasses;

/**
 * Class: PaperTemplate
 *
 * A template which displays the contents of its one slot as if it were printed on a sheet
 * of paper. The color or texture of the paper can be set with CSS, using
 * .paper-template .content as a selector.
 *
 * CSS Styles:
 *      paper-template - on the template as a whole, which is a GtkAlignment
 *      content - on the paper itself (the GtkFrame within the alignment)
 */
const PaperTemplate = new Lang.Class({
    Name: 'PaperTemplate',
    GTypeName: 'EknPaperTemplate',
    Extends: Gtk.Frame,
    Implements: [ Module.Module ],

    Properties: {
        'factory': GObject.ParamSpec.override('factory', Module.Module),
        'factory-name': GObject.ParamSpec.override('factory-name', Module.Module),
    },

    Template: 'resource:///com/endlessm/knowledge/widgets/paperTemplate.ui',
    InternalChildren: [ 'content-frame' ],

    _init: function (props={}) {
        this.parent(props);

        this._content = this.create_submodule('content');
        this._content_frame.add(this._content);
    },

    vfunc_size_allocate: function (alloc) {
        this.set_allocation(alloc);
        let margin = alloc.width / 5;
        let content_alloc = new Cairo.RectangleInt({
            x: alloc.x + margin,
            y: alloc.y,
            width: alloc.width - (2 * margin),
            height: alloc.height,
        });
        this._content_frame.size_allocate(content_alloc);
    },
});

// Copyright 2016 Endless Mobile, Inc.

/* exported FeaturedOrder */

const GObject = imports.gi.GObject;

const Module = imports.app.interfaces.module;
const Order = imports.app.interfaces.order;

/**
 * Class: FeaturedOrder
 * Order that sorts cards by placing featured before non-featured
 */
const FeaturedOrder = new Module.Class({
    Name: 'FeaturedOrder',
    Extends: GObject.Object,
    Implements: [Order.Order],

    compare_impl: function (left, right) {
        if (left.featured === right.featured)
            return 0;
        if (left.featured)
            return -1;
        return 1;
    },
});
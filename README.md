eos-knowledge-lib
=================

Welcome to **eos-knowledge-lib**!
This is Endless' Javascript library for building offline content apps using modular UI blocks and declarative UI files.

This project uses the GNOME technology stack, including GTK and WebKit for UI, and GJS for its Javascript interpreter.

Building
--------
We recommend using [Flapjack] to build this code, especially if you are planning to make changes to it.
The [example.flapjack.ini] configuration file included with Flapjack is precisely made to build the `eos-knowledge-lib` and other components.

Copy the `example.flapjack.ini` to `~/.config/flapjack.ini` and follow the instructions for [Flapjack] to know how to build, test, and run apps.

If you wish to run the tests, you will also need to clone, build, and install [jasmine-gjs].

Developer introduction to offline content apps
----------------------------------------------
**UI structure + UI theme + content = app.**

The **structure** is written in terms of modular UI blocks (see below) assembled in a declarative UI file.
This declarative file is a JSON file.
However, we include a preprocessor tool called Autobahn so that you can write your app description in a more expressive, human-friendly YAML format.
See `data/preset/*.yaml` for examples.

The **theme** is a GTK CSS file.
We suggest writing themes using SCSS and then compiling them down to regular CSS.
We provide SCSS modules that your SCSS code can import; see `data/css/`.

The **content** is in the form of a shard file; see [eos-shard] for more information.
We are working on tools that allow you to build shard files easily on your own machine.
For now, you can include the --dummy-content option when running an app and it will load with sample content.

Modular UI blocks
-----------------
UI modules are GObjects, with a few extra features and a few restrictions.
They are meant to be assembled in a declarative file, without writing having to write any code such as signal handlers.

First of all, UI modules do not emit signals, because their behavior is part of their implementation, and UI descriptions are purely declarative: no code.
All properties accessible from the declarative file are treated as construct-only (except when using property bindings.)
Modules have **slots** and **references**, which are named spots where other modules can be contained or referenced.

Here are the types of UI modules and how they fit together.
See `js/framework/modules/` for the code.

- **Arrangement** - These modules generally have a `card` slot which a **Card** can go into.
  They arrange a set of dynamically created cards on the screen.
- **Banner** - These modules represent a piece of data which is presented to the user, such as an app's logo or a search term.
- **Card** - These modules represent a document in the database of offline content, but are not a full **View** of the document.
  They display its metadata (title, keywords) in various ways.
- **ContentGroup** - This is the heart of displaying offline content.
  Content groups have `selection` and `arrangement` slots.
  They make sure the **Arrangement** receives (and creates **Card**s for) the records that the **Selection** wants to display.
- **Controller** - These modules define different types of app experiences.
  They are in charge of what happens when you click somewhere.
- **Decoration** - These modules are UI elements which are used for display only.
- **Filter** - These modules can be added to a **Selection** to display only some of its records.
- **Layout** - These modules contain submodules and arrange them on one page of the app.
- **Navigation** - These modules are UI elements which are used for navigation through an app.
- **Order** - These modules can be added to a **Selection** to change the sorting order in which its records are displayed.
- **Pager** - Modules can also act as pages of an app, like pages in a website.
  Pager modules contain submodules and display them one at a time, with optional animations between them.
- **Selection** - These modules retrieve content records from the offline content database.
  A **Selection** serves records through a **ContentGroup** to an **Arrangement**, which turns the records into **Card**s.
- **View** - These modules display the actual content.
- **Window** - These modules are the toplevel windows which contain other modules.

Here's a diagram of what contains what, roughly:
```
Controller
  Window
    Pager
      Layout
        Banner
        Decoration
        Navigation
        (more) Layout
        View
        ContentGroup
          Arrangement
            Card
          Selection
```

Translations
------------
Please don't do translations by directly editing the `.po` files in this repository.
Instead, sign up at our [Transifex project][transifex] and translate there.

Release schedule
----------------
As this codebase evolves, we will release new versions of it as Flatpak runtimes.
The first public release was in com.endlessm.Platform version eos3.0, which was a unified runtime for all apps shipped with Endless OS 3.0.x.
Subsequent releases will move to a separate runtime.

Once code is released in a runtime branch, the Git repository will be branched and the API considered stable.
Runtimes will receive bug fixes, but no new API and no API changes.

When we add, change, or delete API, this will go in a new Flatpak runtime branch.
It is not expected that apps built for one API release will run on a subsequent release without some porting.

Documentation
-------------
See the [website] for more documentation.

Future notes
------------
More and better documentation on all of this is incoming.

For the next release, we may split this repository up into smaller units.

[Flapjack]: https://github.com/endlessm/flapjack
[example.flapjack.ini]: https://github.com/endlessm/flapjack/blob/master/example.flapjack.ini
[eos-shard]: https://github.com/endlessm/eos-shard
[jasmine-gjs]: https://github.com/ptomato/jasmine-gjs
[transifex]: https://www.transifex.com/endless-os/eos-knowledge-lib/
[website]: http://endlessm.github.io/eos-knowledge-lib/

eos-knowledge-lib
=================

Welcome to **eos-knowledge-lib**!
This is Endless' Javascript library for building offline content apps using modular UI blocks and declarative UI files.

This project uses the GNOME technology stack, including GTK and WebKit for UI, and GJS for its Javascript interpreter.

Building
--------
We recommend using [JHbuild] to build this code, especially if you are planning to make changes to it.
A sample JHbuild moduleset is included in the root directory of this repository.

First download the moduleset with:
```sh
wget https://raw.githubusercontent.com/endlessm/eos-knowledge-lib/master/eos-knowledge-lib.modules
```

Then edit `~/.config/jhbuildrc` to get JHbuild to use the provided moduleset.
Here's an example jhbuildrc file:
```python
# Change this path to the directory where you put the moduleset file
modulesets_dir = os.path.expanduser('~')
moduleset = ['eos-knowledge-lib']
modules = ['eos-knowledge-lib']

# Change these two paths to your liking
checkoutroot = os.path.expanduser('~/checkout')
prefix = os.path.expanduser('~/install')

# Set options to your liking
os.environ['CFLAGS'] = '-g -Og -fdiagnostics-color=auto'
use_local_modulesets = True
```

To build, then do:
```sh
jhbuild sysdeps --install
jhbuild build
```

You will also have to make sure `xapian-bridge` is running in the background:
```sh
jhbuild run xapian-bridge &
```

To run the tests:
```sh
jhbuild make check
```

If not using JHbuild you first need to clone, build, and install these other Endless repositories:

 - [eos-metrics]
 - [eos-sdk]
 - [eos-shard]
 - [xapian-glib]
 - [xapian-bridge]

If you wish to run the tests, you will also need to clone, build, and install [jasmine-gjs].
Other dependencies are PyYAML for Python 3, and an SCSS compiler.
Install these using your system's package manager.

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
For now, we include a testing tool called Moltres that will run your app with sample content.
To try it out, run it on one of the app description YAML files in `data/preset/`: e.g. `moltres data/preset/buffet.yaml`.

Finding your way around
-----------------------
Here's an overview of what's in each directory:

- `data/`
  - `css/` - themes and parts of themes for UI modules
  - `images/` - miscellaneous UI assets
  - `moltres/` - sample assets for the Moltres app runner tool
  - `preset/` - pre-built YAML UI description files
  - `templates/` - code for rendering HTML content; more or less deprecated
  - `widgets/` - GtkBuilder XML files for UI modules in `js/app/modules/`
- `docs/`
  - Various Markdown developer docs
  - `reference/js/` - API reference; not useful right now, being rewritten.
- `js/` - Javascript library code
  - `app/` - the main UI library for creating apps
    - Various app library classes
    - `interfaces/` - interfaces which some UI modules implement
    - `libs/` - external JS code such as Mustache
    - `modules/` - the modular UI blocks (see below)
    - `widgets/` - some GTK widgets for UI code that are not modular UI blocks
  - `search/` - library for accessing databases of offline content
  - `tools/` - various testing and development tools
- `lib/` - C library code
  - `eosknowledgeprivate/` - introspectable C wrappers for `js/app/`
  - `eosknowledgesearchprivate/` - introspectable C wrappers for `js/search/`
  - `web-extensions/` - WebKit web extensions for use when viewing documents
- `m4/` - Autoconf code
- `po/` - internationalization (see below)
- `tests/` - unit and integration tests
  - Various utility code for tests
  - `autobahn/` - integration tests for the Autobahn YAML processor
  - `js/` - unit tests for the `js/app` and `js/search` libraries
  - `test-content/` - sample content for some tests

Modular UI blocks
-----------------
UI modules are GObjects, with a few extra features and a few restrictions.
They are meant to be assembled in a declarative file, without writing having to write any code such as signal handlers.

First of all, UI modules do not emit signals, because their behavior is part of their implementation, and UI descriptions are purely declarative: no code.
All properties accessible from the declarative file are treated as construct-only (except when using property bindings.)
Modules have **slots** and **references**, which are named spots where other modules can be contained or referenced.

Here are the types of UI modules and how they fit together.
See `js/app/modules/` for the code.

- **Arrangement** - These modules generally have a `card` slot which a **Card** can go into.
  They arrange a set of dynamically created cards on the screen.
- **Banner** - These modules represent a piece of data which is presented to the user, such as an app's logo or a search term.
- **Card** - These modules represent a document in the database of offline content.
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

Future notes
------------
More and better documentation on all of this is incoming.

For the next release, we may split this repository up into smaller units.

[JHbuild]: https://developer.gnome.org/jhbuild/stable/
[eos-metrics]: https://github.com/endlessm/eos-metrics
[eos-sdk]: https://github.com/endlessm/eos-sdk
[eos-shard]: https://github.com/endlessm/eos-shard
[xapian-glib]: https://github.com/endlessm/xapian-glib
[xapian-bridge]: https://github.com/endlessm/xapian-bridge
[jasmine-gjs]: https://github.com/ptomato/jasmine-gjs
[transifex]: https://www.transifex.com/endless-mobile-inc/eos-knowledge-lib/
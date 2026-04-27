---
layout: post
title: "make For Data Using Makefiles"
---

# make For Data Using Makefiles

[Mr. Mather](http://smathermather.wordpress.com/) recently spotted the
[`Makefile`](https://github.com/stamen/toner-carto/blob/master/Makefile) we've
been using for the [updated version of
Toner](http://content.stamen.com/new_knight_grant_new_toner_new_infrastructure)
and asked for a walk-through.

Like many other people who wrangle data for a living, I've been in on-and-off
pursuit of a `make`-like approach to processing and transforming data.
Specifically, one that allows me to idempotently bootstrap and process data
without starting from zero each time. Also, one that makes it easy enough to
script experiments pro-actively rather than putting replicability off.

## Common Idioms

We use a number of `sh` / `bash` idioms that are helpful to recognize as such.

### Use of Exit Codes

When a process exits, it does so with a numeric code that indicates success or
failure (in the latter case, often with a value that can be used to determine
why). `0` is considered success; anything else is a failure of some sort.
These codes aren't directly visible, but `make` uses them to determine whether
a target was successful (and whether execution should continue). `$?` can be
used to surface the code in a shell context:

```bash
$ echo hi; echo $?
hi
0
```

There are a few cases where we want to shield `make` from failures (to prevent
execution from stopping). For example:

```bash
carto -l $< > $@ || (rm -f $@; false)
```

This runs `carto`; if it fails, it deletes the output (`$@`).  However, if
there was no output, `rm` will return successfully, but the task actually
failed. To work-around that, we execute `rm` in a subshell (using parentheses)
and explicitly return false (`false`) so that `make` ceases execution.

### `||` and `&&`

`||` and `&&` are used in conjunction with exit codes to conditionally execute
subsequent parts of a composite command. `||` is used when you want to execute
a command only if the first returns an error (non-zero exit code); `&&` when
you want to execute a command only if the first was successful.

### `> /dev/null 2>&1`

POSIX processes are provided 3 file descriptions (handles to files or file-like
things) by default.  `stdin` (content from a file or other source like
a keyboard) is file descriptor `0`, `stdout` is `1`, and `stderr` is `2`. Thus,
`echo hi > /dev/null 2>&1` says to redirect `stdout` (the default output) to
`/dev/null` (into the abyss) and then `stderr` (`2`) to the same place as
`stdout` (as a reference: `&1`). In this context, we use this to squelch
output, since we generally just care about the exit code (either directly, or
after `grep`ing through it or counting lines (`wc -l`)).

### `psql` Checks

At various points, we want to short-circuit tasks if a resource already exists.
In a traditional `Makefile`, these resources would be files and that
short-circuiting is built-in. However, since we're since working with database
tables (etc.) and there are no file equivalents, we need to implement
equivalent functionality.

We use `psql -c` for practically all existence checks, as it allows us to
construct a SQL command and use it to query PostgreSQL. Unfortunately,
different checks result in varying output and exit codes.

#### Looking for Relations

`\d <relation>` will check for the existence of a "relation" (which could be
a table, view, etc.). It displays the name, type, and owner of the relation and
exits with `0` only if it matched something.

#### Looking for Extensions

`\dx <extension>` will check for extensions matching the provided name. If
present, it will display various information about it. Unfortunately, it exits
with `0` regardless of whether anything has been found or not, so we need to
`grep` the output for the presence of the name.

#### Looking for Functions

`\df <name>` will check for functions matching the provided name. When
a function has multiple signatures, it will be displayed multiple times. Like
`\dx`, it exits with `0` no matter what, so we need to `grep`
(case-insensitively) for the function we're looking for.

### Implicit `make` Variables

`make` includes many [implicit
variables](https://www.gnu.org/software/make/manual/html_node/Implicit-Variables.html),
most of which are intended for use in an environment where source files are
being compiled and linked into binaries. However, there are still a few we make
use of:

* `$@` - the name of the target (the thing before the `:`).
* `$<` - the name of the first prerequisite. Convenient.
* `$^` - all prerequisites, space-delimited. Can be combined with
  `$(word <n>,$^`) to select the _n_th one.

### `make` Functions

Since many of the targets we're working with are synthetic, we need to extract
relevant components of their names. Database-related functionality is grouped
under the `db/` "path", so we primarily use
[`subst`](https://www.gnu.org/software/make/manual/html_node/Text-Functions.html)
to remove irrelevant components. We also use `word` to refer to components
within space-delimited values.

### `make` Patterns

There are many resources that follow patterns when we work with data. Natural
Earth's filenames and source URLs are a good example of this. In keeping with
the DRY principle ("don't repeat yourself"), we fold these into a smaller
number of targets using `make` patterns. These are strings that include `%`
anywhere text may vary.

The convenient bit is that prerequisites can also use the `%` syntax and the
value of the pattern in the target name will be substituted. Thus, `%: %.mml`
will convert `toner` to `toner: toner.mml` and gives us the behavior we're
looking for.

## Annotated `Makefile`

Without further ado, here's an annotated snapshot of the `Makefile`-driven
approach we've been using. Suggestions are most welcome, especially if they
simplify or clarify.

```Makefile
SHELL := /bin/bash
```

> Use `bash` for sub-shells, allowing use of `bash`-specific functionality.

```Makefile
PATH := $(PATH):node_modules/.bin
```

> Add `npm`-installed binaries to the `PATH`.

```Makefile
define EXPAND_EXPORTS
export $(word 1, $(subst =, , $(1))) := $(word 2, $(subst =, , $(1)))
endef
```

> Define a macro that expands (splits on `=`) and exports (makes available to
> sub-shells) key-value arguments, e.g. `DATABASE\_URL=postgres:///db`.

```Makefile
# wrap Makefile body with a check for pgexplode
ifeq ($(shell test -f node_modules/.bin/pgexplode; echo $$?), 0)
```

> Check whether `pgexplode` has been installed (it's effectively a prerequisite
> for the entire `Makefile`); `test` doesn't output anything, so the return
> code (`$?`) needs to be `echo`'d for comparison with `0` (and escaped with an
> extra `$` to be passed through to the `shell` call).

```Makefile
# load .env
$(foreach a,$(shell cat .env 2> /dev/null),$(eval $(call EXPAND_EXPORTS,$(a))))
```

> Read `.env` (squelching error messages if one doesn't exist) and pass each
> environment pair to `EXPAND\_EXPORTS` to make it available to commands in
> targets.

```Makefile
# expand PG* environment vars
$(foreach a,$(shell set -a && source .env 2> /dev/null; node_modules/.bin/pgexplode),$(eval $(call EXPAND_EXPORTS,$(a))))
```

> Use `pgexplode` to expand `DATABASE\_URL` into [`libpq`-compatible
> environment
> variables](http://www.postgresql.org/docs/9.4/static/libpq-envars.html). This
> will read from the environment (`$DATABASE\_URL`) if one isn't present in
> `.env` (or `.env` doesn't exist).

```Makefile
define create_relation
@psql -c "\d $(subst db/,,$@)" > /dev/null 2>&1 || \
        psql -v ON_ERROR_STOP=1 -qX1f sql/$(subst db/,,$@).sql
endef

define create_extension
@psql -c "\dx $(subst db/,,$@)" | grep $(subst db/,,$@) > /dev/null 2>&1 || \
        psql -v ON_ERROR_STOP=1 -qX1c "CREATE EXTENSION $(subst db/,,$@)"
endef
```

> Macro definitions that will strip `db/` from targets' `$@` (target name) and
> use it as the name of a SQL file or PostgreSQL extension (`$(subst
> db/,,$@)`).  The first command (`psql -c "\d $(subst db/,,$@)" > /dev/null
> 2>&1`) checks for the presence of a relation in the database specified by
> `DATABASE\_URL` and only evaluates SQL commands if it fails. `\d <name>`
> checks for the presence of a relation of any kind, `\dx` for loaded
> extensions, etc.
>
> `ON\_ERROR\_STOP=1` is used to abort as soon as an error occurs, `-q` is
> "quiet", `-X` ignores any `psqlrc` files, `-1` runs the command in a single
> transaction, `-f` provides a file containing commands, and `-c` tells it to
> use the provided command.
>
> Commands are prefixed with `@` to prevent `make` from printing them (since
> they're unnecessarily complicated due to the need to check for the existence
> of non-file resources).

```Makefile
define register_function_target
.PHONY: db/functions/$(strip $(1))

db/functions/$(strip $(1)): db
        @psql -c "\df $(1)" | grep -i $(1) > /dev/null 2>&1 || \
                psql -v ON_ERROR_STOP=1 -qX1f sql/functions/$(1).sql
endef

$(foreach fn,$(shell ls sql/functions/ 2> /dev/null | sed 's/\..*//'),$(eval $(call register_function_target,$(fn))))
```

> Generate targets for each file in `sql/functions`, callable as
> `db/function/<name>` and depending on the `db` target (keep reading).

```Makefile
# Import PBF ($2) as $1
define import
.PHONY: db/osm-$(strip $(word 1, $(subst :, ,$(1)))) db/$(strip $(word 1, $(subst :, ,$(1))))

db/$(strip $(word 1, $(subst :, ,$(1)))): db/osm-$(strip $(word 1, $(subst :, ,$(1)))) db/shared

db/osm-$(strip $(word 1, $(subst :, ,$(1)))): db/postgis db/hstore $(strip $(word 2, $(subst :, ,$(1))))
        @psql -c "\d osm_roads" > /dev/null 2>&1 || \
        imposm3 import \
                --cachedir cache \
                -mapping=imposm3_mapping.json \
                -read $(strip $(word 2, $(subst :, ,$(1)))) \
                -connection="$${DATABASE_URL}" \
                -write \
                -deployproduction \
                -overwritecache
endef
```

> Macro definition for importing OSM extracts. When called, it generates
> targets like `db/<place>` (which depends on both the import and `db/shared`
> (see below)) and `db/osm-<place>`, which does the actual import. `osm\_roads`
> is assumed to be created by `imposm3` in this case. `$${DATABASE\_URL}` is
> escaped because this is a macro (so it's evaluated at runtime) and uses
> braces to use the environment variable.
>
> Now begins what looks like a more conventional `Makefile`.

```Makefile
# default target
default: toner

# symlink into TileMill's project folder (if TM is installed)
link:
        @test -e ${HOME}/Documents/MapBox/project && \
                test -e ${HOME}/Documents/MapBox/project/toner || \
                ln -sf "`pwd`" ${HOME}/Documents/MapBox/project/toner

# clean up derivative files
clean:
        @rm -f *.mml *.xml

# create a default .env file with a sensible(?) default
.env:
        @echo DATABASE_URL=postgres:///toner > $@
```

```Makefile
%: %.mml
        @cp $< project.mml
```

> A pattern, which obviates the need to declare multiple redundant targets. If
> `make toner` is run, it will depend on `toner.mml` (see below) and will
> silently copy the output (`$<` is the expanded name of the first dependency)
> to `project.mml` for TileMill to read.

```Makefile
mml: $(subst .yml,.mml,$(filter-out circle.yml,$(wildcard *.yml)))

xml: $(subst .yml,.xml,$(filter-out circle.yml,$(wildcard *.yml)))
```

> Defines targets that will make MML and XML files corresponding to all `.yml`
> files **except** `circle.yml` (which is a control file for
> [CircleCI](https://circleci.com), not a style).

```Makefile
.PRECIOUS: %.mml

%.mml: %.yml map.mss labels.mss %.mss interp js-yaml
        @echo Building $@
        @cat $< | interp | js-yaml > tmp.mml && mv tmp.mml $@
```

> Builds `*.mml` by interpolating environment variables into
> a [Mustache](http://mustache.github.io/)-templated YAML file
> ([`interp`](https://github.com/stamen/interp)) and converting to JSON
> ([`js-yaml`](https://github.com/nodeca/js-yaml)). `tmp.mml` is used so that
> `mv` can atomically move the file into place (without doing this, TileMill
> periodically chokes when reading partially-written files).
>
> This depends on `<style>.yml`, `map.mss`, `labels.mss`, and `<style.mss>` so
> that it will be considered stale when any of those are modified. `interp` and
> `js-yaml` are explicitly called out as dependencies so that they can be
> installed if necessary (see below).
>
> This is marked as `.PRECIOUS` so that artifacts won't be deleted when called
> as an intermediate target (i.e. from an XML target).

```Makefile
.PRECIOUS: %.xml

%.xml: %.mml carto
        @echo
        @echo Building $@
        @echo
        @carto -l $< > $@ || (rm -f $@; false)
```

> Builds `*.xml` from `<style>.mml` (declared above). `|| (rm -f $@; false)` is
> included because `carto` may leave behind invalid XML files when it fails
> (and because we want to pass the failure through and terminate the current
> `make` invocation.

```Makefile
.PHONY: carto

carto: node_modules/carto/package.json

.PHONY: interp

interp: node_modules/interp/package.json

.PHONY: js-yaml

js-yaml: node_modules/js-yaml/package.json

node_modules/carto/package.json: PKG = $(word 2,$(subst /, ,$@))
node_modules/carto/package.json: node_modules/millstone/package.json
        @type node > /dev/null 2>&1 || (echo "Please install Node.js" && false)
        @echo "Installing $(PKG)"
        @npm install $(PKG)

node_modules/interp/package.json: PKG = $(word 2,$(subst /, ,$@))
node_modules/interp/package.json:
        @type node > /dev/null 2>&1 || (echo "Please install Node.js" && false)
        @echo "Installing $(PKG)"
        @npm install $(PKG)

node_modules/js-yaml/package.json: PKG = $(word 2,$(subst /, ,$@))
node_modules/js-yaml/package.json:
        @type node > /dev/null 2>&1 || (echo "Please install Node.js" && false)
        @echo "Installing $(PKG)"
        @npm install $(PKG)

node_modules/millstone/package.json: PKG = $(word 2,$(subst /, ,$@))
node_modules/millstone/package.json:
        @type node > /dev/null 2>&1 || (echo "Please install Node.js" && false)
        @echo "Installing $(PKG)"
        @npm install $(PKG)
```

> Artificial (`.PHONY`) targets for required commands along with file-based
> dependencies and checks for Node. `PKG` is defined as a `make` variable in
> preparation for future refactoring that turns this boilerplate into a macro.
>
> `package.json` declares dependencies on these commands, but it also includes
> everything else to run a rendering node, so this is a lower-impact way of
> ensuring that they're installed.

```Makefile
.PHONY: DATABASE_URL

DATABASE_URL:
        @test "${$@}" || (echo "$@ is undefined" && false)
```

> A target definition that can be used when one wants to ensure that
> a `DATABASE\_URL` was provided.

```Makefile
.PHONY: db

db: DATABASE_URL
        @psql -c "SELECT 1" > /dev/null 2>&1 || \
        createdb
```

> Target to ensure that a database exists. If `psql` returns fall, `createdb`
> will be run (using `libpq` environment variables extracted from
> `DATABASE\_URL`) to create one.

```Makefile
.PHONY: db/postgis

db/postgis: db
        $(call create_extension)

.PHONY: db/hstore

db/hstore: db
        $(call create_extension)
```

> Targets that create extensions (and require that a database exists) using the
> macros defined above.

```Makefile
.PHONY: db/shared

db/shared: db/postgres db/shapefiles

.PHONY: db/postgres

db/postgres: db/functions/highroad
```

> Meta-targets that depend on both explicit (`db/shapefiles`) and implicit
> (`db/functions/highroad`) targets.

```Makefile
.PHONY: db/shapefiles

db/shapefiles: shp/osmdata/land-polygons-complete-3857.zip \
               shp/natural_earth/ne_50m_land-merc.zip \
               shp/natural_earth/ne_50m_admin_0_countries_lakes-merc.zip \
               shp/natural_earth/ne_10m_admin_0_countries_lakes-merc.zip \
               shp/natural_earth/ne_10m_admin_0_boundary_lines_map_units-merc.zip \
               shp/natural_earth/ne_50m_admin_1_states_provinces_lines-merc.zip \
               shp/natural_earth/ne_10m_geography_marine_polys-merc.zip \
               shp/natural_earth/ne_50m_geography_marine_polys-merc.zip \
               shp/natural_earth/ne_110m_geography_marine_polys-merc.zip \
               shp/natural_earth/ne_10m_airports-merc.zip \
               shp/natural_earth/ne_10m_roads-merc.zip \
               shp/natural_earth/ne_10m_lakes-merc.zip \
               shp/natural_earth/ne_50m_lakes-merc.zip \
               shp/natural_earth/ne_10m_admin_0_boundary_lines_land-merc.zip \
               shp/natural_earth/ne_50m_admin_0_boundary_lines_land-merc.zip \
               shp/natural_earth/ne_10m_admin_1_states_provinces_lines-merc.zip
```

> Meta-target for processed Shapefiles.

```Makefile
# TODO places target that lists registered places
PLACES=BC:data/extract/north-america/ca/british-columbia-latest.osm.pbf \
       CA:data/extract/north-america/us/california-latest.osm.pbf \
       belize:data/extract/central-america/belize-latest.osm.pbf \
       cle:data/metro/cleveland_ohio.osm.pbf \
       MA:data/extract/north-america/us/massachusetts-latest.osm.pbf \
       NY:data/extract/north-america/us/new-york-latest.osm.pbf \
       OH:data/extract/north-america/us/ohio-latest.osm.pbf \
       sf:data/metro/san-francisco.osm.pbf \
       sfbay:data/metro/sf-bay-area.osm.pbf \
       seattle:data/metro/seattle_washington.osm.pbf \
       WA:data/extract/north-america/us/washington-latest.osm.pbf

$(foreach place,$(PLACES),$(eval $(call import,$(place))))
```

> Define a list of places along with the local reference to their corresponding
> extract (`data/extract/%` and `data/metro/%` are patterns defined below) and
> generate import targets (e.g. `db/BC` for British Columbia).

```Makefile
.SECONDARY: data/extract/%

data/extract/%:
        @mkdir -p $$(dirname $@)
        curl -Lf http://download.geofabrik.de/$(@:data/extract/%=%) -o $@

.SECONDARY: data/metro/%

data/metro/%:
        @mkdir -p $$(dirname $@)
        curl -Lf https://s3.amazonaws.com/metro-extracts.mapzen.com/$(@:data/metro/%=%) -o $@
```

OSM extract patterns; i.e. anything under `data/extract/` will be downloaded
from [Geofabrik](http://www.geofabrik.de/), anything under `data/metro/` from
[Mapzen](https://mapzen.com/)'s [Metro
Extracts](https://mapzen.com/metro-extracts/)).

> These are marked as `.SECONDARY` to prevent them from being deleted (as
> they're "expensive" to create).  **Note**: this isn't quite right; my
> intention is to keep them around but also to delete them if the target
> failed.
>
> `mkdir -p` is used to ensure that the target directory exists. `$$(dirname
> $@)` is used to pass the literal `$(dirname data/metro/<whatever>)` to
> `mkdir`.
>
> `$(@:data/metro/%=%)` substitutes `<whatever>` for `data/metro/<whatever>` in
> the target name.
>
> `curl`'s `-f` option is provided so that it will return with a non-zero exit
> code on failure and cause the target to fail.

```Makefile
.SECONDARY: data/osmdata/land_polygons.zip

# so the zip matches the shapefile name
data/osmdata/land_polygons.zip:
        @mkdir -p $$(dirname $@)
        curl -Lf http://data.openstreetmapdata.com/land-polygons-complete-3857.zip -o $@

shp/osmdata/%.shp \
shp/osmdata/%.dbf \
shp/osmdata/%.prj \
shp/osmdata/%.shx: data/osmdata/%.zip
        @mkdir -p $$(dirname $@)
        unzip -ju $< -d $$(dirname $@)

shp/osmdata/land_polygons.index: shp/osmdata/land_polygons.shp
        shapeindex $<

.SECONDARY: data/osmdata/land-polygons-complete-3857.zip

shp/osmdata/land-polygons-complete-3857.zip: shp/osmdata/land_polygons.shp \
        shp/osmdata/land_polygons.dbf \
        shp/osmdata/land_polygons.prj \
        shp/osmdata/land_polygons.shx \
        shp/osmdata/land_polygons.index
        zip -j $@ $^
```

> Similar to the OSM extracts, but for a specific file with a non-matching
> source name. Some of this remains as a relic of when we were using different
> versions of the land polygons.

```Makefile
define natural_earth
db/$(strip $(word 1, $(subst :, ,$(1)))): $(strip $(word 2, $(subst :, ,$(1)))) db/postgis
        psql -c "\d $$(subst db/,,$$@)" > /dev/null 2>&1 || \
        ogr2ogr --config OGR_ENABLE_PARTIAL_REPROJECTION TRUE \
                        --config SHAPE_ENCODING WINDOWS-1252 \
                        --config PG_USE_COPY YES \
                        -nln $$(subst db/,,$$@) \
                        -t_srs EPSG:3857 \
                        -lco ENCODING=UTF-8 \
                        -nlt PROMOTE_TO_MULTI \
                        -lco POSTGIS_VERSION=2.0 \
                        -lco GEOMETRY_NAME=geom \
                        -lco SRID=3857 \
                        -lco PRECISION=NO \
                        -clipsrc -180 -85.05112878 180 85.05112878 \
                        -segmentize 1 \
                        -skipfailures \
                        -f PGDump /vsistdout/ \
                        /vsizip/$$</$(strip $(word 3, $(subst :, ,$(1)))) | psql -q

shp/natural_earth/$(strip $(word 1, $(subst :, ,$(1))))-merc.shp \
        shp/natural_earth/$(strip $(word 1, $(subst :, ,$(1))))-merc.dbf \
        shp/natural_earth/$(strip $(word 1, $(subst :, ,$(1))))-merc.prj \
        shp/natural_earth/$(strip $(word 1, $(subst :, ,$(1))))-merc.shx: $(strip $(word 2, $(subst :, ,$(1))))
        @mkdir -p $$$$(dirname $$@)
        ogr2ogr --config OGR_ENABLE_PARTIAL_REPROJECTION TRUE \
                        --config SHAPE_ENCODING WINDOWS-1252 \
                        -t_srs EPSG:3857 \
                        -lco ENCODING=UTF-8 \
                        -clipsrc -180 -85.05112878 180 85.05112878 \
                        -segmentize 1 \
                        -skipfailures $$@ /vsizip/$$</$(strip $(word 3, $(subst :, ,$(1))))

shp/natural_earth/$(strip $(word 1, $(subst :, ,$(1))))-merc.index: shp/natural_earth/$(strip $(word 1, $(subst :, ,$(1))))-merc.shp
        shapeindex $$<

.SECONDARY: shp/natural_earth/$(strip $(word 1, $(subst :, ,$(1))))-merc.zip

shp/natural_earth/$(strip $(word 1, $(subst :, ,$(1))))-merc.zip: shp/natural_earth/$(strip $(word 1, $(subst :, ,$(1))))-merc.shp \
        shp/natural_earth/$(strip $(word 1, $(subst :, ,$(1))))-merc.dbf \
        shp/natural_earth/$(strip $(word 1, $(subst :, ,$(1))))-merc.prj \
        shp/natural_earth/$(strip $(word 1, $(subst :, ,$(1))))-merc.shx \
        shp/natural_earth/$(strip $(word 1, $(subst :, ,$(1))))-merc.index
        zip -j $$@ $$^
endef
```

> Macro definition that creates `db/ne\_<whatever>` and `shp/natural\_earth/*`
> targets for [Natural Earth](http://www.naturalearthdata.com/) sources. It
> assumes that it's called with arguments in the form `<name>:<source
> file>:[shapefile]`. (If someone can help simplify the repeated `$(strip
> $(word 1, $(subst :, ,$(1))))` declarations (used to extract the first
> component), I'd appreciate it!)
>
> The `db/<whatever>` target runs `ogr2ogr` with a set of options that we've
> found to work well with the Natural Earth Shapefiles over the years.
>
> `shp/natural\_earth/*-merc.{shp,dbf,prj,shx}` states that there will be
> 4 artifacts for each invocation of `ogr2ogr` (used to reproject here). Again,
> we use options gathered over the years along with `/vsizip` to avoid needing
> to unzip. If a single "file" (base name, really) exists in the zip, just the
> name of the zip file is necessary, otherwise a path to the Shapefile within
> the zip is necessary (the list of layers below takes advantage of that by
> allowing `[shapefile]` to be optional. (This is necessary due to errors in
> the packaging of some of the Natural Earth layers.)
>
> Aggressive escaping is necessary in order for literal `$`s to be passed
> through, e.g. `$$$$(dirname $$@)`.
>
> The `shp/natural\_earth/*-merc.zip` target uses `$^` for the list of files to
> compress, which contains the expanded names of all of the dependencies.
> `zip`'s `-j` option is used to "junk paths" and put everything in the root of
> the zip file.

```Makefile
# <name>:<source file>:[shapefile]
NATURAL_EARTH=ne_50m_land:data/ne/50m/physical/ne_50m_land.zip \
        ne_50m_admin_0_countries_lakes:data/ne/50m/cultural/ne_50m_admin_0_countries_lakes.zip \
        ne_10m_admin_0_countries_lakes:data/ne/10m/cultural/ne_10m_admin_0_countries_lakes.zip \
        ne_10m_admin_0_boundary_lines_map_units:data/ne/10m/cultural/ne_10m_admin_0_boundary_lines_map_units.zip \
        ne_50m_admin_1_states_provinces_lines:data/ne/50m/cultural/ne_50m_admin_1_states_provinces_lines.zip \
        ne_10m_geography_marine_polys:data/ne-stamen/10m/physical/ne_10m_geography_marine_polys.zip \
        ne_50m_geography_marine_polys:data/ne-stamen/50m/physical/ne_50m_geography_marine_polys.zip \
        ne_110m_geography_marine_polys:data/ne-stamen/110m/physical/ne_110m_geography_marine_polys.zip \
        ne_10m_airports:data/ne-stamen/10m/cultural/ne_10m_airports.zip \
        ne_10m_roads:data/ne/10m/cultural/ne_10m_roads.zip \
        ne_10m_lakes:data/ne/10m/physical/ne_10m_lakes.zip \
        ne_50m_lakes:data/ne/50m/physical/ne_50m_lakes.zip \
        ne_10m_admin_0_boundary_lines_land:data/ne/10m/cultural/ne_10m_admin_0_boundary_lines_land.zip \
        ne_50m_admin_0_boundary_lines_land:data/ne/50m/cultural/ne_50m_admin_0_boundary_lines_land.zip \
        ne_10m_admin_1_states_provinces_lines:data/ne/10m/cultural/ne_10m_admin_1_states_provinces_lines.zip:ne_10m_admin_1_states_provinces_lines.shp

$(foreach shape,$(NATURAL_EARTH),$(eval $(call natural_earth,$(shape))))
```

> Define a list of Natural Earth layers along with their local file references
> and (optional) Shapefile names and call `natural_earth` to generate targets.
> As with the OSM extracts, patterns are used to match the conventions used by
> the Natural Earth site.

```Makefile
define natural_earth_sources
.SECONDARY: data/ne/$(1)/$(2)/%.zip

data/ne/$(1)/$(2)/%.zip:
        @mkdir -p $$(dir $$@)
        curl -fL http://www.naturalearthdata.com/http//www.naturalearthdata.com/download/$(1)/$(2)/$$(@:data/ne/$(1)/$(2)/%=%) -o $$@

.SECONDARY: data/ne/$(1)/$(2)/%.zip

data/ne-stamen/$(1)/$(2)/%.zip:
        @mkdir -p $$(dir $$@)
        curl -fL "https://github.com/stamen/natural-earth-vector/blob/master/zips/$(1)_$(2)/$$(@:data/ne-stamen/$(1)/$(2)/%=%)?raw=true" -o $$@
endef
```

> Macro definition for meta Natural Earth patterns.

```Makefile
scales=10m 50m 110m
themes=cultural physical raster

$(foreach a,$(scales),$(foreach b,$(themes),$(eval $(call natural_earth_sources,$(a),$(b)))))
```

> Generate targets for nested combinations of scales and themes.

```Makefile
# complete wrapping
else
.DEFAULT:
        $(error Please install pgexplode: "npm install pgexplode")
endif
```

> Provide a default target (truly default in that it will execute for any
> requested target) explaining what needs to be done for things to work
> correctly.

Questions? Suggestions?

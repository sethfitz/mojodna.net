---
layout: post
title: "The OS X Spatial Stack"
---

# The OS X Spatial Stack

I've been doing a bunch of spatial analysis and exploration recently. Where I
previously would have used a Debian or Ubuntu server (or VM) to experiment, I'm
now using Snow Leopard exclusively.

However, it's not all roses. As with most things, there are many paths to
installing and configuring software, not all of them complementary. What
follows is **my** experience installing and configuring various tools and their
dependencies. I've attempted to install as few duplicate dependencies as
possible (preferring Apple-provided versions) and to simplify the overall
experience in order that individual elements may be upgraded independently.

<!--
## Virtualizing Snow Leopard

Writing instructions for system configuration is difficult when you're not
starting from a fresh slate, as you may inadvertently omit something that was
installed in another way. Virtualization is often a good solution for this, but
virtualizing OS X isn't as easy (or as legal) as it could be.

I did some searching around and found a few tricks for getting Leopard running
under VMware Fusion. These instructions were condensed from
http://blog.rectalogic.com/2008/08/virtualizing-mac-os-x-leopard-client.html
and were sufficient to get a running Snow Leopard VM under Fusion 2.0.5.

{% highlight bash %}
# cd /Library/Application\ Support/VMware\ Fusion/isoimages/
# mkdir original
# mv darwin.iso tools-key.pub *.sig  original/
# sed "s/ServerVersion.plist/System.plist/g " < original/darwin.iso > darwin.iso
# openssl genrsa -out tools-priv.pem  2048
  Generating RSA private key, 2048 bit long modulus
  .........................+++
  .................................................................+++
  e is 65537 (0x10001)

# openssl rsa -in tools-priv.pem -pubout -pubout -out tools-key.pub
writing RSA key

# for A in *.iso ; do openssl dgst -sha1 -sign tools-priv.pem < $A > $A.sig ; done
{% endhighlight %}

Unfortunately, upgrading to 10.6.2 consistently causes the VM to crash during
boot. I was hopeful that Fusion 3 would address this problem (since it claims
to have better support for Snow Leopard (Server) guests), but the 10.6.0 VM
won't boot at all (nor will it install using the voodoo above).
-->

## Xcode

First, [download and install Xcode
3.2.1](https://connect.apple.com/cgi-bin/WebObjects/MemberSite.woa/wa/getSoftware?bundleID=20505).
The defaults are fine.

## Homebrew

Next, install [homebrew](http://github.com/mxcl/homebrew). I've found that
homebrew is significantly lighter and easier than
[MacPorts](http://macports.org/) for installing additional open source
software, as it re-uses system versions of libraries wherever possible.

Part of the homebrew philosophy is:

> OS X is designed to minimise sudo use, you only need it for real root-level
> stuff. You know your /System and /usr are as clean and pure as the day you
> bought your Mac because you didn't sudo. Sleep better at night! ... Lets face
> it; Homebrew is not installing anything system-critical. Apple already did
> that.

Homebrew is typically installed in `/usr/local`, so:

{% highlight bash %}
$ sudo mkdir -p /usr/local
$ sudo chown -R `whoami` /usr/local
{% endhighlight %}

(If you already had MySQL installed in `/usr/local`, fix it: `sudo chown -R
mysql:mysql /usr/local/mysql`.)

Now, install homebrew:

{% highlight bash %}
$ cd /usr/local
$ curl -L http://github.com/mxcl/homebrew/tarball/master | tar xz --strip 1 -C .
{% endhighlight %}

## Homebrew-provided Libraries

While we're working with homebrew, let's install a dependencies that we'll
need later.

[`pkg-config`](http://pkg-config.freedesktop.org/) is necessary to cleanly
compile PIL:

{% highlight bash %}
$ brew install pkg-config
{% endhighlight %}

You'll want to make sure that `/usr/local/bin` is in your `$PATH` so that
`homebrew`-installed binaries will get run.

## KyngChaos Frameworks and Binaries

The [KyngChaos Wiki](http://www.kyngchaos.com/) is the holy grail for OS X
spatial downloads, as everything is cleanly packaged, up-to-date, and very well
organized.

From the [Unix Compatibility
Frameworks](http://www.kyngchaos.com/software:frameworks) page, you'll want to
download and install:

* **FreeType** 
* **GSL** - The GNU Scientific Library
* **GDAL Complete** (this includes UnixImageIO (notably `jpeg` and `libpng`), PROJ,
  GEOS, SQLite3 (including Spatialite), and GDAL)

These will install to `/Library/Frameworks` and will set up pointers to their
corresponding Python packages in `/Library/Python/2.6/site-packages/`.

From the [Qgis](http://www.kyngchaos.com/software:qgis) page, you'll want the
most up-to-date Qgis installer (non-standalone). If you intend to open
Spatialite data sources, you may need to install a more up-to-date version of
the SQLite3 Framework than is included in the GDAL Complete package (this is
generally applicable; if you want/need to live on the bleeding edge, install
frameworks individually).

From the [PostgreSQL](http://www.kyngchaos.com/software:postgres) page,
download and install the newest versions of the following:

* **PostgreSQL** (server + client)
* **PostGIS**

## Mapnik

Thanks to [Dane Springmeyer](http://dbsgeo.com/) and others, Mapnik is now
[available as a framework](http://mapnik.org/news/2009/dec/16/osx_installers/).
This means fewer `homebrew` dependencies, a simple upgrade path, and
compatibility with 32-bit QGIS Python plugins. To install it, grab a Snow
Leopard build from the [Mapnik OSX Downloads page](http://dbsgeo.com/downloads/)
and run both the _Mapnik Framework_ and _Mapnik Python 2.6 System_ installers.

If you'd previously installed Mapnik from source, you should remove it from
your system before running the installer:

{% highlight bash %}
$ rm -rf /Library/Python/2.6/site-packages/mapnik
$ rm -rf /usr/local/lib/mapnik
$ rm /usr/local/lib/libmapnik.dylib
{% endhighlight %}


You can also remove `boost` and `icu` with `homebrew` if nothing else is using
them:

{% highlight bash %}
$ brew uninstall boost
$ brew uninstall icu
{% endhighlight %}

## Quantumnik

[Quantumnik](http://bitbucket.org/springmeyer/quantumnik/wiki/Home) is a QGIS
plugin that allows Mapnik to be used for rendering. In addition, it will map
many QGIS styles to Mapnik styles and provides an interface for editing them. In
short, it's an excellent way to prototype your maps before starting up a batch
rendering job.

To install Quantumnik, start up QGIS, enable the **Plugin Installer** in the
Plugin Manager, choose **Fetch Python Plugins**, add a new repository
(http://qgis.dbsgeo.com/), find it in the list, and check the box to enable it.

## Python

We'll start with the easy stuff and `easy_install` the following:

* Flickr.API - Flickr has good geo data (I'm biased)
* [IPython](http://ipython.scipy.org/) - Interactive Python
* [nik2img](http://code.google.com/p/mapnik-utils/wiki/Nik2Img) - Mapnik
  command-line utility.
* [Nikweb](http://code.google.com/p/mapnik-utils/wiki/Nikweb) - Mapnik-based
  "static maps API" (though it requires GeoJSON input to determine appropriate
  bounding boxes and additional features)
* [nose](http://code.google.com/p/python-nose/) - Unit testing framework
* numscons - scons for numpy/scipy--required for scipy installation
* readline - causes IPython to use readline instead of libedit, solving all
  sorts of problems
* [TileCache](http://tilecache.org/) - WMS-C compliant tile server

{% highlight bash %}
$ easy_install Flickr.API
$ easy_install ipython
$ easy_install nik2img
$ easy_install Nikweb
$ easy_install nose
$ easy_install numscons
$ easy_install readline
$ easy_install TileCache
{% endhighlight %}

### PIL

[PIL](http://www.pythonware.com/products/pil/) is the Python Imaging Library.
Download the current source kit and extract it to `/usr/local/src`:

{% highlight bash %}
$ cd /usr/local/src
$ tar zxf ~/Downloads/Imaging-1.1.6.tar.gz
$ cd Imaging-1.1.6/
{% endhighlight %}

Since you previously installed `pkg-config`, building it is straightforward:

{% highlight bash %}
$ python setup.py install
{% endhighlight %}

### matplotlib

[matplotlib](http://matplotlib.sourceforge.net/) is a plotting library for
Python. It can be used both programmatically and interactively.

Download the source distribution from SourceForge and extract it to
`/usr/local/src`:

{% highlight bash %}
$ cd /usr/local/src
$ tar zxf ~/Downloads/matplotlib-0.99.1.2.tar.gz
$ cd matplotlib-0.99.1.1/ # why yes, this is a mistake in the pkg
{% endhighlight %}

Again, this is straightforward:

{% highlight bash %}
$ python setup.py install
{% endhighlight %}

matplotlib includes the [Basemap
Toolkit](http://matplotlib.sourceforge.net/basemap/doc/html/), which makes it
easier to work with cartographic data.

Download the source distribution from
[SourceForge](http://sourceforge.net/projects/matplotlib/files/matplotlib-toolkits/)
and extract it to `/usr/local/src`. While you're at it, download `natgrid` from
the same place.

{% highlight bash %}
$ cd /usr/local/src
$ tar zxf ~/Downloads/basemap-0.99.4.tar.gz
$ tar zxf ~/Downloads/natgrid-0.1.tar.gz
{% endhighlight %}

Basemap needs to know where GEOS was installed:

{% highlight bash %}
$ cd basemap-0.99.4/
$ GEOS_DIR=/Library/Frameworks/GEOS.framework/unix python setup.py install
{% endhighlight %}

`natgrid` is straightforward:

{% highlight bash %}
$ cd natgrid-0.1/
$ python setup.py install
{% endhighlight %}

### numpy / scipy

[numpy and scipy](http://www.scipy.org/) are the Pythonic chainsaws for
scientific computing. numpy will mostly install out-of-the-box, but we'll
install it from source.

Before we can build them, we need to install a Fortran compiler from [AT&T
Research](http://r.research.att.com/tools/):
http://r.research.att.com/gfortran-4.2.3.dmg

Download source distributions of numpy and scipy from
SourceForge([numpy](http://sourceforge.net/projects/numpy/files/),
[scipy](http://sourceforge.net/projects/scipy/files/)) and extract them to
`/usr/local/src`:

{% highlight bash %}
$ cd /usr/local/src
$ tar zxf ~/Downloads/numpy-1.3.0.tar.gz
$ tar zxf ~/Downloads/scipy-0.7.1.tar.gz
{% endhighlight %}

Build and install numpy:

{% highlight bash %}
$ cd numpy-1.3.0/
$ LDFLAGS="-lgfortran -arch x86_64" FFLAGS="-arch x86_64" \
    python setup.py install
{% endhighlight %}

Build and install scipy:

{% highlight bash %}
$ cd scipy-0.7.1/
$ LDFLAGS="-lgfortran -arch x86_64" FFLAGS="-arch x86_64" \
    python setup.py install
{% endhighlight %}

Note: the GDAL installer from KyngChaos bundles a version of numpy in
`/Library/Frameworks/GDAL.framework/Versions/1.6/Python/site-packages/numpy/`,
so if you run into weirdness, it's probably safe to delete that one.

Note: scipy recommends installing `fftw` for fast Fourier transformations; I was
unable to get scipy to build when it was installed (using homebrew), so I'm
omitting that step.

### Cascadenik

[Cascadenik](http://code.google.com/p/mapnik-utils/wiki/Cascadenik) is a
pre-processor that converts CSS-like syntax into Mapnik XML configuration
files. It supports handy shorthand such as "`.thing[zoom > 12] { ... }`" for
targeting standard slippy zoom levels and generally makes it easier to maintain
map styles. `nik2img` supports Cascadenik styling natively, making it easier to
create and tweak styles (otherwise you'll need to run `cascadenik-compile.py`
manually).

First, check out Cascadenik from Google Code:

{% highlight bash %}
$ cd /usr/local/src
$ svn co http://mapnik-utils.googlecode.com/svn/trunk/serverside/cascadenik
{% endhighlight %}

Next, build and install it:

{% highlight bash %}
$ cd cascadenik
$ python setup.py install
{% endhighlight %}

It will automatically download and install `cssutils` for you before making
`cascadenik-compile.py` and `cascadenik-style.py` available in your `$PATH`.

## OpenStreetMap

When working with data from [OpenStreetMap](http://openstreetmap.org/),
[`osm2pgsql`](http://wiki.openstreetmap.org/wiki/Osm2pgsql) and
[Osmosis](http://wiki.openstreetmap.org/wiki/Osmosis) are critical.

To install `osm2pgsql`, check it out from OSM's subversion repository and use
`make` to build and install it, linking against the KyngChaos framework:

{% highlight bash %}
$ cd /usr/local/src
$ svn co http://svn.openstreetmap.org/applications/utils/export/osm2pgsql/ 
$ cd osm2pgsql
$ PATH=$PATH:/Library/Frameworks/GEOS.framework/unix/bin/ \
    CFLAGS="-I/Library/Frameworks/PROJ.framework/unix/include" \
    LDFLAGS="-L/Library/Frameworks/PROJ.framework/unix/lib/" \
    make
{% endhighlight %}

You'll have to install it by hand to `/usr/local`:

{% highlight bash %}
$ install -m 0755 osm2pgsql /usr/local/bin
$ install default.style /usr/local/share/osm2pgsql
{% endhighlight %}

`default.style` is the standard map of OSM tags to database columns; you'll
need it when you run an import, even if the defaults are fine.

[Osmosis](http://wiki.openstreetmap.org/wiki/Osmosis) is a filter-driven tool
for processing large volumes of OSM XML.

To begin, download the [latest version of
Osmosis](http://dev.openstreetmap.org/~bretth/osmosis-build/osmosis-latest.tar.gz).

Extract it to `/usr/local`:

{% highlight bash %}
$ cd /usr/local
$ tar zxf ~/Downloads/osmosis-latest-bin.tar.gz
{% endhighlight %}

Now, create a symlink to the binary:

{% highlight bash %}
$ ln -s /usr/local/osmosis-0.36/bin/osmosis /usr/local/bin/osmosis
{% endhighlight %}

## PostgreSQL Additions

At present, the KyngChaos distribution of PostgreSQL does not include the
[intarray](http://www.postgresql.org/docs/current/static/intarray.html) module
(you can check `/usr/local/pgsql/share/contrib` to see if it's been added).
`osm2pgsql` uses this module to create updatable Postgres OSM mirrors (meaning
that you can stay up-to-date by applying [planet
diffs](http://planet.openstreetmap.org/)).

This means that we need to build it ourselves. First, [download the source
tarball corresponding to the version you already have
installed](http://www.postgresql.org/ftp/source/v8.4.5/). Next, extract it to
`/usr/local/src`:

{% highlight bash %}
$ cd /usr/local/src
$ tar zxf ~/Downloads/postgresql-8.4.5.tar.bz2
{% endhighlight %}

Configure Postgres:

{% highlight bash %}
$ cd postgres-8.4.5
$ ./configure
{% endhighlight %}

Change to the _intarray_ contrib directory and `make` it:

{% highlight bash %}
$ cd contrib/intarray
$ export PATH=/usr/local/pgsql/bin:$PATH
$ export USE_PGXS=1
$ make
$ sudo make install
{% endhighlight %}

(This same process can be repeated for other extensions that you desire.)

With `intarray` now installed, you can enable the database of your choosing
(`osm` in this case):

{% highlight bash %}
$ sudo -u postgres psql -d osm -f /usr/local/pgsql/share/contrib/_int.sql
{% endhighlight %}

## GUI Utilities

For graphical management of spatial data beyond what Qgis can handle, I usually
use [Base](http://menial.co.uk/software/base/) (for SQLite databases) and
[pgAdmin](http://www.pgadmin.org/) (for PostgreSQL databases).

## Congratulations!

You now have a working spatial stack on OS X! There are certainly things missed
here, but I'll try to keep this up-to-date as I discover new tools and simpler
methods (and in response to your comments, dear reader).

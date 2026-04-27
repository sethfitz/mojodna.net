---
layout: post
title: Continuing to map the MBTA
---

## {{ page.title }}

**Update:** I haven't worked on this in many moons and it has ceased to work.  [Here is a currently working MBTA map.](http://www.thrall.net/maps/mbta.html)

Ok, so [it](/2005/04/19/mbta-maps/)'s not that useful right now, since it only
covers a small part of Cambridge at one zoom level. And since I don't really
have the time to keep working on it right now, I'll post what I've got so
anyone else can continue.

* [Maps in PDF](http://www.mbta.com/traveling_t/schedules_pdfmaps_system.asp)
* [Tiles so far (x=5378, y=-740 (top left) to x=5386, y=-733 (bottom
  right))](http://maps.mojodna.net/mbta/mbta-images.tgz) (these are 128x128
  each)
* [Tile server](http://maps.mojodna.net/mbta/tiles.phps)
* [Greasemonkey script](http://maps.mojodna.net/mbta/mbta_google_maps.user.js)
  (change mbta.baseURL to your own copy of the tiles)
* [Cambridge/Brookline/Charlestown/Boston, rasterized and stitched together
  (12MB)](http://maps.mojodna.net/mbta/full.psd.gz)

The 4 downtown maps work best when rasterized to a 1710px wide canvas (before
cropping) to create the tiles for zoom=2. I experimented with different sizes
and even figured out the pixel/mile ratio (more below), but that didn't help.

The PDFs are nice enough that it should be possible to create tiles for
multiple zoom levels.

The MBTA also has a nice [Trip
Planner](http://trip.mbta.com/cgi-bin/itin_page.pl) that could potentially be
scraped to provide transfers on the sidebar (where driving directions would
usually be placed). It appears to use lat/lon pairs internally, which is
helpful.

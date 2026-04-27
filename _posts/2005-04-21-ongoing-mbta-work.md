---
layout: post
title: Ongoing MBTA Work
---

## {{ page.title }}

**Update:** I haven't worked on this in many moons and it has ceased to work.
[Here is a currently working MBTA map.](http://www.thrall.net/maps/mbta.html)

The coverage area has increased to cover Boston, Charlestown, South Boston,
and Brookline (the 4 downtown maps). Rather than creating the slices for tiles
by hand in Photoshop, I whipped up a PHP script to do it for me -
[slicer.php](http://maps.mojodna.net/mbta/slicer.phps) (requires GD w/ GIF
support, an increased memory\_limit in php.ini, and a GIF version of full.psd
(same dimensions)).

I added zoom level 1 by importing the PDFs as 3500px wide images and providing
alternate coordinates to the slicer. Hint: it's much faster to work with them
after converting them to Indexed Color (via RGB, as they get imported as CMYK)
(and obviates the need to Export to Web).

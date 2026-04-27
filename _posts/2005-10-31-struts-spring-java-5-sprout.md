---
layout: post
title: Introducing Sprout - Pure annotation goodness
---

## {{ page.title }}

Summary: [Sprout](http://github.com/mojodna/sprout).  Check it out.

I have a [Struts](http://struts.apache.org/) application that I work on every
day. It has been a Struts application for about 3 years. It will likely
continue to be a Struts application for the foreseeable future (it's now 2009
and it's a Rails app). I imagine some of you may be in the same position.

Ever since I started working on web applications in Java, I've been poking
around the other web frameworks that are out there.
[WebWork](http://www.opensymphony.com/webwork/) is interesting (especially now
that it's to merge with Struts). [Spring MVC](http://springframework.org/) is
promising, if only because I like having my services wired together and to my
actions. [Tapestry](http://jakarta.apache.org/tapestry/) seemed too complex,
and [SiteMesh](http://www.opensymphony.com/sitemesh/), while not a framework,
gave me everything that Tapestry was promising (granted, I haven't looked at
Tapestry a whole lot and should probably have another look).
[Wicket](http://wicket.sf.net/) and especially
[JSF](http://java.sun.com/j2ee/javaserverfaces/), ick. The web is not a client
application and does not lend itself well to the Swing approach to components
and widgets (yet). JSF, in particular, strikes me as great for both sides of
the Toolbuilder / Application developer divide, but the overhead involved in
creating custom components (a requirement for me, as I still like reinventing
my HTML constructs) is simply too great. JSF in its optimal form also takes an
event-based view of the web, which just doesn't work so well yet (POSTs
everywhere!). This isn't about Java frameworks; this is about Struts.

Enter [Ruby on Rails](http://rubyonrails.org/). Nifty. It fits the small
development team model much better (I am a development team of 1; Struts and
its ilk assume and thrive in an environment where tasks can and are divided
up, such as the one my app was originally written in). It was not created as a
framework, but more extracted from an application because it worked and made
its creator's life simpler. Convention over configuration (rather than
conventions AND configuration). Embedded opinions that just happen to jive
with my own view of the world. Looking at Rails and gaining an understanding
of how it fits together changed the way I think about web application
development. But this isn't about Rails.

I have a Struts application that I work on every day. I have a minor Rails
application that I rarely work on. I like Ruby. But I also use Java.

I recently spent some time focused on making Struts work for me rather than
accepting the tedium of its status quo. Out grew a
[Sprout](http://github.com/mojodna/sprout). The extract of something that
makes my life easier. It might do the same for yours. Let me know.

**Update**: Richard Harms took this work a couple years after I abandoned it
and maintained it for a year or so as a [Google Code
project](http://code.google.com/p/struts-sprout/). It lives on GitHub for
posterity (and portfolio) and includes the work that Richard contributed.

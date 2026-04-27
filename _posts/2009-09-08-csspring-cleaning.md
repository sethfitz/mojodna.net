---
layout: post
title: CSSpring Cleaning
---

## {{ page.title }}

I was talking to some front-end devs a couple weeks ago about maintaining CSS
on an evolving website. In particular, how to figure out which rules are no
longer being applied (remnants from experiments / old designs / whatever) and
remove them.

I remembered seeing something a few months ago that claimed to do this. After
digging around on [GitHub](http://github.com/) for a bit, I re-found
[deadweight](http://github.com/aanand/deadweight). Unfortunately, after
looking at it briefly, I realized that it made some pretty strong assumptions,
mainly about being run in the context of a Rails app.

Time for some hacking.

[My fork](http://github.com/mojodna/deadweight) can be installed with
RubyGems (`0.0.5` is required for _deflate_ and _gzip_ content-encodings):

{% highlight bash %}
$ sudo gem install mojodna-deadweight -s http://gems.github.com/
{% endhighlight %}

The first step was to make it accessible as a command-line utility (ideally in
the spirit of the [UNIX
Philosophy](http://en.wikipedia.org/wiki/Unix_philosophy)).

{% highlight bash %}
$ deadweight -s styles.css -s ie.css index.html about.html
{% endhighlight %}

(This will check `styles.css` and `ie.css` against `index.html` and
`about.html`, outputting unused rules.)

It also supports input from pipes, meaning that you can chain it together and
filter orphaned rules without writing them to a file (you'll have to configure
logging in order to limit output).

{% highlight bash %}
$ cat styles.css | deadweight index.html
{% endhighlight %}

Deadweight now contains an experimental `-L` argument that causes it to use
[Lyndon](http://github.com/defunkt/lyndon) if the `lyndon` executable is in
your `$PATH` (only possible on OS X with MacRuby installed). It was a bit
flaky in my testing, but I may be using an older version of MacRuby. Great
idea though. [Check this post for more info on what it does / how it
works.](http://ozmm.org/posts/lyndon.html)

The next step was to expose it as an HTTP proxy. It uses `8002` by default for
no particular reason.
([oauth-proxy](/2009/08/21/exploring-oauth-protected-apis.html) uses `8001`.)

{% highlight bash %}
$ deadweight -l deadweight.log -s styles.css -w http://github.com/ -P
{% endhighlight %}

(This dumps log output to `deadweight.log` in `$PWD` and matches
`http://github.com/*` against `styles.css`.)

It's probably most useful as an HTTP proxy; you can start it with a list of
target stylesheets, configure your browser to load pages through it (sorry, it
gets **really** slow when requesting _gzip_- or _deflate_-encoded pages, which
is a lot of the time), and watch the output to see how many rules it's hit.
When you're done, hit `^C` to stop it and (optionally) output the remaining
CSS rules into a file for you to examine (`-o orphans.css` will do this for
you when it shuts down).

If you're lucky, the file containing orphaned CSS will be empty. If not,
re-start the proxy with the orphaned CSS as the target and continue browsing
until you're ready to start looking for matches by hand (this is necessary, as
it won't catch classes applied by JavaScript).

### Things to Improve

[WEBrick](http://en.wikipedia.org/wiki/WEBrick)'s HTTP proxy implementation
leaves a lot to be desired (it's nowhere on the same level as
[Twisted](http://twistedmatrix.com/trac/)'s), but it's the only game in town.
[Ilya Grigorik](http://www.igvita.com/) has done some excellent work with
[EventMachine and proxies](http://github.com/igrigorik/em-proxy), but it
doesn't appear that anyone has built a general-purpose HTTP proxy that easily
supports header modification. It's not a particularly hard problem and being
able to move deadweight's proxy implementation to such a base would provide
the ability to turn off compression and thus speed things up considerably.

One could also imagine a world in which the proxy server also contains a web
interface that displays unmatched CSS rules and updates on the fly.
EventMachine would do the trick here, too.

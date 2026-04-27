---
layout: post
title: "switchboard : XMPP :: curl : HTTP"
---

## {{ page.title }}

### Quick Start

* Switchboard on GitHub:
[http://github.com/mojodna/switchboard/tree](http://github.com/mojodna/switchboard/tree)
* Switchboard Google Group:
[http://groups.google.com/group/switchboard](http://groups.google.com/group/switchboard)

Here's how to install and use Switchboard for a few basic use-cases:

{% highlight bash %}
$ # install Switchboard
$ sudo gem install switchboard

$ # list everyone on your roster (buddy list)
$ switchboard --jid client@example.com --password pa55word \
    roster list

$ # add a friend to your roster
$ switchboard --jid client@example.com --password pa55word \
    roster add friend@example.com

$ # listen for PubSub events
$ switchboard --jid subscriber@example.com --password pa55word \
    pubsub --server <pubsub server> listen
{% endhighlight %}

### "curl for XMPP?"

`curl` is the ultimate Swiss Army Knife for HTTP. Switchboard aims to be the
same for XMPP.

HTTP is (relatively) easy. It's stateless and has fairly limited semantics.
However, if you're trying to debug a web service and want to determine what
certain `ETag`s, additional headers, or specific content types respond with,
`curl` is your go-to.

XMPP is a bit more complicated; it's stateful, it (usually) requires login
credentials, it's asynchronous, and it has many extensions to the core
protocol that are in varying levels of use. Traditionally, in order to explore
an XMPP service, you'd have to delve into the advanced features of a client
like [Psi](http://psi-im.org/) or [Synapse](http://synapse.im/), often
dropping to the level of entering raw XML to see what happens in response.

Switchboard (and its command-line equivalent, `switchboard`) simplifies the
process of repeatedly making common requests (e.g. roster manipulation,
probing, and PubSub node operations) and is easily extended to support new
behaviors.

### Switchboard background

Copying and pasting XML isn't the least error-prone process I can think of. In
addition, I found myself repeatedly testing the same types of stanzas (e.g.
[PubSub](http://xmpp.org/extensions/xep-0060.html) requests) and attempting to
implement extensions for which no implementations existed (i.e. [OAuth over
XMPP](http://xmpp.org/extensions/xep-0235.html)).

Diving into [`xmpp4r`](http://home.gna.org/xmpp4r/)'s functionality led me to
expose additional features to the command-line tool such as
[PEP](http://xmpp.org/extensions/xep-0163.html) and [Last
Activity](http://xmpp.org/extensions/xep-0012.html) to see how difficult it
would be.

Since all of its dependencies have been released and are installable via
RubyGems now, people who aren't me can finally use Switchboard without much
hassle. In honor of this milestone, Switchboard has been updated to 0.1.0.
Real mature, I know, but it is still quite useful.

People who *are* me have been using this tool since last November (in
fact, this is the project that inspired ["My (public) Git
Workflow"](/2009/03/09/my-public-git-workflow.html)). (Some people have been
using it to consume [Fire Eagle](http://fireeagle.yahoo.net/)'s [Location
Streams](http://feblog.yahoo.net/2009/02/19/fire-eagle-location-streams/), but
it hasn't been for the faint of heart.)

Switchboard's primary strength is certainly the command-line interface, but it
turns out that it's a pretty good abstraction over `xmpp4r` for building
clients and servers (as components).

Here are a few projects I've worked on that use Switchboard:

* [bamboo-shooter](http://github.com/mojodna/bamboo-shooter/tree) - PubSub for
  Pandas: an pseudo-realtime XMPP interface to the Flickr Panda APIs
* [fire-hydrant](http://github.com/mojodna/fire-hydrant/tree) - A simple
  library (as a Switchboard "jack") for consuming
  [Fire Eagle](http://fireeagle.yahoo.net/)'s [Location Streams](http://feblog.yahoo.net/2009/02/19/fire-eagle-location-streams/)
* [mars](http://github.com/mojodna/mars/tree) and
  [jupiter](http://github.com/mojodna/jupiter/tree) - A matched pair of
  experiments mapping REST to XMPP
* [dovetail](http://github.com/mojodna/dovetail/tree) - A start at a framework
  for building PubSub servers (again, as components)

### What to do?

#### Configuration

The first thing you'll probably want to do with Switchboard is to provide some
basic configuration so you won't have to constantly enter your login
credentials:

{% highlight bash %}
$ switchboard config jid jid@example.com
$ switchboard config password pa55word
{% endhighlight %}

To get the value of a setting, don't include a value:

{% highlight bash %}
$ switchboard config jid # => jid@example.com
{% endhighlight %}

Some additional useful settings to set defaults for are:

* `debug` - Turn on verbose mode: good for debugging. (`true` / `false`)
* `resource` - Override the default resource of `/switchboard` (don't include
  the `/`). This is useful if you want to run multiple instances with the same
  *JID*. This is equivalent to `switchboard --resource <resource>`. (*String*)
* `pubsub.server` - Specify a default server to make PubSub requests against.
  This is equivalent to `switchboard pubsub --server <server>`. (*String*)
* `oauth` - Use [OAuth](http://oauth.net/) when making PubSub requests. This
  is equivalent to `switchboard pubsub --oauth` and requires that the
  [`oauth` gem](http://oauth.rubyforge.org/) be installed. (`true` /
  `false`)
* `oauth.consumer_key` - Specify a default OAuth consumer key. This is
  equivalent to `switchboard pubsub --oauth-consumer-key <key>`. (*String*)
* `oauth.consumer_secret` - Specify a default OAuth consumer secret. This is
  equivalent to `switchboard pubsub --oauth-consumer-secret <secret>`.
  (*String*)
* `oauth.token` - Specify a default OAuth token. This is equivalent to
  `switchboard pubsub --oauth-token <token>`. (*String*)
* `oauth.token_secret` - Specify a default OAuth token secret. This is
  equivalent to `switchboard pubsub --oauth-token-secret <secret>`. (*String*)

In general, anything that is referred to in the library in the form
`OPTIONS["pubsub.node"]` can be set as a Switchboard setting.

#### Roster Manipulation

Roster manipulation is something that can be easily handled by a desktop XMPP
client, but sometimes it's more convenient to be able to do it from the
command-line.

Rosters can be listed, added to, or removed from. I'll assume you've
configured Switchboard with some login credentials.

{% highlight bash %}
$ switchboard roster list
$ switchboard roster online
$ switchboard roster add friend1@example.org friend2@example.org
$ switchboard roster remove friend2@example.org enemy@example.org
{% endhighlight %}

#### Probing and Discovery

XMPP provides some pretty heady functionality when it comes to determining
what a server is capable of. A `disco#info` query is the first step to use
when determining capabilities:

{% highlight bash %}
$ switchboard disco --target jabber.org info
{% endhighlight %}

The response to this query includes `http://jabber.org/protocol/disco#items`,
which means that `jabber.org` supports `disco#items` queries, which allow you
to determine what top-level items (services) are available:

{% highlight bash %}
$ switchboard disco --target jabber.org items
{% endhighlight %}

This response includes `conference.jabber.org`. Let's list items available
there:

{% highlight bash %}
$ switchboard disco --target conference.jabber.org items
{% endhighlight %}

Whoa.  A list of *MUC*s (multi-user chats) hosted on `conference.jabber.org`.

You can do the same thing to list available PubSub nodes if you're running a
local copy of [ejabberd](http://ejabberd.im/) or another XMPP server that
supports it. (Note that you may need to prefix your hostname with `pubsub` in
order to see the nodes.)

#### PubSub

Switchboard supports more of
[PubSub](http://xmpp.org/extensions/xep-0060.html) than any other extension,
mainly because that's been my primary focus of XMPP experimentation. To get a
full list of available PubSub commands:

{% highlight bash %}
$ switchboard pubsub
{% endhighlight %}

A basic sequence of events is to subscribe:

{% highlight bash %}
$ switchboard pubsub --server <server> subscribe --node <node>
{% endhighlight %}

List subscriptions:

{% highlight bash %}
$ switchboard pubsub --server <server> subscriptions
{% endhighlight %}

Listen for notifications:

{% highlight bash %}
$ switchboard pubsub --server <server> listen
{% endhighlight %}

Unsubscribe:

{% highlight bash %}
$ switchboard pubsub --server <server> unsubscribe --node <node>
{% endhighlight %}

Let's walk through a couple examples.

First, [Superfeedr](http://superfeedr.com/), which bills itself as "real-time
feed parsing in the cloud". To begin, you'll need to register and activate
your account. Once you've done that, set up a subscription a
[Twitter](http://twitter.com/) search for "xmpp":

{% highlight bash %}
$ switchboard --jid <username>@superfeedr.com --password <password> \
    pubsub --server firehoser.superfeedr.com \
    subscribe --node "http://search.twitter.com/search.atom?q=xmpp"
{% endhighlight %}

We would next list subscriptions, but Superfeedr uses a non-standard mechanism
to do so. Instead, let's listen for new results:

{% highlight bash %}
$ switchboard --jid <username>@superfeedr.com --password <password> \
    pubsub --server firehoser.superfeedr.com listen
{% endhighlight %}

If you're lucky, you'll get an Atom payload or two. Here's one:

{% highlight xml %}
<event xmlns='http://jabber.org/protocol/pubsub#event'>
  <status feed='http://search.twitter.com/search.atom?q=xmpp' xmlns='http://superfeedr.com/xmpp-pubsub-ext'>
    <http code='200'>16933 bytes fetched in 0.600034s</http>
    <next_fetch>2009-07-22T17:26:22Z</next_fetch>
  </status>
  <items node='http://search.twitter.com/search.atom?q=xmpp'>
    <item chunk='1' chunks='1'>
      <entry xmlns='http://www.w3.org/2005/Atom'>
        <title>Great... trillian update has killed my ability to view my xmpp rosters</title>
        <summary>Great... trillian update has killed my ability to view my &lt;b&gt;xmpp&lt;/b&gt; rosters</summary>
        <link href='http://superfeedr.com/entries/tr5gfgstf8oqlcgr5opaeotxk39ovtos0oiat7h12mqfuoxdmgbjz1rnjtzswqvja2dqh8cgg31' rel='alternate' type='text/html'/>
        <published>2009-07-22T17:10:52Z</published>
        <id>tag:search.twitter.com,2005:2781212809</id>
      </entry>
    </item>
    <item chunk='1' chunks='1'>
      <entry xmlns='http://www.w3.org/2005/Atom'>
        <title>usando Tkabber: TKabber is Tcl/Tk Jabber-client with great functionality. It supports MUC, XMPP-statuses a.. http://bit.ly/AsFPg</title>
        <summary>usando Tkabber: TKabber is Tcl/Tk Jabber-client with great functionality. It supports MUC, &lt;b&gt;XMPP&lt;/b&gt;-statuses a.. &lt;a href=&quot;http://bit.ly/AsFPg&quot;&gt;http://bit.ly/AsFPg&lt;/a&gt;</summary>
        <link href='http://superfeedr.com/entries/w6cezbjniqqgga3bd79ruklxhu7f4a6qqpro76hgz50gzccuekgmehz39yb1zi1cclgo83s' rel='alternate' type='text/html'/>
        <published>2009-07-22T17:07:54Z</published>
        <id>tag:search.twitter.com,2005:2781162048</id>
      </entry>
    </item>
  </items>
</event>
{% endhighlight %}

It includes a Superfeedr-specific `<status/>` element with information on the
most recent fetch as well as standard Atom feeds contained within standard
`<item/>` elements. This means that you can extract the Atom elements from the
PubSub payload and hand it to a feedparser of some variety to work its magic.

[Fire Eagle](http://fireeagle.yahoo.net/)'s [Location
Streams](http://feblog.yahoo.net/2009/02/19/fire-eagle-location-streams/) also
use PubSub, but subscription management requires that requests are signed
using OAuth. This allows 3rd party applications to make requests on behalf of
specific users without having to obtain their actual credentials (in short,
it's exactly the same use-case for OAuth over HTTP).

Let's start with a subscriptions list request, since we have the credentials
("General Purpose Access Token") immediately after registering a "web"
application with [Fire Eagle](http://fireeagle.yahoo.net/).

{% highlight bash %}
$ switchboard pubsub --oauth \
    --oauth-consumer-key <consumer key> \
    --oauth-consumer-secret <consumer secret> \
    --oauth-token <general token> \
    --oauth-token-secret <general token secret> \
    --server fireeagle.com \
    subscriptions
{% endhighlight %}

Odds are, you'll have nothing there. Let's change that. Send yourself through
the authorization process in order to get a valid OAuth token and secret:

{% highlight bash %}
$ oauth --consumer-key <consumer key> \
    --consumer-secret <consumer secret> \
    --access-token-url https://fireeagle.yahooapis.com/oauth/access_token
    --authorize-url https://fireeagle.yahoo.net/oauth/authorize
    --request-token-url https://fireeagle.yahooapis.com/oauth/request_token
    authorize
{% endhighlight %}

With that token and secret, subscribe to your Location Stream:

{% highlight bash %}
$ switchboard pubsub --oauth \
    --oauth-consumer-key <consumer key> \
    --oauth-consumer-secret <consumer secret> \
    --oauth-token <token> \
    --oauth-token-secret <token secret> \
    --server fireeagle.com \
    subscribe --node "/api/0.1/user/<token>"
{% endhighlight %}

Now you'll have a subscription to query for:

{% highlight bash %}
$ switchboard pubsub --oauth \
    --oauth-consumer-key <consumer key> \
    --oauth-consumer-secret <consumer secret> \
    --oauth-token <general token> \
    --oauth-token-secret <general token secret> \
    --server fireeagle.com \
    subscriptions
{% endhighlight %}

Listen for location updates:

{% highlight bash %}
$ switchboard pubsub --server fireeagle.com listen
{% endhighlight %}

[Update your current location](http://fireeagle.yahoo.net/my/location) and
watch as the update rolls in. If you'd like to visualize updates with [Google
Earth](http://earth.google.com/), check out [fire-hydrant on
GitHub](http://github.com/mojodna/fire-hydrant/tree).

We're done, so we may as well clean up and unsubscribe:

{% highlight bash %}
$ switchboard pubsub --oauth \
    --oauth-consumer-key <consumer key> \
    --oauth-consumer-secret <consumer secret> \
    --oauth-token <token> \
    --oauth-token-secret <token secret> \
    --server fireeagle.com \
    unsubscribe --node "/api/0.1/user/<token>"
{% endhighlight %}

#### PEP (Personal Eventing Protocol)

[PEP](http://xmpp.org/extensions/xep-0163.html) is a specialized version of
PubSub, intended to allow individuals to associate data with their JIDs.
Switchboard supports publishing of User Tune and User Location.

Due to the ability of XMPP to allow multiple instances of the same account
online (identified with different resources), Switchboard can serve up User
Tune and User Location for the same account you're already online with. Not
every client supports displaying them, but they're fun to play with
regardless.

To publish User Tune, you need to be on a Mac, running iTunes, and have the
`rb-appscript` gem installed (`sudo gem install rb-appscript`). Once that's
done:

{% highlight bash %}
$ switchboard --resource switchtunes pep tune
{% endhighlight %}

To publish User Location, you need to be updating [Fire
Eagle](http://fireeagle.yahoo.net/)
([Clarke](http://tomtaylor.co.uk/projects/clarke/) is an excellent background
updater for OS X) and have the `fire-hydrant` gem installed from GitHub (`sudo
gem install mojodna-fire-hydrant -s http://gems.github.com`). Once that's
square:

{% highlight bash %}
$ switchboard --resource switchfire pep location
{% endhighlight %}

#### More

Switchboard supports more functionality than I've described above. To get a list of general `switchboard` commands (some of which may have sub-commands):

{% highlight bash %}
$ switchboard
{% endhighlight %}

### Getting Help

In theory, if you want more information about a specific command, you can use
`switchboard help <command>`. For example:

{% highlight bash %}
$ switchboard help pubsub
{% endhighlight %}

For now, you'll notice that it's not particularly useful. If you'd like to
help rectify this, you can implement various `help` methods that are lying
around, such as `Switchboard::Commands::PubSub.help`.

### Extending

Writing new Switchboard commands is really easy, assuming that the primary
application logic that you're depending exists elsewhere (i.e. in `xmpp4r`).

I was on a panel with [Peter St. Andre](http://stpeter.im/) and [Jack Moffitt](http://metajack.im/) at the Glue Conference in Denver this Spring and we got to talking about tools like Switchboard.  Jack wondered how hard it would be to implement something like `grep` for XMPP.

(Jack is one of the authors of a Python project similar to Switchboard named [`poetry`](https://launchpad.net/poetry)).

I took a whack at it and it came out like this:

{% highlight ruby %}
module Switchboard
  module Commands
    class Grep < Switchboard::Command
      description "Search for an XPath expression"

      def self.run!
        expr = ARGV.pop

        switchboard = Switchboard::Client.new
        switchboard.plug!(AutoAcceptJack, NotifyJack)

        switchboard.on_stanza do |stanza|
          # TODO doesn't handle default namespaces properly
          REXML::XPath.each(stanza, expr) do |el|
            puts el.to_s
          end
        end

        switchboard.run!
      end
    end
  end
end
{% endhighlight %}

*Jack*s (not Moffitt) deserve their own discussion, but the thrust of this
piece of code is the `#on_stanza` callback (which yields a `REXML::Node`
object) and the XPath expression. Note that for whatever reason, you can't
search for nodes that have a default namespace (e.g. `<presence />`); I'm
going to assume that this is a REXML quirk.

If you want to take a shot at implementing a Switchboard command,
[Ping](http://xmpp.org/extensions/xep-0199.html) should be pretty simple.
Alternately, Switchboard doesn't support sending or receiving basic `<message
/>` stanzas from the command-line. Supporting those would make it simple to
interact with a service like [identi.ca](http://identi.ca/).

### How to Help

There are a few simple ways to help out with Switchboard's development:

* explore the API
* build out the docs
* implement IM functionality
* write up how to use it for a particular service / use-case
* use it!

What's your favorite use for Switchboard?

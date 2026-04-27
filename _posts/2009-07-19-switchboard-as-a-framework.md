---
layout: post
title: Switchboard as a Framework
---

## {{ page.title }}

While Switchboard is a [useful tool for debugging and probing XMPP
services](http://mojodna.net/2009/07/16/switchboard-curl-for-xmpp.html), it's
also a convenient and full-featured framework for building clients and
components.

### A Simple Client

This is the simplest client (bot) I could think of. It listens for input and
replies with whatever was sent in the first place.

{% highlight ruby %}
#!/usr/bin/env ruby -rubygems

require 'switchboard'

switchboard = Switchboard::Client.new
switchboard.plug!(AutoAcceptJack, EchoJack, NotifyJack)
switchboard.run!
{% endhighlight %}

Let's break it down.

{% highlight ruby %}
#!/usr/bin/env ruby -rubygems

require 'switchboard'
{% endhighlight %}

Um, I hope this is pretty straightforward.

{% highlight ruby %}
switchboard = Switchboard::Client.new
{% endhighlight %}

This instantiates `Switchboard::Client` with some default options, mainly
`spin = true` (this is the 2nd argument). `spin` means that `#run!` will cause
the process to run in a loop and not return immediately. `^C` will interrupt
the process and shut it down cleanly. (`^C` a second time if it hangs.)

{% highlight ruby %}
switchboard.plug!(AutoAcceptJack, EchoJack, NotifyJack)
{% endhighlight %}

This is the meat of it, even though it doesn't look like it at first glance.
*Jack*s are the basic units of shared functionality. More later, but the basic
rundown is that `AutoAcceptJack` auto-accepts (and reciprocates) roster
additions ("friend requests"), `EchoJack` does the heavy lifting of echoing
input back, and `NotifyJack` sends presence (i.e. "I'm online") notifications
to everyone (and everything) in your roster.

`EchoJack` (`lib/switchboard/jacks/echo.rb`) looks like this:

{% highlight ruby %}
class EchoJack
  def self.connect(switchboard, settings)
    switchboard.on_message do |message|
      stream.send(message.answer)
    end
  end
end
{% endhighlight %}

I'll get to the details of `self.connect` shortly, but the gist of it is that
the `EchoJack` registers an `on_message` callback and uses `Jabber::Message`'s
`#answer` method to create a response (inverting the sender and receiver)
before sending it back on the stream (client or component connection, as the
case may be).

Implementing the `EchoBot` as a jack is perhaps overkill, but the goal was to
demonstrate how short and modular Switchboard apps can be. The alternate
implementation looks like this:

{% highlight ruby %}
switchboard.plug!(AutoAcceptJack, NotifyJack)
switchboard.on_message do |message|
  stream.send(message.answer)
end
{% endhighlight %}

Callbacks are executed in the context of the `switchboard` object; this is
important to remember, as variables defined in a different scope will be
unavailable.

{% highlight ruby %}
switchboard.run!
{% endhighlight %}

This kicks off the process of connecting to the server. As XMPP is an
asynchronous protocol, the different hooks will be called in response to
varying inputs.

### Jacks and Hooks

Jacks are extractions of standard functionality that are executed in the
context of the Switchboard core. Thus, references to `stream`, etc. call
methods implemented by `Switchboard::Core` and its subclasses rather than the
jack itself. If you need convenience methods, they should be defined on the
`switchboard` object provided as the 1st argument to `connect`:

{% highlight ruby %}
def self.connect(switchboard, settings)
  def switchboard.helper_method
    # do something
  end
  
  switchboard.on_message do |message|
    helper_method
  end
end
{% endhighlight %}

`connect` is the entry point for all jacks. When the jack is plugged into
switchboard (using `Switchboard::Core#plug!`), `connect` is called with the
active Switchboard instance and its corresponding `Switchboard::Settings`. You
can modify the settings in the body of `connect`, but what you'll most often
be doing is adding additional functionality (via method definitions or
*Module*s) to the Switchboard instance.

`PubSubJack` (`lib/switchboard/jacks/pubsub.rb`) modifies the `switchboard`
object by extending a helper *Module*:

{% highlight ruby %}
def self.connect(switchoard, settings)
  switchboard.extend(Switchboard::Helpers::PubSubHelper)
  
  switchboard.on_startup do
    # ...
  end
end
{% endhighlight %}

Like everything else, jacks have access to all hooks (lifecycle callbacks).
These are called using `on_<hook name>`. In general, these map to callbacks
defined by `xmpp4r`.

* `startup`
* `shutdown`
* `stream_connected`
* `exception`
* `stanza`
* `message`
* `presence`
* `iq`

Clients provide the following additional hooks:

* `roster_presence`
* `roster_query`
* `roster_subscription`
* `roster_subscription_request`
* `roster_loaded`
* `roster_update`

Strictly speaking, these hooks should probably be implemented by a
`RosterJack` and plugged in to `Switchboard::Client` by default.

Some jacks also introduce additional hooks (using `hook(:name)`), such as
`PubSubJack`:

* `pubsub_event`

This hook is registed in `Switchboard::Helpers::PubSubHelper`
(`lib/switchboard/helpers/pubsub.rb`) with
`Switchboard::Core.hook(:pubsub_event)`.

### Standard Jacks

The following jacks are available from the standard distribution:

* `AutoAcceptJack` - Auto-accepts and reciprocates roster requests.
* `DebugJack` - Displays color-coded `<message />`, `<presence />`, and
  `<iq />` stanzas.
* `EchoJack` - Example jack that echos inputs back to the sender.
* `NotifyJack` - Sends online/offline presence to all roster items.
* `PubSubJack` - Adds a `pubsub_event` hook and some PubSub convenience
  methods.
* `OAuthPubSubJack` - Adds a `pubsub_event` hook and some OAuth-enabled PubSub
  convenience methods. The `oauth` gem must be installed for this to work.
* `RosterDebugJack` - Like the `DebugJack`, but for roster events and
  colorless.

[Fire Hydrant](http://github.com/mojodna/fire-hydrant/tree) includes a
`FireEagleJack` that introduces a `location_update` hook that yields a
`FireEagle::User` object, demonstrating that Switchboard apps can be
blissfully unaware of XMPP semantics when using the right jacks.

### A More Complex Example, with Pandas

[Bamboo Shooter](http://github.com/mojodna/fire-hydrant/tree) is a
pseudo-realtime interface to the [Flickr](http://flickr.com/) [Panda
APIs](http://code.flickr.com/blog/2009/03/03/panda-tuesday-the-history-of-the-panda-new-apis-explore-and-you/).
It polls the APIs once per minute and dribbles the responses out over XMPP
over the course of the subsequent minute.

This represents a more complex example for several reasons. Firstly, it
coexists with [EventMachine](http://rubyeventmachine.com/) as a set of
additional threads (EventMachine is evented and thus single-threaded):

{% highlight ruby %}
EM.run do
  Thread.new do
    # Bamboo::Shooter subclasses Switchboard::Component
    @shooter = Bamboo::Shooter.new(SETTINGS)
    @shooter.run!
  end
  
  # ...
end
{% endhighlight %}

Secondly, it implements a [PubSub](http://xmpp.org/extensions/xep-0060.html)
service as a [component](http://xmpp.org/extensions/xep-0225.html), so it
subclasses `Switchboard::Component` rather than `Switchboard::Client`. A
side-effect of implementing a service as a component is that the logic for
everything that the server would ordinarily do has to be managed by your code
instead. Presence handling (implemented by `Bamboo::Shooter#presence_handler`)
is usually the first example of this.

PubSub requests and subscription handling are application-specific concerns,
but much of the implementation is essentially boilerplate.
[Dovetail](http://github.com/mojodna/dovetail/tree) represents a start at
abstracting this, but it's incomplete at the moment. `<subscribe />` and
`<unsubscribe />` requests are the only operations currently supported; the fallback is to return a `<feature-not-implemented />` response:

{% highlight ruby %}
def iq_handler(iq)
  if iq.pubsub
    if subscribe = iq.pubsub.first_element("subscribe")
      node = subscribe.attributes["node"]

      puts "Subscription to #{node} requested by #{iq.from}"
      subscribers[node] ||= []
      unless subscribers[node].include?(iq.from.strip)
        subscribers[node] << iq.from.strip 
      end

      resp = Jabber::Iq.new(:result, iq.from)
      resp.from = iq.to # TODO component.domain (elsewhere, too)
      resp.id = iq.id
      pubsub = Jabber::PubSub::IqPubSub.new
      subscription = Jabber::PubSub::Subscription.new(iq.from.strip, node)
      subscription.state = "subscribed"
      pubsub.add(subscription)
      resp.add(pubsub)

      deliver(resp)
    elsif unsubscribe = iq.pubsub.first_element("unsubscribe")
      node = unsubscribe.attributes["node"]

      puts "Unsubscription from #{node} requested by #{iq.from}"
      subscribers[node] ||= []
      subscribers[node].delete(iq.from.strip)

      resp = Jabber::Iq.new(:result, iq.from)
      resp.from = iq.to # TODO component.domain (elsewhere, too)
      resp.id = iq.id
      deliver(resp)
    else
      puts "Received a pubsub message"
      puts iq.to_s
      # TODO not-supported
      not_implemented(iq)
    end
  else
    # unrecognized iq
    not_implemented(iq)
  end
end
{% endhighlight %}

This is tightly tied to `xmpp4r` and REXML, but as the rest of Switchboard is
too, it's not a big deal for the time being.

Presence tracking is a somewhat tricky problem (particularly for large numbers
of consumers), so you'll notice that I completed punted and left it
unimplemented. This means that subscriptions remain active (and will attempt
to deliver photo payloads) even if a client has gone offline. For this reason,
the consumers of this service are written to subscribe on startup and
unsubscribe on shutdown. If the unsubscribe doesn't happen, there's a fair
chance that the `bamboo-shooter` process's memory usage will balloon. As a
result, there is currently no public instance of this service running.

Polling of the Panda APIs is done using `EventMachine:HttpRequest`, which is a
non-blocking, evented HTTP client. The result of each request (scheduled to
run once per minute per panda) is parsed using REXML (because Switchboard is
already using it via `xmpp4r`), split up, and scheduled for publishing using
`EventMachine.add_timer`:

{% highlight ruby %}
EM.run do
  # ...

  check_pandas = lambda do
    params = {
      'api_key' => SETTINGS["flickr.key"],
      'method' => 'flickr.panda.getPhotos'
    }

    ["ling ling", "hsing hsing", "wang wang"].each do |panda|
      req = EventMachine::HttpRequest.new('http://api.flickr.com/services/rest/')
      http = req.get(:query => params.merge('panda_name' => panda))

      http.callback do
        begin
          doc = REXML::Document.new(http.response)
          doc.root.each_element do |rsp|
            total = rsp.attributes["total"].to_s.to_f
            panda = rsp.attributes["panda"].to_s
            interval = rsp.attributes["interval"].to_s.to_f
            interval = interval / total
            delay = 0.0

            puts "#{panda} found #{total} items with a #{interval}s delay."

            rsp.each_element do |node|
              EventMachine::add_timer(delay) do
                @shooter.publish("/flickr/pandas/#{CGI.escape(panda)}", node)
              end
              delay += interval
            end
          end
        rescue REXML::ParseException
        end
      end
    end
  end

  EventMachine::add_periodic_timer(61, &check_pandas)
  check_pandas.call
end
{% endhighlight %}

Consuming the Bamboo Shooter feed can either be done by running `switchboard
pubsub --server <server> listen` or with code like this (`earth.rb`, which
will zoom Google Earth to the location where the photo was taken). Remember,
Wang Wang is the Panda who likes maps.

{% highlight ruby %}
#!/usr/bin/env ruby -rubygems

begin
  require 'appscript'
rescue LoadError => e
  gem = e.message.split("--").last.strip
  puts "The #{gem} gem is required."
end

require 'cgi'
require 'switchboard'

node = "/flickr/pandas/#{CGI.escape(ARGV[0])}"

earth = Appscript.app("Google Earth")

DEFAULTS = {
  "resource" => "earth",
}

settings = YAML.load(File.read("bamboo_shooter.yml"))
switchboard = Switchboard::Client.new(settings.merge(DEFAULTS))
switchboard.plug!(AutoAcceptJack, NotifyJack, PubSubJack)

switchboard.on_startup do
  defer :subscribed do
    puts "Subscribing to #{node}"
    subscribe_to(node)
  end
end

switchboard.on_shutdown do
  puts "Unsubscribing from #{node}"
  unsubscribe_from(node)
end

switchboard.on_pubsub_event do |event|
  event.payload.each do |payload|
    payload.elements.each do |item|
      photo = item.first_element("photo")
      lat = photo.attributes["latitude"].to_f
      lon = photo.attributes["longitude"].to_f
      earth.SetViewInfo({:latitude => lat,
                         :longitude => lon,
                         :distance => (rand * 25000) + 5000,
                         :azimuth => rand * 360,
                         :tilt => (rand * 75)},
                        {:speed => 1})
    end
  end
end

switchboard.run!
{% endhighlight %}

Publishing is managed by the Switchboard component:

{% highlight ruby %}
def publish(node, xml_node)
  event = Jabber::PubSub::Event.new
  items = Jabber::PubSub::EventItems.new
  items.node = node
  item = Jabber::PubSub::EventItem.new

  item.add(xml_node)
  items.add(item)
  event.add(items)

  (subscribers[node] || []).each do |subscriber|
    message(subscriber, event)
  end
end
{% endhighlight %}

Getting Bamboo Shooter running is a little tricky, as it requires an XMPP that
supports the component protocol (I use [ejabberd](http://ejabberd.im/) with
the following configuration). More complicatedly, this server either needs to
be public (with DNS SRV records configured to support federation) or on a
private network with a second XMPP server running. When developing locally, I
use an Ubuntu VM with ejabberd running in component mode (using `ejabberd.cfg`
below) and a second ejabberd instance with the default configuration running
in OS X. `bamboo-shooter.rb` connects to Ubuntu, the client connects to OS X,
and the ejabberd instances figure out how to connect to one another with
ZeroConf (`hostname.local`; `avahi-daemon` on Ubuntu makes this possible).

{% highlight ruby %}
{loglevel, 4}.
{hosts, ["localhost"]}.
{listen, [
{5222, ejabberd_c2s, [ {access, c2s}, {shaper, c2s_shaper}, {max_stanza_size, 65536} ]},
{5269, ejabberd_s2s_in, [ {shaper, s2s_shaper}, {max_stanza_size, 131072} ]},
{5288, ejabberd_service, [{host, "<hostname>", [{password, "<password>"}]}]}
 ]}.
{auth_method, internal}.
{shaper, normal, {maxrate, 1000}}.
{shaper, fast, {maxrate, 50000}}.
{acl, local, {user_regexp, ""}}.
{language, "en"}.
{modules, [
 ]}.
{% endhighlight %}

### That's it for now

That's all I've got for now. It should be enough to get you started building
clients and components, but if you have any questions, post a comment below or
write to the [Switchboard Google
Group](http://groups.google.com/group/switchboard).

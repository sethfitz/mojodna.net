---
layout: post
title: Subscribing to Wordpress.com with Switchboard
---

## {{ page.title }}

Last week, Andy Skelton announced [Real-time Wordpress.com
subscriptions](http://andy.wordpress.com/2009/07/16/real-time-wordpress-com-subscription/)
via XMPP. It does IM, but more interestingly for me, it supports PubSub. Had I
realized this when he posted that, I would have included it as an example in
[switchboard : XMPP :: curl :
HTTP](http://mojodna.net/2009/07/16/switchboard-curl-for-xmpp.html) alongside
Fire Eagle and Superfeedr. What's done is done, however, so here's a quick
rundown of how to interact with Wordpress.com using Switchboard.

First, let's get a basic idea of the identities and features that
Wordpress.com advertises:

{% highlight bash %}
$ switchboard disco --target pubsub.im.wordpress.com info
=> Switchboard started.
Discovery Info for pubsub.im.wordpress.com
Identities:
  pubsub/service: Publish-Subscribe

Features:
  http://jabber.org/protocol/disco#info
  http://jabber.org/protocol/disco#items
  http://jabber.org/protocol/pubsub
  vcard-temp
  http://jabber.org/protocol/pubsub#access-authorize
  http://jabber.org/protocol/pubsub#access-open
  http://jabber.org/protocol/pubsub#access-presence
  http://jabber.org/protocol/pubsub#access-whitelist
  http://jabber.org/protocol/pubsub#auto-create
  http://jabber.org/protocol/pubsub#collections
  http://jabber.org/protocol/pubsub#config-node
  http://jabber.org/protocol/pubsub#create-and-configure
  http://jabber.org/protocol/pubsub#create-nodes
  http://jabber.org/protocol/pubsub#delete-items
  http://jabber.org/protocol/pubsub#delete-nodes
  http://jabber.org/protocol/pubsub#instant-nodes
  http://jabber.org/protocol/pubsub#item-ids
  http://jabber.org/protocol/pubsub#last-published
  http://jabber.org/protocol/pubsub#manage-subscriptions
  http://jabber.org/protocol/pubsub#member-affiliation
  http://jabber.org/protocol/pubsub#modify-affiliations
  http://jabber.org/protocol/pubsub#multi-subscribe
  http://jabber.org/protocol/pubsub#outcast-affiliation
  http://jabber.org/protocol/pubsub#persistent-items
  http://jabber.org/protocol/pubsub#presence-notifications
  http://jabber.org/protocol/pubsub#presence-subscribe
  http://jabber.org/protocol/pubsub#publish
  http://jabber.org/protocol/pubsub#publisher-affiliation
  http://jabber.org/protocol/pubsub#purge-nodes
  http://jabber.org/protocol/pubsub#retract-items
  http://jabber.org/protocol/pubsub#retrieve-affiliations
  http://jabber.org/protocol/pubsub#retrieve-default
  http://jabber.org/protocol/pubsub#retrieve-items
  http://jabber.org/protocol/pubsub#retrieve-subscriptions
  http://jabber.org/protocol/pubsub#subscribe
  http://jabber.org/protocol/pubsub#subscription-notifications
  http://jabber.org/protocol/pubsub#subscription-options
Shutdown initiated.
{% endhighlight %}

Lo, it supports PubSub! (But it doesn't support node discovery, so we can't
get a list of available nodes.) Fortunately, Andy's post includes a couple.
Let's subscribe:

{% highlight bash %}
$ switchboard pubsub --server pubsub.im.wordpress.com \
    --node /blogs/andy.wordpress.com subscribe
=> Switchboard started.
Subscribe successful.
Shutdown initiated.

$ switchboard pubsub --server pubsub.im.wordpress.com \
    --node /blogs/andy.wordpress.com/comments subscribe
=> Switchboard started.
Subscribe successful.
Shutdown initiated.

$ switchboard pubsub --server pubsub.im.wordpress.com --node \
     /blogs/andy.wordpress.com/2009/07/16/real-time-wordpress-com-subscription/ \
    subscribe
=> Switchboard started.
Subscribe successful.
Shutdown initiated.
{% endhighlight %}

Switchboard claimed that that worked, but let's double-check and list our
subscriptions:

{% highlight bash %}
$ switchboard pubsub --server pubsub.im.wordpress.com subscriptions
=> Switchboard started.
Subscriptions:
4E039BC19E028: me@jabber.org => /blogs/andy.wordpress.com (subscribed)
4E039D2A2B691: me@jabber.org => /blogs/andy.wordpress.com/2009/07/16/real-time-wordpress-com-subscription (subscribed)
4E039BC7E8A69: me@jabber.org => /blogs/andy.wordpress.com/comments (subscribed)
Shutdown initiated.
{% endhighlight %}

Actually, there was no need to subscribe to comments for "Real-time
Wordpress.com subscription" because we're also subscribed to the comments
feed. Let's unsubscribe and check our subscriptions again:

{% highlight bash %}
$ switchboard pubsub --server pubsub.im.wordpress.com --node \
     /blogs/andy.wordpress.com/2009/07/16/real-time-wordpress-com-subscription \
    unsubscribe
=> Switchboard started.
Unsubscribe was successful.
Shutdown initiated.

$ switchboard pubsub --server pubsub.im.wordpress.com subscriptions
=> Switchboard started.
Subscriptions:
4E039BC19E028: me@jabber.org => /blogs/andy.wordpress.com (subscribed)
4E039BC7E8A69: me@jabber.org => /blogs/andy.wordpress.com/comments (subscribed)
Shutdown initiated.
{% endhighlight %}

Ok, all good. Now let's hope Andy posts something or gets a comment on
something so we can listen for it:

{% highlight bash %}
$ switchboard pubsub --server pubsub.im.wordpress.com listen
(sample post and comment <event /> stanzas to come)
{% endhighlight %}

For bonus points, let's implement a `WordpressJack`:

{% highlight ruby %}
class WordpressJack
  def self.connect(switchboard, settings)
    switchboard.plug!(AutoAcceptJack, NotifyJack, PubSubJack)
    switchboard.hook(:new_post, :new_comment)

    switchboard.on_pubsub_event do |event|
      event.payload.each do |payload|
        payload.elements.each do |item|
          # grab the feed out of the payload
          feed = item.first_element("feed")
          
          # TODO determine whether it's a comment or a post
          # for now, we'll assume it's a post
          # invoke the :new_post hook with the feed subtree
          # (later: parse it with FeedTools or something)
          on(:new_post, feed)
        end
      end
    end
  end
end
{% endhighlight %}

And a quick-and-dirty consumer:

{% highlight ruby %}
#!/usr/bin/env ruby -rubygems

require 'switchboard'
require 'wordpress_jack'

switchboard = Switchboard::Client.new
switchboard.plug!(WordpressJack)

switchboard.on_new_post do |post|
  puts "A new post was received:"
  puts post
end

switchboard.on_new_comment do |comment|
  puts "A new comment was received:"
  puts comment
end

switchboard.run!
{% endhighlight %}

There are a number of improvements that can be made here (this is the "making
blind assumptions about responses" version).  Go wild.

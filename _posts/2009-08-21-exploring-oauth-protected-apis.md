---
layout: post
title: Exploring OAuth-Protected APIs
---

## {{ page.title }}

From time to time I need to debug OAuth-protected APIs, checking response
headers and examining XML and JSON payloads. `curl` generally rocks for this
sort of thing, but when the APIs in question are protected with OAuth, things
break down. Likewise for benchmarking (`ab`, `httperf`, etc.) and
exploration--isn't it nice to browse APIs that return XML in Firefox?

This needn't to be the case.

### Enter `oauth-proxy`

This is why I wrote
[`oauth-proxy`](http://github.com/mojodna/oauth-proxy). It does what it
says on the tin: it acts a proxy server that transparently adds OAuth headers
to requests.

There are 2 steps to using it.  First, install it:

{% highlight bash %}
$ easy_install oauth-proxy
{% endhighlight %}

Then, start it:

{% highlight bash %}
$ oauth-proxy \
    --consumer-key <consumer key> \
    --consumer-secret <consumer secret> \
    [--token <token>] \
    [--token-secret <token secret>] \
    [-p <proxy port>] \
    [--ssl]
{% endhighlight %}

If you're accessing a resource that only requires 2-legged OAuth, you can omit
`--token` and `--token-secret`. The proxy port defaults to `8001`, and `--ssl`
is used if you're proxying connections to a provider that requires SSL (Fire
Eagle, for example).

Once it's been started, use `curl` to make requests through it:

{% highlight bash %}
$ curl -x localhost:8001 http://host.name/path
{% endhighlight %}

You can also benchmark your APIs through it using ApacheBench (`ab`, as it
includes support for HTTP proxies). Note that you are introducing additional
overhead by proxying the request, so your numbers may be a bit off.

{% highlight bash %}
$ ab -X localhost:8001 http://host.name/path
{% endhighlight %}

Firefox (and browsers in general) supports HTTP proxies, so you can add a
"Manual Proxy Configuration" and pass requests through `oauth-proxy` to
explore APIs in the comfort of your favorite browser. By default, all requests
that Firefox makes will go through the proxy and be signed, which may confuse
other websites you visit (and will inadvertently reveal your consumer key and
access token but not the corresponding secrets).

### Access Tokens Sold Separately

If you're accessing a resource that requires 3-legged OAuth, you'll need a
token. You may already have one, but if you don't, you can use the [OAuth
library for Ruby](http://github.com/mojodna/oauth) to obtain one.

First, install the gem (0.3.5 is current as of this writing):

{% highlight bash %}
$ sudo gem install oauth
{% endhighlight %}

Then, trigger the authorization process from the command-line:

{% highlight bash %}
$ oauth \
    --consumer-key <consumer key> \
    --consumer-secret <consumer secret> \
    --access-token-url http://host.name/path/to/access_token \
    --authorize-url http://host.name/path/to/authorize \
    --request-token-url http://host.name/path/to/request_token \
    authorize
{% endhighlight %}

Follow the prompts, and voilà, an access token and secret that you can use
with `oauth-proxy`.

### A Concrete Example

Twitter's popular, right?  Let's use that.

First, [register an application](http://twitter.com/apps/new) to get a
consumer key and secret. I registered as a "client" application, since the
command-line still doesn't have a callback url.

Once that's done, you'll get a set of credentials that can be used to initiate
the authorization process.

Let's authorize.

{% highlight bash %}
$ oauth \
  --consumer-key <consumer key> \
  --consumer-secret <consumer secret> \
  --access-token-url http://twitter.com/oauth/access_token \
  --authorize-url http://twitter.com/oauth/authorize \
  --request-token-url http://twitter.com/oauth/request_token \
  authorize
{% endhighlight %}

After following the prompts, you'll get something back that looks like this:

{% highlight yaml %}
oauth_token_secret: [redacted]
oauth_token: [redacted]
user_id: [redacted]
screen_name: [redacted]
{% endhighlight %}

You can then use those values to start the OAuth proxy:

{% highlight bash %}
$ oauth-proxy \
    --consumer-key <consumer key> \
    --consumer-secret <consumer secret> \
    --token <access token> \
    --token-secret <token secret>
{% endhighlight %}

Now we're set.  Let's go exploring:

{% highlight bash %}
$ curl -sx http://localhost:8001 \
    http://twitter.com/statuses/friends_timeline.json | \
    jsonpretty | pygmentize -l js
{% endhighlight %}

You'll get exactly what you're expecting **and** you'll be using OAuth (this
is a partially contrived example since Twitter still supports HTTP Base Auth).

([`jsonpretty`](http://github.com/nicksieger/jsonpretty) rocks. `pygmentize`
(`easy install pygments`) makes it easier to make sense of the chaos.)

That's all. I use this stuff all the time and can't imagine debugging APIs
without it.

---
layout: post
title: Exploring OAuth-Protected APIs
---

From time to time I need to debug OAuth-protected APIs, checking response
headers and examining XML and JSON payloads. `curl` generally rocks for this
sort of thing, but when the APIs in question are protected with OAuth, things
break down. Likewise for benchmarking (`ab`, `httperf`, etc.) and
exploration--isn't it nice to browse APIs that return XML in Firefox?

This needn't to be the case.

## Enter `oauth-proxy`

This is why I wrote
[`oauth-proxy`](https://github.com/mojodna/oauth-proxy). It does what it
says on the tin: it acts a proxy server that transparently adds OAuth headers
to requests.

There are 2 steps to using it. First, install it:

```bash
easy_install oauth-proxy
```

Then, start it:

```bash
$ oauth-proxy \
    --consumer-key <consumer key> \
    --consumer-secret <consumer secret> \
    [--token <token>] \
    [--token-secret <token secret>] \
    [-p <proxy port>] \
    [--ssl]
```

If you're accessing a resource that only requires 2-legged OAuth, you can omit
`--token` and `--token-secret`. The proxy port defaults to `8001`, and `--ssl`
is used if you're proxying connections to a provider that requires SSL (Fire
Eagle, for example).

Once it's been started, use `curl` to make requests through it:

```bash
curl -x localhost:8001 http://host.name/path
```

You can also benchmark your APIs through it using ApacheBench (`ab`, as it
includes support for HTTP proxies). Note that you are introducing additional
overhead by proxying the request, so your numbers may be a bit off.

```bash
ab -X localhost:8001 http://host.name/path
```

Firefox (and browsers in general) supports HTTP proxies, so you can add a
"Manual Proxy Configuration" and pass requests through `oauth-proxy` to
explore APIs in the comfort of your favorite browser. By default, all requests
that Firefox makes will go through the proxy and be signed, which may confuse
other websites you visit (and will inadvertently reveal your consumer key and
access token but not the corresponding secrets).

### Access Tokens Sold Separately

If you're accessing a resource that requires 3-legged OAuth, you'll need a
token. You may already have one, but if you don't, you can use the [OAuth
library for Ruby](https://github.com/mojodna/oauth) to obtain one.

First, install the gem (0.3.5 is current as of this writing):

```bash
sudo gem install oauth
```

Then, trigger the authorization process from the command-line:

```bash
$ oauth \
    --consumer-key <consumer key> \
    --consumer-secret <consumer secret> \
    --access-token-url http://host.name/path/to/access_token \
    --authorize-url http://host.name/path/to/authorize \
    --request-token-url http://host.name/path/to/request_token \
    authorize
```

Follow the prompts, and voilà, an access token and secret that you can use
with `oauth-proxy`.

### A Concrete Example

Twitter's popular, right? Let's use that.

First, [register an application](https://twitter.com/apps/new) to get a
consumer key and secret. I registered as a "client" application, since the
command-line still doesn't have a callback url.

Once that's done, you'll get a set of credentials that can be used to initiate
the authorization process.

Let's authorize.

```bash
$ oauth \
  --consumer-key <consumer key> \
  --consumer-secret <consumer secret> \
  --access-token-url https://twitter.com/oauth/access_token \
  --authorize-url https://twitter.com/oauth/authorize \
  --request-token-url https://twitter.com/oauth/request_token \
  authorize
```

After following the prompts, you'll get something back that looks like this:

```yaml
oauth_token_secret: [redacted]
oauth_token: [redacted]
user_id: [redacted]
screen_name: [redacted]
```

You can then use those values to start the OAuth proxy:

```bash
$ oauth-proxy \
    --consumer-key <consumer key> \
    --consumer-secret <consumer secret> \
    --token <access token> \
    --token-secret <token secret>
```

Now we're set. Let's go exploring:

```bash
$ curl -sx http://localhost:8001 \
    https://twitter.com/statuses/friends_timeline.json | \
    jsonpretty | pygmentize -l js
```

You'll get exactly what you're expecting **and** you'll be using OAuth (this
is a partially contrived example since Twitter still supports HTTP Base Auth).

([`jsonpretty`](https://github.com/nicksieger/jsonpretty) rocks. `pygmentize`
(`easy install pygments`) makes it easier to make sense of the chaos.)

That's all. I use this stuff all the time and can't imagine debugging APIs
without it.

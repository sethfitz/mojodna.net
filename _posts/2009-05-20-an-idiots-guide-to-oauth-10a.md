---
layout: post
title: An Idiot's Guide to OAuth 1.0a
---

## {{ page.title }}

I'm lazy. I don't usually enjoy re-reading things I've already read before
(Matt Ruff and Neil Stephenson books are an exception). So, as a service to
all 3 of my readers, I'll summarize the changes to the
[OAuth](http://oauth.net/) specification for [1.0a (draft
3)](http://oauth.googlecode.com/svn/spec/core/1.0a/drafts/3/oauth-core-1_0a.html)
as I understand them. Finding changes in a large document is a pain--you have
better things to do with your time. Embrace your inner ignorance and leave
responsibility to the wind.

As an added bonus, I'll demonstrate how to [update consumer and provider code
using the Ruby
library](/2009/05/20/updating-ruby-consumers-and-providers-to-oauth-10a.html).

### What Happened?

[Much](http://www.readwriteweb.com/archives/how_the_oauth_security_battle_was_won_open_web_sty.php)
has been written about this
[elsewhere](http://www.hueniverse.com/hueniverse/2009/04/explaining-the-oauth-session-fixation-attack.html),
so I'll be brief. A [_session fixation_ attack was
discovered](http://oauth.net/advisories/2009-1) a little over a month ago.
Essentially, it affixes **your** sessions to someone else's. Imagine burrs or
inverted balls of duct tape with little teeny messages (on grains of rice)
attached to them.

Anyway. It was bad. It was one of those things that once you've seen, it's
impossible to un-see. There was no straightforward fix that could be deployed,
so you started seeing lots of BIG ANGRY warning notices explaining that your
car might be repossessed if you were bold enough to continue.

The longer-term solution was to [change the
specification](http://oauth.googlecode.com/svn/spec/core/1.0a/drafts/3/oauth-core-1_0a.html),
get providers on-board to change their code, and finally to reach
out to developers to update their client applications. All so the world
doesn't implode next time you turn right. DON'T TURN RIGHT. Ok?

### So, What Changed?

1. Callbacks (to your site or application) have been supported in various
   forms (with varying restrictions), but they have always been parameters
   passed to the Service Provider's authorization page. Instead, the
   `oauth_callback` parameter is now part of the Request Token phase. If your
   client cannot accept callbacks, the value **MUST** be `oob`. SPs use this
   to determine whether a client supports 1.0a.

2. `oauth_callback_confirmed` will be present (indeed, **MUST** according to
   the spec) when Service Providers supporting 1.0a issue a Request Token.
   (e.g. `oauth_token=asdf&oauth_token_secret=qwerty&oauth_callback_confirmed=true`)
   Clients can use this to determine whether a server supports 1.0a.

3. An `oauth_verifier` parameter is provided to the client either in the
   pre-configured callback URL or through the fingers of your users (the
   aforementioned `oob` ("out of band") mechanism). This value **MUST** be
   included when exchanging Request Tokens for Access Tokens.

The changes to the spec are limited to the Request Token ➡ Access Token
exchange, so once you have an Access Token, everything should behave as it did
before. For this reason, clients that only implement 2-legged OAuth are
unaffected.

[Section 11.14. Cross-Site Request Forgery
(CSRF)](http://oauth.googlecode.com/svn/spec/core/1.0a/drafts/3/oauth-core-1_0a.html#anchor38)
is also worth reading (and understanding) in order to further secure the use
of callback URLs.

### Services Supporting OAuth 1.0a

At the time of this writing, the only service provider I'm aware of that
supports 1.0a is
[Yahoo!](http://developer.yahoo.net/blog/archives/2009/05/oauth_update_3.html).
This doesn't include Fire Eagle (unless you include my laptop), although we
intend for this to change in the next couple weeks. Google's OAuth endpoint
should support 1.0a soon, but I've yet to see any confirmation.

---
layout: post
title: Updating Ruby Consumers and Providers to OAuth 1.0a
---

## {{ page.title }}

In a previous post, I did a [quick run-through of the changes that were
introduced in OAuth
1.0a](/2009/05/20/updating-ruby-consumers-and-providers-to-oauth-10a.html).
As promised, here's a rough guide to updating Ruby Consumers and Providers to
1.0a.  Don't mind the pseudo code.

### Updating Ruby OAuth Consumers to 1.0a

In order for things to work properly, you'll need to use a version of the
OAuth gem that's at least _0.3.4.1_ (0.3.5 was released on 6/3/09). To install
it and check the version number:

{% highlight bash %}
$ sudo gem install oauth
$ oauth --version
{% endhighlight %}

Authorization code that once looked like this:
 
{% highlight ruby %}
request_token = consumer.get_request_token
puts "Please visit the following URL to authorize this application:"
puts request_token.authorize_url(:oauth_callback => callback_url)
# wait for input
gets
access_token = request_token.get_access_token
{% endhighlight %}
 
Should now look like this:

{% highlight ruby %}
request_token = consumer.get_request_token(:oauth_callback => callback_url)
puts "Please visit the following URL to authorize this application:"
puts request_token.authorize_url
# wait for input
puts "What's the value of `oauth_verifier`?"
oauth_verifier = gets.chomp
# `oauth_verifier` is extracted from the expanded callback URL or was displayed to the user
access_token = request_token.get_access_token(:oauth_verifier => oauth_verifier)
{% endhighlight %}

You can detect whether a Service Provider supports 1.0a:

{% highlight ruby %}
request_token = consumer.get_request_token
puts "OAuth 1.0a detected" if request_token.callback_confirmed?
{% endhighlight %}

### Updating Ruby OAuth Providers to 1.0a

As with the updates to consumer applications, you'll need to be running at
least _0.3.4.1_. For the sake of simplicity (and additional laziness on my
part), I'll assume OAuth verification is baked into your Rails app rather than
as Rack middleware (where it probably belongs).

You'll need to add a pair of columns to your `oauth_request_tokens` table (or
whatever it's called): `callback` and `verifier`.

#### Accepting `oauth_callback` During the Request Token Phase

The first step to supporting OAuth 1.0a is to accept `oauth_token` parameters when issuing Request Tokens.  To do this, you'll need to make the `OAuth::RequestProxy::ActionControllerRequest` available to methods that run later in a request's lifecycle:

{% highlight ruby %}
def verify_oauth_signature
  valid = OAuth::Signature.verify(request) do |request_proxy|
    # make the request proxy available outside this block
    @_request_proxy = request_proxy
    
    # proceed normally...
  end
end

# accessor for the request proxy
def oauth_request_proxy
  @_request_proxy
end
{% endhighlight %}

Once this is set up, you'll need to modify your `request_token` method to associate the `oauth_callback` parameter with your Request token and set `oauth_callback_confirmed` to _true_:

{% highlight ruby %}
def request_token
  request_token = new_request_token
   # request_proxy provides unified interface to params + headers
  request_token.callback = request_proxy.oauth_callback
  request_token.save
  
  render :text => "oauth_token=#{request_token.token}&" \
                  "oauth_token_secret=#{request_token.secret}&" \
                  "oauth_callback_confirmed=true"
end
{% endhighlight %}

#### Generating An `oauth_verifier` During the Authorization Phase

In addition to validating the Request Token during the authorization phase,
you'll want to generate an `oauth_verifier` value and return it to the
application via the pre-registered callback url (or display it to the user and
instruct them to enter it into their application).

{% highlight ruby %}
def authorize
  # display the authorization page
  
  render and return unless request.post?

  # validate the token

  request_token = find_request_token(params[:oauth_token])
  request_token.validated = true
  # generate a verification code
  request_token.verifier = generate_verifier
  request_token.save
  
  if request_token.callback?
    # this was previously params[:oauth_callback]
    redirect_to request_token.callback + "?oauth_verifier=#{request_token.verifier}"
  else
    @verifier = request_token.verifier
    render # display the verification code to the user
  end
end
{% endhighlight %}

#### Verifying Access Token Exchanges

When exchanging a Request Token for an Access Token, you need to confirm that
the verification code provided by the consumer matches the one on file.

{% highlight ruby %}
def access_token
  # this is a correctly signed request: oauth_token has already been loaded

  # compare the verifier from the request proxy to the one we generated
  if oauth_token.verifier == request_proxy.oauth_verifier
    # exchange the request token for an access token
    access_token = oauth_token.exchange
    render :text => "oauth_token=#{access_token.token}&" \
                    "oauth_token_secret=#{access_token.secret}"
  else
    raise OAuth::InvalidVerifier
  end
end
{% endhighlight %}

### Summary

Obviously, there are cleaner ways to do this, but they're presumably very
specific to individual codebases. If you have questions, check out the
[oauth-ruby](http://groups.google.com/group/oauth-ruby) mailing list.
Otherwise, patches can be submitted against
[http://github.com/mojodna/oauth/tree/mergeable](http://github.com/mojodna/oauth/tree/mergeable).

Good luck!

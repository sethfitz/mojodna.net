---
layout: post
title: Teach Capistrano to Deploy From a Tag or Branch
---

## {{ page.title }}

There comes a time in the life of many an application where it becomes more or
less stable. And once it becomes stable, it also becomes boring because the
changes that a developer really wants to make are bound to make it unstable,
and thus unsuitable for deployment.

An oft-used approach to this situation is to create a stable maintenance
branch (i.e. `application/branches/1.0`) and create tags for point releases
(i.e. `application/tags/1.0.6`), continuing on the trunk with potentially
destabilizing work.

Out of the box, Capistrano only supports deploying from the tip of the trunk.
The snippet below demonstrates how to deploy from a branch (to a QA or staging
environment) or tag (releases to production should **always** have tags).
Stick it in your `config/deploy.rb`.

{% highlight ruby %}
set :base_repository, "http://svn.mojodna.net/repository/#{application}"
if variables[:tag]
  set :repository, "#{base_repository}/tags/#{variables[:tag]}"
elsif variables[:branch]
  set :repository, "#{base_repository}/branches/#{variables[:branch]}"
else
  set :repository, "#{base_repository}/trunk"
end
{% endhighlight %}

With this modification in place, you can now deploy from a branch:

{% highlight bash %}
$ RAILS_ENV=qa cap deploy -Sbranch=1.0
{% endhighlight %}

Or from a tag:

{% highlight bash %}
$ RAILS_ENV=production cap deploy -Stag=1.0.6
{% endhighlight %}

Go forth and revel in your instability!

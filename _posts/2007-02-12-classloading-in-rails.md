---
layout: post
title: Classloading in Rails
---

## {{ page.title }}

Occasionally, I see code similar to the following used as a shortcut to load
all model objects. It's usually in a Rake task or somewhere that follows a
"global require" by looping through all available objects and doing something
with them. It's simple, straightforward, and a logical follow up to shorthand
like `["post", "user"].each { |m| require m }`. However, it often sits out
there like a dormant volcano, with a wide variety of unpredictable behavior
waiting to erupt.

In our case, we'd been using said snippet to help test out
[memcached](http://www.danga.com/memcached/); we would occasionally be handed
serialized objects of unrecognizable types; the source of the problem turned
out to be that the object's class definition had not yet been loaded. We also
discovered that finders in intermediate subclasses (we use <abbr title="Single
Table Inheritance">STI</abbr> extensively) would occasionally fail to find
instances of subclasses, again because the subclasses had not been loaded (and
the intermediate subclass was unable to provide a complete list of its
subclasses).

{% highlight ruby %}
# load all models explicitly
Dir.glob(File.join(RAILS_ROOT,"app","models","*.rb")).each do |rbfile|
  require rbfile
end
{% endhighlight %}

There are a couple of problems with this approach. It doesn't guarantee that a
model will only be loaded once--classes may have already been loaded through
some external mechanism. Alternately, dependencies may be loaded while loading
a specific class. In both cases, the above code may cause classes to be loaded
multiple times (which can cause bizarre behavior). It also doesn't handle
namespaced models correctly.

{% highlight ruby %}
# force loading (but not reloading) of all models by saying their name
# Adapted from PragDave's Annotate Models plugin.
model_path = File.join(RAILS_ROOT, "app", "models")
Dir.glob(File.join(model_path,"**","*.rb")).each do |m|
  class_name = m.sub(model_path + File::SEPARATOR, '').sub(/\\.rb$/, '').camelize
  klass = class_name.split('::').inject(Object){ |klass,part| klass.const_get(part) } rescue nil
end
{% endhighlight %}

This approach is considerably better; it supports namespaced models and defers
the actual classloading to Rails (note the lack of an explicit `require`),
which prevents classes from being loaded multiple times.

Anything to avoid time-eating debugging sessions, like the one described in
[Rails Sometimes Eats Class Load
Errors](http://blog.duncandavidson.com/2006/11/rails_sometimes.html). In our
case, it had to do with
[ActiveMessaging](http://code.google.com/p/activemessaging/) and classes
silently failing to load outside the development environment. The fix wound up
being requiring `config/messaging.rb` before the block above. The lesson
learned is to make sure that any dependent resources for models are loaded
**first** and to look for them if things are acting strangely.

**Update:** The above primarily relevant to Rails 1.1. 1.2 exhibits similar
behavior, but it gets even weirder, as the class loading mechanism was
rewritten. There, you'll find that STI works properly the first time (because
all classes have been explicitly loaded), but if `cache_classes` is on (the
default in development mode), they'll be unloaded after the first request and
thus will fail to work on subsequent requests.

Our rather hackish solution is to trigger a `before_filter` in
`ApplicationController` when `cache_classes` is determined to be on (when
`Dependencies.mechanism == :load`):

{% highlight ruby %}
before_filter do
  model_path = File.join(RAILS_ROOT, "app", "models")
  Dir.glob(File.join(model_path,"**","*.rb")).each do |m|
    class_name = m.sub(model_path + File::SEPARATOR,'').sub(/\\.rb$/,'').camelize
    klass = class_name.split('::').inject(Object){ |klass,part| klass.const_get(part) } rescue nil
  end
end if Dependencies.mechanism == :load
{% endhighlight %}

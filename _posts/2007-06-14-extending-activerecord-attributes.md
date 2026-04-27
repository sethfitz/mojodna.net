---
layout: post
title: Extending ActiveRecord Attributes
---

## {{ page.title }}

David Black came to speak at the [Boston Ruby
Group](http://boston.rubygroup.org/) on Tuesday (along with Zed Shaw, making
it the most star-studded event since I started going). It was in one of the
lecture halls at the Harvard Science Center (which, if you follow the pattern
of every single other building on campus, is named after the "Science Center"
family; seems like it should be Merrill, or Morrill, or something
instead--here's your chance). I was expecting stand-up comedy, which turned
out to be an unreasonable expectation because it was in lecture hall A, not C
(which is where HSUCS (a group of stand-up comedians at Harvard) has had
events in the past). But I digress.

David's talk was about "Per Object Behavior in Ruby" and about treating it as
a prototype language (a logical follow-up to Dave Thomas' RailsConf keynote;
he didn't disappoint and provided classless code (except for the tests; that
would have been a nice touch)). I won't go much into the substance of the
talk, except to say that he managed to clarify the meaning and use of an
object's "singleton class" / "eigenclass" as well as further emphasizing that
class != type, but that a class is merely a template from which new objects
spring. He encouraged people to take advantage of Ruby's ability to extend
individual instances of objects with methods (generally via modules), as
that's a considerable part of what makes Ruby Ruby.

I was reminded that I had written some ActiveRecord code this spring that
allows "primitive" (`String`, `Fixnum`) attributes of AR objects to be
embellished by extending the attributes' objects before returning them from
the containing object.

In our case, we had a notion of `FormattedText` objects, which were
essentially `String`s that could contain HTML. Unfiltered HTML, as it turned
out. Rather than filtering during the input stage, we decided that we would
store what the user provided and leave it to the output stage to handle the
filtering. Instead of using a helper method in each and every case (with the
downside of having to remember to use it), I decided that the filtering
functionality would fit better within the object (so it would be used
appropriately in the majority case without any extra thought). In this case,
by overriding `String#to_s`.

{% highlight ruby %}
module FormattedText
  def to_s
    # filter and output
  end
end
{% endhighlight %}

The next step was making sure that only attributes known to contain formatted
text were extended by `FormattedText` (and that the internal representation
remained untouched, so that the filtered version wouldn't be saved back to the
database). A side-effect of this is that changing the value that was returned
and saving the object will not save the new value back to the database; to get
around this, you'll need to set the value on the AR object itself.

{% highlight ruby %}
# Quick and dirty monkey-patch (should work with 1.1.x+)
class ActiveRecord::Base
  # Attribute extension
  cattr_accessor :extended_attributes
  @@extended_attributes = {}

  class << self
    # create the "extends" declaration
    def extends(attr_name, options)
      extended_attributes[attr_name.to_sym] = options[:with]
    end
  end

  alias_method :define_read_method_without_extends, :define_read_method
  def define_read_method_with_extends(symbol, attr_name, column)
    unless self.class.read_methods.include?(attr_name) ||
           self.class.extended_attributes.keys.include?(attr_name.to_sym)
      define_read_method_without_enhances(symbol, attr_name, column)
    else
      old_method_name = "#{symbol}_without_extends"
      define_read_method_without_extends(old_method_name.to_sym, attr_name, column)
      evaluate_read_method attr_name, "def #{symbol}; enhance(#{old_method_name}, '#{attr_name}'); end"
    end
  end
  alias_method :define_read_method, :define_read_method_with_extends

  # Override read_attribute for first call (pre-edge)
  # or when AR::Base.generate_read_methods = false
  alias_method :read_attribute_without_extends, :read_attribute
  def read_attribute_with_extends(attr_name)
    enhance(read_attribute_without_extends(attr_name), attr_name)
  end
  alias_method :read_attribute, :read_attribute_with_extends

  private

  # Enhance the attribute as appropriate
  def enhance(value, attr_name)
    mod = self.class.extended_attributes[attr_name.to_sym]
    if mod && !value.nil?
      value.dup.extend(mod)
    else
      value
    end
  end
end
{% endhighlight %}

An alternate way to implement this pattern would have been to use
`composed_of` and to create a `FormattedText` class that extend `String`. That
may be better for performance reasons (as it seems that it would simplify
method lookup), but strikes me as being slightly less Rubylike.

What do you think?
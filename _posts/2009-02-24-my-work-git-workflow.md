---
layout: post
title: My (work) Git Workflow
---

## {{ page.title }}

**The problem**: You want to track multiple patchsets against an upstream
Subversion repository easily.

**The solution**: Use `git-svn` to track it and create topic branches for
local changes.

[Jump here for my actual workflow](#the_sizzle)

### A Not-So-Brief Introduction (with code!)

I started using [`git`](http://git-scm.com/) and
[`git-svn`](http://www.kernel.org/pub/software/scm/git/docs/git-svn.html) a
little over a year ago. I was an Amtrak regular at the time, so the ability to
make offline commits seemed helpful. Plus, it was shiny, and I'd seen a demo
of [GitHub](http://github.com/), so I had a hunch that it was going to be big.

One day, I sat down over lunch and watched most of [Linus Torvalds' git talk
at Google](http://www.youtube.com/watch?v=4XpnKHJAok8). Until then, I hadn't
really considered DVCSes, staying in my comfortable little Subversion world,
branching out to `cvs` and `bzr` as necessary. I don't really remember what I
got out of the talk, but somehow it inspired me to start reading up on how
`git` could be used with `svn`, much like `svk`.

`git-svn` made its debut performance on our team's IRC channel about a month
later; I had been doing some major refactoring on a local git branch with lots
of commits (squashing commits was mystery to be discovered later) and the time
had come to merge it into *trunk*. The merge went fine (lucky, I guess), so I
went for a `git svn dcommit`. And spammed the IRC channel for the next 30
seconds or so.

Flash forward to the following winter and new (remote) contributors to our
project. It was time to start doing legitimate code reviews, in part to get
the new folks up to speed with the code-base.

In the process of setting up [Review Board](http://www.review-board.org/), I
discovered that it doesn't play well with diffs generated with `git`. Bummer.
They're nice. I spent some time poking around RB's source tree to see why that
was the case. Long story short, no dice. However, on one of the message boards
where the problem had been raised (no resolution, natch), I saw a snippet to
transform `git` diffs into `svn` diffs, revision numbers and all. Bingo. After
fiddling with it for a while, I ended up with the following, which has been
working well. \[Edit: updated gist with a more flexible version from Mike
Pearce's [git-svn and
ReviewBoard](http://blog.mikepearce.net/2010/09/16/git-svn-and-reviewboard/).\]

<script src="http://gist.github.com/44537.js">
// nothing here
</script>

Add the following to your `~/.gitconfig` to enable `git svn-diff`. Awesome. It
even looks like it belongs there. (`git-svn-diff` must be in your `PATH`.)

{% highlight ini %}
# ~/.gitconfig
[alias]
  svn-diff = !git-svn-diff
{% endhighlight %}

<div class="caption">add <code>git svn-diff</code> as an alias for
<code>git-svn-diff</code></div>

#### Bonus Points

Here are the relevant pieces of my `~/.bashrc` to get tab completion and a
colorized prompt that includes `git branch` information in it:

<script src="http://gist.github.com/69960.js">
// nothing here
</script>

### The Sizzle

This is essentially the `git-svn` variation of [Josh Susser's pure `git`
workflow](http://blog.hasmanythrough.com/2008/12/18/agile-git-and-the-story-branch-pattern).

#### The Setup

Clone the target Subversion repository:

{% highlight bash %}
$ git svn clone svn+ssh://svn.host/path/to/repo -s
{% endhighlight %}

<div class="caption">assuming a standard Subversion layout</div>

Alternately, if you're planning on sharing topic branches with fellow
developers, have one person do the clone and pass it out (by copying it, to
retain Subversion metadata).

#### Fixing a Bug / Implementing a Feature

Make sure you're up-to-date:

{% highlight bash %}
[master] $ git svn rebase
{% endhighlight %}

Create a topic branch (I include a title to recognize it more easily) and
check it out:

{% highlight bash %}
[master] $ git checkout -b bug-42-title
{% endhighlight %}

Attempt a bug fix (write a test, make it pass):

{% highlight bash %}
[bug-42-title] $ ...
{% endhighlight %}

Check it in:

{% highlight bash %}
[bug-42-title] $ git commit -a
{% endhighlight %}

Generate a patch for review:

{% highlight bash %}
[bug-42-title] $ git svn-diff > bug-42-title.patch
{% endhighlight %}

<div class="caption">this will diff against the checked out trunk
revision</div>

Post it for review.

*Time passes... Your diff hasn't been reviewed, development continues...*

Update the tracking branch:

{% highlight bash %}
[master] $ git svn rebase
{% endhighlight %}

Rebase your topic branch against the current trunk:

{% highlight bash %}
[master] $ git checkout bug-42-title
[bug-42-title] $ git rebase master
[bug-42-title] $ # resolve conflicts; `git mergetool` is handy
{% endhighlight %}

Regenerate the patch:

{% highlight bash %}
[bug-42-title] $ git svn-diff > bug-42-title-2.patch
{% endhighlight %}

Post it for review.

*Time passes...  Your diff has been reviewed and been found wanting...*

Make changes to your topic branch:

{% highlight bash %}
[bug-42-title] $ ...
{% endhighlight %}

Check them in:

{% highlight bash %}
[bug-42-title] $ git commit -a
{% endhighlight %}

Regenerate the patch:

{% highlight bash %}
[bug-42-title] $ git svn-diff > bug-42-title-3.patch
{% endhighlight %}

Post it for review.

#### Landing a Reviewed Patch

You have a few options here.

You can apply the patch directly to the tracking branch:

{% highlight bash %}
[master] $ git apply bug-42-title-3.patch
[master] $ git commit -a
{% endhighlight %}

If you want to preserve history (i.e. multiple commits that tell a story),
update the tracking branch and rebase your topic branch against it before
merging:

{% highlight bash %}
[master] $ git svn rebase
[master] $ git checkout bug-42-title
[bug-42-title] $ git rebase master
[bug-42-title] $ # resolve conflicts
[bug-42-title] $ git checkout master
[master] $ git merge bug-42-title
{% endhighlight %}

If you want to get fancy (and remove your frustrated profanity), do an
interactive rebase on the topic branch before merging:

{% highlight bash %}
[bug-42-title] $ git rebase -i
[bug-42-title] $ git checkout master
[master] $ git merge bug-42-title
{% endhighlight %}

Whew. Almost done. You'll want to update the upstream Subversion repository,
lest you risk your hard work being wasted:

{% highlight bash %}
[master] $ git svn dcommit
{% endhighlight %}

<div class="caption">this will <code>git svn rebase</code> if necessary</div>

If you don't have write access to the upstream repository, submit the patch by
mail instead.

Finally, once the patch has been merged, you can clean up your local
repository by removing the topic branch:

{% highlight bash %}
[master] $ git branch -d bug-42-title
{% endhighlight %}

Topic branches needn't to be limited to your own bug-fixes. `git apply` is
quite liberal in what it understands, so you can grab diffs (from ReviewBoard,
for example) and apply them to new branches to try out uncommitted
functionality (or as an aid to the code reviewing process).

That's it! You can keep as many topic branches active as you want (or need
to), rebasing them against your tracking branch as necessary. I use this
approach for bugs, features, and exploratory refactoring that may never see
the light of day.

#### Working with Subversion Branches

Working with Subversion branches is remarkably straightforward, but it's
necessary to understand a few things about the repository layout and the
branches that `git-svn` sets up when it does the initial clone.

First, if you did a `git svn clone -s` against a Subversion repository with a
typical layout (`trunk`, `branches/<branch>`, `tags/<tag>`), a number of
remote Git branches will have been created: one for `trunk`, one for each
branch, and one for each tag (odd, but sensible given that Subversion doesn't
strictly **do** tags).

`git branch` will list local branches:

{% highlight bash %}
[master] $ git branch
  bug-42-title
* master
{% endhighlight %}

`git branch -r` will list Subversion branches (and tags):

{% highlight bash %}
[master] $ git branch -r
  stable-1.0
  tags/REL_1.0
  trunk
{% endhighlight %}

By default, your local `master` branch will be set up to track the remote
`trunk` branch. Instead of using `git pull` (in a pure Git workflow) to update
`trunk` to the current remote revision, use `git svn rebase`.

If you want to ensure that you have up-to-date versions of all Subversion
branches, use `git svn fetch` to load upstream commits. This has the
side-effect of causing `master` and `trunk` to be out-of-sync, so you'll have
to follow that with `git svn rebase` from the master branch.
[GitX](http://gitx.frim.nl/) will show you the current state of both local and
remote branches, and thus is immensely useful when attempting to determine
your current repository state.

In case you didn't fully grok that last paragraph, where you would have used
`git svn rebase` without branches, you should do the following (rebasing still
works, but your branches won't be up-to-date):

{% highlight bash %}
[master] $ git svn fetch
[master] $ git svn rebase
{% endhighlight %}

`git svn rebase` in this case is the equivalent to `git rebase trunk`, as
`trunk` is the "SVN parent of the current HEAD" (from `git help svn`).

`git svn dcommit` will use `svn` to commit outstanding changes upstream
(again, to the "SVN parent of the current HEAD"). The upstream branch in
question depends on the Subversion branch that your current branch is
tracking, usually using `git branch --track <local> <remote>`.

Subversion branches and "tags" can also be created with `git-svn`. For
example, to tag and branch a 1.1 release:

{% highlight bash %}
[master] $ git svn branch -m "branching for 1.1" stable-1.1
[master] $ git svn branch -m "1.1 release" -t REL_1.1
[master] $ git branch -r
  stable-1.0
  stable-1.1
  tags/REL_1.0
  tags/REL_1.1
  trunk
{% endhighlight %}

Commit messages are necessary, as branching in Subversion is the equivalent to
creating a changeset where a directory is copied.

Now that the branch has been created upstream, create a local tracking branch
such that `git svn dcommit` will commit to the correct upstream branch.

{% highlight bash %}
[master] $ git branch --track stable-1.1 stable-1.1
[master] $ git checkout stable-1.1
[stable-1.1] $
{% endhighlight %}

#### Extra Credit

Convert Subversion "tags" into proper Git tags:

{% highlight bash %}
#!/bin/sh
#
# git-svn-convert-tags
# Convert Subversion "tags" into Git tags
for tag in `git branch -r | grep "  tags/" | sed 's/  tags\///'`; do
  git tag $tag refs/remotes/tags/$tag
done
{% endhighlight %}

Add the following to your `~/.gitconfig` to enable `git svn-convert-tags`.
(`git-svn-convert-tags` must be in your `PATH`.)

{% highlight ini %}
# ~/.gitconfig
[alias]
  svn-convert-tags = !git-svn-convert-tags
{% endhighlight %}

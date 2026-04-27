---
layout: post
title: My (public) Git Workflow
---

## {{ page.title }}

**The problem**: You want to be an effective contributor to a public project
that's using Git.

**The solution**: Follow conventions and keep clean branches to make them
easier to merge.

### Let's Go

For your own projects, it doesn't really matter what you do to publish and
maintain your code, at least until other people start forking and attempting
to hack on your stuff. In any case, you should keep things simple. Use topic
branches for particular features or refactoring if you want, but no big deal.

#### Determining "Active" and "Authoritative" Forks

[GitHub's search](http://github.com/blog/309-new-and-improved-search) attempts
to surface active projects by displaying the number of forks, number of
watchers, and recent activity, but it doesn't tell the full story. The "root"
of the fork tree (which isn't really a tree, but is *kinda* useful to think of
that way) isn't necessarily the current focus of activity. Someone may have
published a project and lost interest, but a community may have formed around
one of the forks.

Alternately, a project may have been imported from Subversion by a wannabe
contributor prior to the original author joining GitHub and applying
community-created patches to his or her own fork (which, at this point, isn't
the root of the fork tree).

If there are a relatively low number of forks (say, one or two), you can
(mostly) assume that the fork with the most activity is authoritative. Other
contributors, with forks that come and go or that are generally out of date,
can be considered "outsiders."

For projects with a larger number of forks, there may be multiple authorities
(and potentially even multiple development directions), with many outsiders
periodically contributing patches.

All of this means that you, as a potential contributor, need to do some
additional research to determine which fork (or forks) is "active" and/or
"authoritative". They may not be one and the same; the "authoritative" fork
may focus on stability; you may need bleeding edge features developed by an
"authoritative" member of the community instead.

GitHub's [Network
Graph](http://github.com/blog/39-say-hello-to-the-network-graph-visualizer) is
a great tool for this purpose. From the interface, you can see which forks
have been the most active (hint: more &bull;'s), most recently active
(&bull;'s further right), or have had the most merges (more ⤴'s). Those don't
tell the full story, so you'll want to mouse-over individual &bull;'s to see
who wrote the patch (and who committed it). That will help distinguish between
the forks where the patches originated and where they've merely been pulled
in. You'll also get a sense of the number and names of people working on a
project.

#### Some Rules of Thumb

When hacking on other peoples' stuff, your eventual goal is (probably) to get
those changes applied. Here are a few tips to make life easier for everyone
involved.

**First rule of thumb**: merge from authoritative contributors, cherry pick
from outsiders.

By merging (e.g. `git merge user/master`) from authoritative contributors, it
becomes easier for them to apply your changes if and when they deem them fit.
Merging from outsiders may force the authorities into accepting patches (or
series) that they may not be ready for (as those branches may include changes
unrelated to what you were working on).

GitHub's Fork Queue cherry picks (e.g. `git cherry-pick 469df8`) commits by
default, so that's a good way to get your tree in order before adding your own
changes. If there are changes to your fork's parent, you can [fast forward
your fork](http://github.com/blog/266-fast-forward-your-fork) before starting
work.

**Second rule of thumb**: keep your changes easily apply-able to the
authoritative repository.

For a single line of development, this is easy: rebase against the
authoritative *master* branch whenever possible. Feel free to rewrite history
(i.e. `git push -f`) as long as you're confident no one is treating you as
authoritative.

If others *are* treating you as an authoritative source, create a separate
branch that gets periodically rebased and make it clear that it's not suitable
for tracking. Others' changes will eventually need to be rebased against those
changes, but probably not until your changes have been applied by a real
authoritative contributor.

For changes that do many things, this means keeping multiple branches active.
I usually use a branch per feature, plus a separate branch for general
bugfixes and documentation. For minor changes, all branches can diverge from a
common commit (usually the tip of the authoritative repository's *master*
branch).

For more drastic changes, you'll need to decide which is either the most
important feature or the least controversial change. Use that as the first
patch series and rebase it against the authoritative repository's *HEAD*.
Rebase subsequent patch series against the next most important (or least
controversial).

Write down the order in which your branches should be merged. You can use your
project wiki or put it at the top of the `README` in your *master* branch.
([See my fork of *xmpp4r* to see how I've done
it.](http://github.com/mojodna/xmpp4r/blob/06ec50260555ba242880dc2c69229ea5f8ff811e/README.rdoc))
At this point, your *master* branch is just the default view of your fork and
shouldn't be considerably different from the branch of the authoritative copy
you're tracking (see the exception below).

In some cases, you'll have branches that aren't quite ready for prime-time.
Treat them the same as branches that are, but don't make apply-able branches
dependent on them (i.e. they should always be the last changes to be applied).
Include them in the summary in your `README`, but make it clear that they're
not ready yet.

**Third rule of thumb**: reset your history to match an authoritative
repository's history if their content is the same (or essentially the same).

If your history frequently diverges from an authoritative repository's
history, you're going to have more trouble applying others' changes and
synchronizing with authoritative repositories.

The simplest way is to delete your repository and re-fork. If you have minor
changes, generate a diff to apply once you've re-forked.

#### An Exception

Because GitHub will only build gems for changes on the *master* branch, if you
have changes that you want to publish (prepared neatly in topic branches, as
above), you'll need to break the rules somewhat.

To handle this scenario, start with your *master* branch matching the
authoritative branch you're tracking, then merge branches like the owner of
the authoritative branch would (this has the helpful side-effect of
discovering whether your changes will apply cleanly).

The tip of your *master* should always contain the most up-to-date gemspec (in
order to trigger GitHub's building and publishing of your fork) as well as a
`README` that contains information on the state of your repository (including
branches, as above, but also information about how you're treating the
*master* branch).

### Maintaining a Project

Over the last couple months, I've become one of the authoritative forks for
the [OAuth gem](http://github.com/mojodna/oauth), indirectly resulting in this
document. I've attempted to be consistent in the management of my fork,
including publishing periodic releases for others to test functionality, but
it became clear that my methods weren't as transparent as they ought to be.

As a maintainer (or authoritative fork), you frequently find the need to merge
in work from other developers. GitHub's [Fork
Queue](http://github.com/blog/270-the-fork-queue) is excellent for this, but
it's not the last word.

The Fork Queue is perfect for merging individual commits, but when someone
submits a patch series, it's time to make a decision: you can *cherry-pick*
(e.g. `git cherry-pick 469df8`) all of their commits (which is what the Fork
Queue does behind the scenes)--retaining authorship but setting the
*committer* field to yourself--or you can pull their branch down and perform a
*merge* (e.g. `git merge user/master`), retaining both *author* and
*committer*.

Cherry picking commits is easier--unless you want/need to make adjustments to
them (in which case the SHAs would change anyway)--and results in linear
history (no merges) with the downside of having repetitive commits (with
different *committer*s) across the project network, thus confusing GitHub's
Network Graph (or anything that displays the history of multiple branches) and
making it more difficult to find un-applied patches (as the same patch may
exist with multiple SHAs).

Merging changes locally is more difficult, but the [github
gem](http://github.com/defunkt/github-gem) makes it easier by pulling in the
entire patch universe with `gh network fetch`. Once that's been done, the
combination of `gh network commits`, [GitX](http://gitx.frim.nl/), and the
Network Graph make it relatively easy to identify commits ripe for picking.

An advantage of cherry picking is that you have the freedom to amend (`git
commit --amend`) commits before pushing them out as part of your tree. This is
a great opportunity to clean things up to match local coding standards (that
should already be the case, but YMMV) and to add additional context to the
commit message.

*Note:* You can achieve the same effect as amending commits by using `git
format-patch -1 469df8` to create a patch, applying it with `git apply`,
pausing to clean it up, and committing it with `git commit -c 469df8`. [git
ready](http://gitready.com/) has a good article on [picking out individual
commits](http://gitready.com/intermediate/2009/03/04/pick-out-individual-commits.html).

The main problem with cherry picking becomes more acute when there are
multiple authoritative forks (which should maintain a consistent public state)
constantly passing work back and forth. If the participants periodically merge
others' work, you end up with a number of merge commits, but a relatively
coherent history. If one or more participants choose to cherry pick commits
instead, merging their branches back will include repeated commits with
different SHAs and *committer* fields. The resultant state of the tree is
fine, but the history gets somewhat polluted and becomes more difficult to
follow.

This can be mitigated by sending patches via email (or any mechanism by which
public repositories don't change) and repeatedly munging history locally, but
that's often not an option, given the level of coordination required.

### Aside: Complexity and / or Maturity

I used to see complicated Network Graphs (with lots of merging and branching)
as a sign of project activity, but now I consider it more as a measure of
contributors' comfort with `git` (as individual contributors may be
responsible for multiple branches). I believe that the main reason that
projects end up with complicated history is due to (relatively) limited
coordination between collaborator and maintainer; if I had to guess, I would
expect closed projects using Git to have much more linear histories.

Ultimately, I think complicated histories are a side-effect of Git's merging
prowess promoting and supporting the drive-by contributor model. However, as
powerful as Git is, coordination between collaborators still lessens the
burden on the person doing the merging, thus the above manifesto.

## Now What?

Get yourself out there, coding whatever and whenever, and contribute back.
You'll feel good and you will have made the world a little better, one patch
at a time.

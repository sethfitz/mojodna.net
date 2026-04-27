---
layout: post
title: "DIY Fusion Drives: A Data Point"
---

# DIY Fusion Drives: A Data Point

In light of Apple having announced new iMacs today, I thought I'd throw out
a data point to the internet.

tl;dr: I've used 2 DIY Fusion Drives on 2 different Macs for the past year,
they're awesome, but you should use a Samsung SSD (I have an 830 and an 840
Pro).

Since last year's [Fusion Drive
announcement](http://www.anandtech.com/show/6679/a-month-with-apples-fusion-drive)
(and subsequent ["reverse
engineering"](http://jollyjinx.tumblr.com/post/34638496292/fusion-drive-on-older-macs-yes-since-apple-has)),
I've been running 256MB SSD + 1TB HD Fusion drive setups on 2 Macs: a 2009 iMac
(with the SSD replacing the optical drive) and a 2012 Mac Mini (using the extra
bay after purchasing a second SATA cable).  It's been awesome, especially after
sorting the kinks out.  (No, no benchmarks, but it really does feel / act as
though it's an SSD-backed system, even when data needs to get shuffled around,
as in the case of processing a couple hundred gigs of GeoTIFFs.)

The kinks: I'd already upgraded the iMac with a 256GB Crucial M4 about a year
before, so I figured I would just back everything up and use that in
combination with the Apple-provided drive.  Bad plan.  I went through 2 M4s
(though probably not for the hardware problems they seemed to be manifesting)
before throwing in the towel and buying a Samsung SSD 840 Pro, which has been
completely problem-free since installing it.  When I bought the Mini, I also
bought a Samsung 830 at the same time, which has been trouble-free since the
start (Apple uses, or used Samsung 830s at one point, so this seemed like the
best choice).

With the M4s, large files (100GB+ VMware VMs) would spontaneously corrupt
(presumably the filesystem passed the ~256GB threshold) and no amount of
monkeying with Disk Utility could successfully repair it, ultimately
necessitating Time Machine restores on multiple occasions.  Things would be
peachy for a week or 2 and then, bam, time to reinstall.  No good.  One Crucial
rep I talked to when initiating an RMA suggested that the M4 wasn't getting
a chance to run its garbage collection routines, probably due to the I/O
patterns resulting from shifting data between disks.

Would I do it again?  Definitely, though the move to PCIe SSDs complicates the
matter a bit.  In the case of the Mini, it was borderline unusable (by my
standards, anyway) due to the I/O performance of the built-in 5400rpm drive,
even with an i7 and lots of RAM.  With the Fusion drive?  Incredibly pleasant
to use as my primary work machine for the last 9½ months.

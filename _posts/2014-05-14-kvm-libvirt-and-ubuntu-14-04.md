---
layout: post
title: "KVM, libvirt, and Ubuntu 14.04"
---

# KVM, libvirt, and Ubuntu 14.04

I recently upgraded one of the servers in the office to Ubuntu 14.04, the most
recent LTS release. While doing this, I decided that I would figure out a clean
way of managing virtual machines. This is what I found:

Canonical now publishes [Ubuntu cloud images](http://cloud-images.ubuntu.com/).
These match the official images that are used on EC2. It turns out that they
can also be used in a local environment, complete with the customizations that
`user-data` provide.

[`libvirt`](http://libvirt.org/) appears to be the cleanest abstraction of
KVM/QEMU, Xen, LXC, and others, so I took a stab at using that to manage my
VMs.

Installation was easy:

```bash
sudo apt-get install libvirt-bin
```

Creating VMs (well, importing existing images and running them) was another
matter. Over the last few years we've seen a proliferation of tools that
attempt to provision VMs without needing to create XML manifests (ultimately
culminating in OpenStack). `virt-install`, which comes with `libvirt` ended up
being the tool for me.

To start, I downloaded a qcow2 Ubuntu Cloud image into `libvirt`'s `images/`
directory:

```bash
curl -LO http://cloud-images.ubuntu.com/trusty/current/trusty-server-cloudimg-amd64-disk1.img
sudo cp trusty-server-cloudimg-amd64-disk1.img /var/lib/libvirt/images/
virsh pool-refresh default # tell libvirt to re-scan for new files
```

I also added an ethernet bridge device so that the VMs could co-exist on the
network with everything else in the office:

```bash
cat <<EOF | sudo tee -a /etc/network/interfaces
auto br0
iface br0 inet dhcp
  bridge_ports eth0
EOF
```

When booting one of the Ubuntu Cloud images on its own, it briefly hangs while
waiting for network connections to EC2's internal network that exposes
metadata. Rather than replicating their environment, the Cloud images have
a relatively [secret super
power](https://www.technovelty.org/linux/running-cloud-images-locally.html):
the ability to pull [`cloud-init`](http://cloudinit.readthedocs.org/en/latest/)
configurations off of a secondary mounted image.

To create an image containing a ``cloud-init` configuration, create 2 files:
`meta-data` and `user-data`. These are their minimal forms (`meta-data` appears
to be ignored / fails to set the hostname):

```bash
cat <<EOF > meta-data
instance-id: iid-local01;
local-hostname: ubuntu
EOF

cat <<EOF > user-data
#cloud-config
EOF
```

Next, write these into an ISO and copy it into `libvirt`'s `images/` directory:

```bash
genisoimage -output configuration.iso -volid cidata -joliet -rock user-data meta-data
sudo cp configuration.iso /var/lib/libvirt/images/
virsh pool-refresh default
```

With this in place, it's now possible to boot a VM and avoid the network wait.
This will create a new VM ("domain" in `libvirt` parlance) with 1G RAM, 1 vCPU,
and bridged networking:

```bash
virsh vol-clone --pool default trusty-server-cloudimg-amd64-disk1.img test.img

virt-install -r 1024 \
  -n test \
  --vcpus=1 \
  --autostart \
  --memballoon virtio \
  --network bridge=br0 \
  --boot hd \
  --disk vol=default/test.img,format=qcow2,bus=virtio \
  --disk vol=default/configuration.iso,bus=virtio

virsh list
```

To see the generated XML for this domain, run:

```bash
virsh dumpxml test
```

To stop it:

```bash
virsh destroy test
```

To remove it:

```bash
virsh undefine test
virsh vol-delete --pool default test.img
```

Now, since we have the power of `cloud-init`, we can modify the initial boot
configuration to do some initial provisioning. To do that, update `user-data`:

```bash
cat <<EOF > user-data
#cloud-config

# upgrade packages on startup
package_upgrade: true

# install git
packages:
  - git

# create a user
runcmd:
  - [ useradd, -c, Seth Fitzsimmons, -u, 1001, -G, sudo, -U, -M, -p, $5$FVJ1C48Rlhy/$GOidCu4a0qTmngqhFMGT7z/N.8nYTuXaaGzEDPhfIL., -s, /bin/bash, seth ]
EOF
```

`cloud-init` supports user creation since 0.7.0 (trusty comes with 0.7.5), but
it does not appear to work locally and I'd like to be able to re-use these
configurations with Ubuntu 12.04 images (which ship with `cloud-init 0.6.3), so
I'm doing the same thing by hand with `runcmd`.

So far (which hasn't been that long), this has been working well. One of the
next steps is to achieve a similar streamlined workflow for LXC / Docker,
similar to what [Mike wrote up about LXC and
Virtualbox](http://mike.teczno.com/notes/disposable-virtualbox-lxc-environments.html).

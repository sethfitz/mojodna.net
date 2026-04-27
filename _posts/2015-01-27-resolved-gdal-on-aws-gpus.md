---
layout: post
title: "Resolved: GDAL on AWS GPU Instances"
---

# Resolved: GDAL on AWS GPU Instances

_Cross-posted from http://openterrain.tumblr.com/post/109330474336/resolved-gdal-on-aws-gpu-instances_

Specifically, `g2.2xlarge` instances with Nvidia GRID K520 GPUs running Amazon Linux.

As we kicked off the [new Knight News
Grant](http://content.stamen.com/new_knight_grant_new_toner_new_infrastructure),
it was clear early on that we were going to be processing quite a lot of raster
data. Given that, I wanted to ensure that we'd be able to benefit from GDAL's
OpenCL-accelerated warping (for reprojection and scaling).

Ubuntu is typically my weapon of choice for these sorts of things, however
I wanted to minimize hardware-related compatibility problems, and Amazon
publishes an [Amazon Linux AMI with NVIDIA GRID GPU Driver](https://aws.amazon.com/marketplace/ordering?productId=d3fbf14b-243d-46e0-916c-82a8bf6955b4&ref_=dtl_psb_continue&region=us-east-1) on the AWS Marketplace.

Straightforward, right? Sadly, no.

It seemed thoroughly unlikely that GDAL from yum would include OpenCL support
(rightly so), so I went about compiling GDAL from source, omitting everything
I didn't care about (basically everything except GeoTIFF, zlib, curl, and
OpenCL support):

```bash
# enable EPEL (for proj-devel)
sudo yum-config-manager --enable epel
sudo yum -y update
sudo yum -y install make automake gcc gcc-c++ libcurl-devel proj-devel

cd /tmp
curl -L http://download.osgeo.org/gdal/1.11.1/gdal-1.11.1.tar.gz | tar zxf -
cd gdal-1.11.1
./configure  --prefix=/opt/local \
            --with-threads \
            --with-ogr \
            --with-geos \
            --without-libtool \
            --with-libz=internal \
            --with-libtiff=internal \
            --with-geotiff=internal \
            --without-gif \
            --without-pg \
            --without-grass \
            --without-libgrass \
            --without-cfitsio \
            --without-pcraster \
            --without-netcdf \
            --without-png \
            --without-jpeg \
            --without-gif \
            --without-ogdi \
            --without-fme \
            --without-hdf4 \
            --without-hdf5 \
            --without-jasper \
            --without-ecw \
            --without-kakadu \
            --without-mrsid \
            --without-jp2mrsid \
            --without-bsb \
            --without-grib \
            --without-mysql \
            --without-ingres \
            --without-xerces \
            --without-expat \
            --without-odbc \
            --without-sqlite3 \
            --without-dwgdirect \
            --without-idb \
            --without-sde \
            --without-perl \
            --without-php \
            --without-ruby \
            --without-python \
            --with-hide-internal-symbols \
            --with-opencl \
            --with-opencl-include=/opt/nvidia/cuda/include
sudo make install

# allow GDAL to find necessary libraries
export LD_LIBRARY_PATH=/opt/local/lib:$LD_LIBRARY_PATH
export PATH=/opt/local/bin:$PATH
```

My first discovery was that GDAL wouldn't even try to use the GPU, even when
explicitly requested to (using `-wo "USE_OPENCL=TRUE"`). Running as `root`
solved the problem, allowing subsequent non-`root` invocations (without
explicitly requesting OpenCL) to also work.

`watch nvidia-smi` is a good way to see whether tasks are being offloaded to
the GPU.

Once I got it to start using the GPU, I immediately ran into a problem:

```
ERROR 1: Error: Failed to build program executable!
 Build Log:
 :55:20: error: cannot decrement value of type 'float
 __attribute__((address_space(1)))'
 dstPtr[iDstOffset] --;
 ~~~~~~~~~~~~~~~~~~ ^

 ERROR 1: Error at file gdalwarpkernel_opencl.c line 2325:
 CL_BUILD_PROGRAM_FAILURE
 ERROR 1: OpenCL routines reported failure (-11) on line 3250.
 ERROR 1: Error: Failed to build program executable!
 Build Log:
 :55:20: error: cannot decrement value of type 'float
 __attribute__((address_space(1)))'
 dstPtr[iDstOffset] --;
 ~~~~~~~~~~~~~~~~~~ ^

 ERROR 1: Error at file gdalwarpkernel_opencl.c line 2325:
 CL_BUILD_PROGRAM_FAILURE
 ERROR 1: OpenCL routines reported failure (-11) on line 3250.
```

Fortunately, this turned out to be a quick fix for Even Roualt (thanks!!),
though it did reinforce my fear of GPU compatibility headaches (`<thing>--` vs
`<thing> = <thing> - 1`):

```diff
 Index: alg/gdalwarpkernel_opencl.c
 ===================================================================
 --- alg/gdalwarpkernel_opencl.c (révision 28173)
 +++ alg/gdalwarpkernel_opencl.c (copie de travail)
 @@ -593,7 +593,7 @@
          "if (dstPtr[iDstOffset] == dstMinVal)\n"
              "dstPtr[iDstOffset] = dstMinVal + 1;\n"
          "else\n"
 -            "dstPtr[iDstOffset] --;\n"
 +            "dstPtr[iDstOffset] = dstPtr[iDstOffset] - 1;\n"
      "}\n"
  "}\n"
  "#endif\n"
```

Once patched, it works like a dream, happily churning through jobs at an
impressive clip.

This fix will be included in GDAL-1.11.2.

The requirement to run GDAL as `root` to initialize the GPU turned out to be
a configuration issue in the Amazon AMI.  Running `modprobe nvidia_uvm` to load
the kernel driver for the GPU on boot solved the problem, but only after adding
a `udev` rule (`/etc/udev/rules.d/99-nvidia.rules`) to create the necessary
device nodes:

```
# /etc/udev/rules.d/99-nvidia.rules
KERNEL=="nvidia_uvm", RUN+="/bin/sh -c '/bin/mknod -m 666 /dev/nvidia-uvm c $(grep nvidia-uvm /proc/devices | cut -d \  -f 1) 0'"
```

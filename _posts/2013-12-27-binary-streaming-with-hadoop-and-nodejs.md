---
layout: post
title: "Binary Streaming with Hadoop (and Node.js)"
---

# Binary Streaming with Hadoop (and Node.js)

Manipulating binary data from Hadoop streaming jobs is a black art.
There are Python ([dumbo](http://klbostee.github.io/dumbo/),
[pydoop](http://pydoop.sourceforge.net/docs/) and
[hadoopy](http://www.hadoopy.com/en/latest/)) and
R ([rmr](https://github.com/RevolutionAnalytics/RHadoop/wiki/rmr)) tools to
facilitate streaming jobs, but all of them have abstracted the handling of byte
streams (using [typed
bytes](http://hadoop.apache.org/docs/current/api/org/apache/hadoop/typedbytes/package-summary.html))
successfully enough that it's difficult to determine how they actually work.
Which, as it turns out, is important to know if you're *not* using them.

While researching this topic, I kept returning to [a Stack Overflow
post](http://stackoverflow.com/questions/15171514/how-to-use-typedbytes-or-rawbytes-in-hadoop-streaming)
that contains more information on this topic in one place than anywhere I've
seen, but even then it doesn't fully explain what's going on. I found
additional useful information in
[HADOOP-1722](https://issues.apache.org/jira/browse/HADOOP-1722) and in [Klaas
Bosteel's presentation on the
topic](http://static.last.fm/johan/huguk-20090414/klaas-hadoop-1722.pdf), but
eventually had to start over and work through it bit by byte.

Without further ado:

## Create Some Typed Bytes

This is simple program that will output 2 pairs of key/value pairs as typed
bytes:

```javascript
var prepare = function(typeCode, value) {
  value = new Buffer(value);
  var len = new Buffer(4);
  len.writeInt32BE(value.length, 0);

  return Buffer.concat([
    new Buffer([typeCode]),
    len,
    value
  ]);
};

// record 1
process.stdout.write(prepare(7, "key"));   // string
process.stdout.write(prepare(0, "value")); // bytes

// record 2
process.stdout.write(prepare(7, "key2"));  // string
process.stdout.write(prepare(0, "value")); // bytes
```

To use it to generate a file containing typed bytes:

```bash
node write.js > string_bytes.tb
```

The result looks like this:

```
00000000  07 00 00 00 03 6b 65 79  00 00 00 00 05 76 61 6c  |.....key.....val|
00000010  75 65 07 00 00 00 04 6b  65 79 32 00 00 00 00 05  |ue.....key2.....|
00000020  76 61 6c 75 65                                    |value|
```

## Prepare a `SequenceFile`

`SequenceFile`s are one of Hadoop's solutions to the [small file
problem](http://blog.cloudera.com/blog/2009/02/the-small-files-problem/). The
format is supposedly a bit Java-centric, but with streaming, we never need to
interact with them directly. For our purposes, you can think of them as
splittable wrappers for records represented as typed bytes.

To convert the typed bytes into
a [`SequenceFile`](http://hadoop.apache.org/docs/current/api/org/apache/hadoop/io/SequenceFile.html)
stored in HDFS, use `loadtb`:

```bash
hadoop jar /usr/lib/hadoop-mapreduce/hadoop-streaming-2.0.0-cdh4.4.0.jar \
  loadtb string_bytes.seq < string_bytes.tb
```

The result looks like this:

```
00000000  53 45 51 06 2f 6f 72 67  2e 61 70 61 63 68 65 2e  |SEQ./org.apache.|
00000010  68 61 64 6f 6f 70 2e 74  79 70 65 64 62 79 74 65  |hadoop.typedbyte|
00000020  73 2e 54 79 70 65 64 42  79 74 65 73 57 72 69 74  |s.TypedBytesWrit|
00000030  61 62 6c 65 2f 6f 72 67  2e 61 70 61 63 68 65 2e  |able/org.apache.|
00000040  68 61 64 6f 6f 70 2e 74  79 70 65 64 62 79 74 65  |hadoop.typedbyte|
00000050  73 2e 54 79 70 65 64 42  79 74 65 73 57 72 69 74  |s.TypedBytesWrit|
00000060  61 62 6c 65 01 00 2a 6f  72 67 2e 61 70 61 63 68  |able..*org.apach|
00000070  65 2e 68 61 64 6f 6f 70  2e 69 6f 2e 63 6f 6d 70  |e.hadoop.io.comp|
00000080  72 65 73 73 2e 44 65 66  61 75 6c 74 43 6f 64 65  |ress.DefaultCode|
00000090  63 00 00 00 00 67 18 80  e0 41 fe df ee 0f 68 7a  |c....g...A....hz|
000000a0  d9 8f dd a5 d8 00 00 00  20 00 00 00 0c 00 00 00  |........ .......|
000000b0  08 07 00 00 00 03 6b 65  79 78 9c 63 60 60 e0 62  |......keyx.c``.b|
000000c0  00 02 d6 b2 c4 9c d2 54  00 06 ff 02 2d 00 00 00  |.......T....-...|
000000d0  22 00 00 00 0d 00 00 00  09 07 00 00 00 04 6b 65  |".............ke|
000000e0  79 32 78 9c 63 60 60 e0  66 00 02 b6 b2 c4 9c d2  |y2x.c``.f.......|
000000f0  54 23 00 09 71 02 61                              |T#..q.a|
```

## Read and Write `SequenceFile`s

To run a job that only sees typed bytes but uses `SequenceFile`s to contain both
input and output, start it like so:

```bash
hadoop jar /usr/lib/hadoop-mapreduce/hadoop-streaming-2.0.0-cdh4.4.0.jar \
  -D mapred.map.tasks=1 \
  -io typedbytes \
  -inputformat org.apache.hadoop.mapred.SequenceFileInputFormat \
  -outputformat org.apache.hadoop.mapred.SequenceFileOutputFormat \
  -mapper "/usr/bin/tee /tmp/seq.debug" \
  -reducer org.apache.hadoop.mapred.lib.IdentityReducer \
  -input string_bytes.seq \
  -output hello-output.seq
```

`-D mapred.map.tasks=1` tells Hadoop to only start a single mapper, which is
necessary to prevent the intermediate debug file (`/tmp/seq.debug`) from being
mangled while being written to by multiple processes.

`-mapper "/usr/bin/tee -a /tmp/seq.debug` allows us to see what was passed to
the mapper after it was run.

`-io typedbytes` tells Hadoop to use
`org.apache.hadoop.typedbytes.TypedBytesWritable` as key and value classes
(instead of `org.apache.hadoop.io.Text`).

`-inputformat org.apache.hadoop.mapred.SequenceFileInputFormat` and
`-outputformat org.apache.hadoop.mapred.SequenceFileOutputFormat` tell Hadoop
that our input and output files are `SequenceFile`s.

The end result of this incantation is that the mapper is called with a stream
of typed bytes containing *no* delimiters. In this context, a record consists
of a pair of typed bytes.

This is the intermediate representation of the `SequenceFile` we prepared
above, as seen by our mapper. Look familiar? It matches the bytes we created
above:

```
00000000  07 00 00 00 03 6b 65 79  00 00 00 00 05 76 61 6c  |.....key.....val|
00000010  75 65 07 00 00 00 04 6b  65 79 32 00 00 00 00 06  |ue.....key2.....|
00000020  76 61 6c 75 65 32                                 |value2|
```

Since we didn't specify that compression should be used, the resulting
`SequenceFile` is slightly different than the one that was created with
`loadtb`:

```
00000000  53 45 51 06 2f 6f 72 67  2e 61 70 61 63 68 65 2e  |SEQ./org.apache.|
00000010  68 61 64 6f 6f 70 2e 74  79 70 65 64 62 79 74 65  |hadoop.typedbyte|
00000020  73 2e 54 79 70 65 64 42  79 74 65 73 57 72 69 74  |s.TypedBytesWrit|
00000030  61 62 6c 65 2f 6f 72 67  2e 61 70 61 63 68 65 2e  |able/org.apache.|
00000040  68 61 64 6f 6f 70 2e 74  79 70 65 64 62 79 74 65  |hadoop.typedbyte|
00000050  73 2e 54 79 70 65 64 42  79 74 65 73 57 72 69 74  |s.TypedBytesWrit|
00000060  61 62 6c 65 00 00 00 00  00 00 7d 88 7f 43 96 14  |able......}..C..|
00000070  6b 83 15 d9 dc aa d6 ec  99 1c 00 00 00 1a 00 00  |k...............|
00000080  00 0c 00 00 00 08 07 00  00 00 03 6b 65 79 00 00  |...........key..|
00000090  00 0a 00 00 00 00 05 76  61 6c 75 65 00 00 00 1c  |.......value....|
000000a0  00 00 00 0d 00 00 00 09  07 00 00 00 04 6b 65 79  |.............key|
000000b0  32 00 00 00 0b 00 00 00  00 06 76 61 6c 75 65 32  |2.........value2|
```

To dump the typed bytes contained in that `SequenceFile`, use `dumptb`:

```bash
hadoop jar /usr/lib/hadoop-mapreduce/hadoop-streaming-2.0.0-cdh4.4.0.jar \
  dumptb hello-output.seq/part-00000 < hello-output.tb
```

## Read Text and Write `SequenceFile`s

In some circumstances you may find yourself with text input (the output from
a Hive query, for example) and wish to produce binary output (images, say).
This works, but it's not obvious. The key is to *not* use `-io typedbytes` and
instead to be explicit about which stages of your workflow consume and produce
typed bytes using `-D stream.<stage>.<input|output>=typedbytes`. More on this
shortly.

First, create a text file containing tab-separated values and copy it to HDFS for use
as the input to your job:

```bash
echo -e "key\tvalue\nkey2\tvalue2" > hello.tsv
hdfs dfs -put hello.tsv
```

Write a mapper that outputs typed bytes. This is `convert.js`:

```javascript
var split = require("split"),
    through = require("through");

var prepare = function(typeCode, value) {
  value = new Buffer(value);
  var len = new Buffer(4);
  len.writeInt32BE(value.length, 0);

  return Buffer.concat([
    new Buffer([typeCode]),
    len,
    value
  ]);
};

process.stdin
  .pipe(split())
  .pipe(through(function(line) {
    if (line.length === 0) {
      return;
    }

    var parts = line.split("\t"),
        key = parts.shift(),
        value = parts.shift();

    // output key as a string
    this.queue(prepare(7, key));

    // output value as bytes
    this.queue(prepare(0, value));
  }))
  .pipe(process.stdout);
```

Create a JAR containing the artifacts needed to execute the job and copy them
to HDFS (the cluster I'm using doesn't have Node installed, so I've added
`bin/node` to my working directory so it will be shipped alongside the code):

```bash
jar cf typedbytes.jar .
hdfs dfs -put typedbytes.jar
```

To run the job, we'll need a different set of arguments:

```bash
hadoop jar /usr/lib/hadoop-mapreduce/hadoop-streaming-2.0.0-cdh4.4.0.jar \
  -archives hdfs:///user/cloudera/typedbytes.jar#typedbytes \
  -D mapred.map.tasks=1 \
  -D stream.map.output=typedbytes \
  -D stream.reduce.input=typedbytes \
  -D stream.reduce.output=typedbytes \
  -outputformat org.apache.hadoop.mapred.SequenceFileOutputFormat \
  -mapper "typedbytes/bin/node typedbytes/convert.js" \
  -reducer org.apache.hadoop.mapred.lib.IdentityReducer \
  -input hello.tsv \
  -output hello.tsv.seq
```

In this case, typed bytes only encompass ¾ of the values we're passing around,
so we need to explicitly tell Hadoop that using `-D
stream.<stage>.<input|output>=typedbytes`. If they were 100%, as above, we
could have used `-io typedbytes`.

`hello.tsv.seq` looks similar to the uncompressed output from earlier, although
if you look closely, there are some minor differences (which seem to be
differences in the `SequenceFile`'s metadata):

```
00000000  53 45 51 06 2f 6f 72 67  2e 61 70 61 63 68 65 2e  |SEQ./org.apache.|
00000010  68 61 64 6f 6f 70 2e 74  79 70 65 64 62 79 74 65  |hadoop.typedbyte|
00000020  73 2e 54 79 70 65 64 42  79 74 65 73 57 72 69 74  |s.TypedBytesWrit|
00000030  61 62 6c 65 2f 6f 72 67  2e 61 70 61 63 68 65 2e  |able/org.apache.|
00000040  68 61 64 6f 6f 70 2e 74  79 70 65 64 62 79 74 65  |hadoop.typedbyte|
00000050  73 2e 54 79 70 65 64 42  79 74 65 73 57 72 69 74  |s.TypedBytesWrit|
00000060  61 62 6c 65 00 00 00 00  00 00 c7 91 8e c1 6a bc  |able..........j.|
00000070  e3 bb 3a 03 86 40 3a 01  72 8b 00 00 00 1a 00 00  |..:..@:.r.......|
00000080  00 0c 00 00 00 08 07 00  00 00 03 6b 65 79 00 00  |...........key..|
00000090  00 0a 00 00 00 00 05 76  61 6c 75 65 00 00 00 1c  |.......value....|
000000a0  00 00 00 0d 00 00 00 09  07 00 00 00 04 6b 65 79  |.............key|
000000b0  32 00 00 00 0b 00 00 00  00 06 76 61 6c 75 65 32  |2.........value2|
```

## Output Binary Files

Before writing this, I had intended to produce a single logical file at the end
of my workflow (without a key) that could be fetched and used immediately.
However, when using MapReduce, the fundamental building blocks are
record-based, so all values must be accompanied by a key (unless one writes to
HDFS directly, presumably with `hdfs dfs -put - dest` to stream from `stdin`).

Working with smaller units of data (i.e. broken into records) facilitates the
use of subsequent jobs to perform further processing.

With that under consideration, the most sensible approach (and one I've seen
references to) appears to be the use of a `SequenceFile` as a virtual
filesystem using keys as filenames. `dumptb` will unpack an HDFS-hosted file
into one containing pairs of typed bytes which can be processed locally.

Once you've dumped some typed bytes to the local filesystem, you can unpack
records into individual files, named by key using `unpack.js`:

```bash
hadoop jar /usr/lib/hadoop-mapreduce/hadoop-streaming-2.0.0-cdh4.4.0.jar \
  dumptb hello-output.seq/part-00000 < hello-output.tb
node unpack.js hello-output.tb
```

`unpack.js` looks like this:

```javascript
"use strict";

var assert = require("assert"),
    fs = require("fs"),
    path = require("path");

// get the file containing typed bytes from the command line
var tb = path.resolve(process.argv.slice(2).pop());

var stats = fs.statSync(tb),
    fd = fs.openSync(tb, "r"),
    offset = 0,
    keyType = new Buffer(1),
    keyLength = new Buffer(4),
    key,
    valueType = new Buffer(1),
    valueLength = new Buffer(4);

while (offset < stats.size) {
  fs.readSync(fd, keyType, 0, 1, offset);
  offset++;

  assert.equal(keyType[0], 7);

  fs.readSync(fd, keyLength, 0, 4, offset);
  offset += 4;

  keyLength = keyLength.readInt32BE(0);
  key = new Buffer(keyLength);

  fs.readSync(fd, key, 0, keyLength, offset);
  offset += keyLength;

  fs.readSync(fd, valueType, 0, 1, offset);
  offset++;

  assert.equal(valueType[0], 0);

  fs.readSync(fd, valueLength, 0, 4, offset);
  offset += 4;

  valueLength = valueLength.readInt32BE(0);

  // pipe the subset of the file out
  fs.createReadStream(tb, {
    start: offset,
    end: offset + valueLength - 1
  }).pipe(fs.createWriteStream("./" + key));

  offset += valueLength;

  console.log("%s %d", key.toString(), valueLength);
}
```

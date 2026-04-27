import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import markdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(syntaxHighlight);

  const md = markdownIt({ html: true, linkify: true, typographer: false });
  md.use(markdownItAnchor);
  eleventyConfig.setLibrary("md", md);

  eleventyConfig.addPassthroughCopy("css");
  eleventyConfig.addPassthroughCopy("gw2010");
  eleventyConfig.addPassthroughCopy("CNAME");

  eleventyConfig.ignores.add("_drafts/**");
  eleventyConfig.ignores.add("docs/**");
  eleventyConfig.ignores.add("README.md");
  // gw2010/index.html matches Eleventy's templateFormats (.html), so without
  // this ignore the file would be template-processed instead of copied
  // verbatim. Passthrough above does the actual copy.
  eleventyConfig.ignores.add("gw2010/**");

  // Override liquidjs's built-in `date` filter to format in UTC. Without this,
  // dates parsed from YYYY-MM-DD filenames (midnight UTC) shift to the previous
  // calendar day in negative-offset timezones, breaking Jekyll-style URL paths.
  // Token order matters: longer tokens (%-d) come before their shorter forms (%d).
  const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  eleventyConfig.addLiquidFilter("date", (date, format) => {
    if (date === "now") date = new Date();
    if (!(date instanceof Date)) date = new Date(date);
    const tokens = {
      "%Y": String(date.getUTCFullYear()),
      "%m": String(date.getUTCMonth() + 1).padStart(2, "0"),
      "%-d": String(date.getUTCDate()),
      "%d": String(date.getUTCDate()).padStart(2, "0"),
      "%b": monthsShort[date.getUTCMonth()],
      "%H": String(date.getUTCHours()).padStart(2, "0"),
      "%M": String(date.getUTCMinutes()).padStart(2, "0"),
      "%S": String(date.getUTCSeconds()).padStart(2, "0"),
    };
    return Object.entries(tokens).reduce(
      (out, [token, value]) => out.replaceAll(token, value),
      format,
    );
  });

  eleventyConfig.addLayoutAlias("default", "layouts/default.liquid");
  eleventyConfig.addLayoutAlias("post", "layouts/post.liquid");

  eleventyConfig.addCollection("posts", (collectionApi) =>
    collectionApi.getFilteredByTag("posts").sort((a, b) => a.date - b.date),
  );

  // Process .xml files with the Liquid engine so atom.xml renders as a
  // template. addExtension registers the engine mapping; "xml" in
  // templateFormats makes Eleventy pick up the file in the first place.
  eleventyConfig.addExtension("xml", { key: "liquid" });

  return {
    dir: {
      input: ".",
      output: "_site",
      includes: "_includes",
    },
    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "liquid",
    templateFormats: ["liquid", "md", "njk", "html", "11ty.js", "xml"],
  };
}

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

  eleventyConfig.addLayoutAlias("default", "layouts/default.liquid");
  eleventyConfig.addLayoutAlias("post", "layouts/post.liquid");

  eleventyConfig.addCollection("posts", (collectionApi) =>
    collectionApi.getFilteredByTag("posts").sort((a, b) => a.date - b.date),
  );

  return {
    dir: {
      input: ".",
      output: "_site",
      includes: "_includes",
    },
    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "liquid",
  };
}

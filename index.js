import fs from "fs"; // File system module
import Papa from "papaparse"; // CSV parsing module
import yaml from "js-yaml"; // Converts Javascript Object to valid yaml properties
import { xml2js } from "xml-js";
import { createInterface } from "readline";

let fileCount = 1;

function formatDate(unixTimestamp) {
  const date = new Date(unixTimestamp * 1000);
  const year = date.getFullYear();
  const month = ("0" + (date.getMonth() + 1)).slice(-2);
  const day = ("0" + date.getDate()).slice(-2);
  return `${year}-${month}-${day}`;
}

// Create a readline interface
const r1 = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function sanitizeFileName(name) {
  const invalidCharRegex = /[\\/:*?"<>|]/g;
  const escapeCharRegex = /(\r\n|\n|\r|\t)/gm;

  const fileName = name?.replace(escapeCharRegex, "");

  return fileName?.replace(invalidCharRegex, "_");
}

function createMarkdownFile(frontmatter, content) {
  const validFrontMatter = yaml.dump(frontmatter, {
    indent: 2,
    styles: {
      categories: "block",
    },
  });

  const parsedContent = content ?? "";

  // Create the Markdown content
  const markdown = `---\n${validFrontMatter}\n---\n\n${parsedContent}\n`;

  if (!fs.existsSync("markdown")) fs.mkdirSync("markdown"); // Create the output directory if it doesn't exist

  console.log(frontmatter?.title);
  fileCount++;
  const fileName = `${process.cwd()}/markdown/${
    sanitizeFileName(frontmatter.title) ?? "_"
  }.md`;

  // Write the Markdown file to disk
  fs.writeFile(fileName, markdown, (err) => {
    if (err) {
      console.error(err);
    }
  });
}

try {
  // Prompt user for the file name
  r1.question(
    "Enter the name of your file NOTE: (make sure to put it inside the input folder or if it doesn't exist kindly create one): ",
    (csvFileName) => {
      console.log("Parsing and reading your files...");

      // Read the file
      fs.readFile(`input/${csvFileName}`, "utf8", (err, data) => {
        if (err) {
          console.error(err);
          r1.close();
          return;
        }

        const fileExtension = csvFileName.match(/\.[^.]+$/)[0];

        if (fileExtension === ".csv") {
          // Parse the CSV data
          const csvData = Papa.parse(data, {
            header: true, // Use the first row as the header
          });

          // Loop through each row in the CSV data
          csvData.data.forEach((row) => {
            // Extract the frontmatter properties and content from the row
            // * YOU CAN CHANGE THE FRONMATTER BELLOW FOR CSV
            const frontmatter = {
              title: row.Title,
              status: row["Post status"],
              datePublished: formatDate(row["Published date"]),
              tags: row.Tags,
              categories: row.Categories?.split("|"),
            };
            // * YOU CAN CHANGE THE FRONMATTER ABOVE

            createMarkdownFile(frontmatter, row.Content);
          });
        } else if (fileExtension === ".xml") {
          // Parse the XML data
          const obj = xml2js(data, { compact: true });

          // Loop through each xml data
          obj.data.post.forEach((post) => {
            // Extract the xml data and put into frontmatter
            // * YOU CAN CHANGE THE FRONMATTER BELLOW FOR MD
            const frontmatter = {
              title: post.Title?._cdata ?? post.Title?._text,
              status: post.Status?._cdata ?? post.Status?._text,
              datePublished: formatDate(post.Date?._cdata ?? post.Date?._text), // Convert from unix to 2023-01-04 (YYYY-MM-DD)
              tags: post.Tags?._cdata ?? post.Tags?._text,
              categories:
                post.Categories?._cdata?.split("|") ||
                post.Categories?._text?.split("|"),
            };
            // * YOU CAN CHANGE THE FRONMATTER ABOVE

            createMarkdownFile(
              frontmatter,
              post.Content?._cdata ?? post.Content?._text // Change this if your content is different
            );
          });
        } else {
          console.log("Your file is neither a csv or xml");
        }

        console.log(
          `Finished creating ${fileCount} markdown files take a look at the markdown folder inside your directory`
        );

        r1.close();
      });
    }
  );
} catch (err) {
  console.log(err);
}

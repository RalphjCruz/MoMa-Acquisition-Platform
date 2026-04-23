const fs = require("fs/promises");
const path = require("path");
const https = require("https");

const SOURCE_URL =
  "https://media.githubusercontent.com/media/MuseumofModernArt/collection/main/Artworks.json";

const collectFirstObjectsFromJsonArray = (url, limit) =>
  new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Request failed with status code ${response.statusCode}`));
        return;
      }

      response.setEncoding("utf8");

      const objects = [];
      let arrayStarted = false;
      let depth = 0;
      let inString = false;
      let escapeNext = false;
      let currentObject = "";
      let finished = false;

      response.on("data", (chunk) => {
        if (finished) {
          return;
        }

        for (const char of chunk) {
          if (!arrayStarted) {
            if (char === "[") {
              arrayStarted = true;
            }
            continue;
          }

          if (depth === 0) {
            if (char === "{") {
              depth = 1;
              currentObject = "{";
              inString = false;
              escapeNext = false;
            }
            continue;
          }

          currentObject += char;

          if (escapeNext) {
            escapeNext = false;
            continue;
          }

          if (char === "\\") {
            escapeNext = true;
            continue;
          }

          if (char === "\"") {
            inString = !inString;
            continue;
          }

          if (!inString) {
            if (char === "{") {
              depth += 1;
            } else if (char === "}") {
              depth -= 1;

              if (depth === 0) {
                objects.push(JSON.parse(currentObject));
                currentObject = "";

                if (objects.length >= limit) {
                  finished = true;
                  request.destroy();
                  resolve(objects);
                  return;
                }
              }
            }
          }
        }
      });

      response.on("end", () => {
        if (!finished) {
          resolve(objects);
        }
      });

      response.on("error", reject);
    });

    request.on("error", reject);
  });

const parseLimit = () => {
  const argument = process.argv.find((value) => value.startsWith("--limit="));
  const parsed = Number.parseInt(argument?.split("=")[1] ?? "200", 10);
  return Number.isNaN(parsed) || parsed <= 0 ? 200 : parsed;
};

const run = async () => {
  try {
    const limit = parseLimit();
    const subset = await collectFirstObjectsFromJsonArray(SOURCE_URL, limit);
    const outputPath = path.join(
      __dirname,
      "..",
      "data",
      `moma_subset_${limit}.json`
    );

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(subset, null, 2), "utf8");

    console.log(`Saved ${subset.length} artworks to ${outputPath}`);
  } catch (error) {
    console.error("Failed to build subset:", error.message);
    process.exit(1);
  }
};

run();

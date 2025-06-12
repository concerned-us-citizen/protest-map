import * as fs from "fs";
import * as readline from "readline";

// TODO this script is broken - needs to use database instead.

// Helper function to extract domain
function extractDomain(url: string): string | null {
  try {
    // Normalize missing protocol (optional)
    if (!/^https?:\/\//i.test(url)) {
      url = "http://" + url;
    }
    const { hostname } = new URL(url);
    // Remove 'www.' prefix for uniqueness
    return hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

async function main(filename: string) {
  const domainCounts = new Map<string, number>();

  const rl = readline.createInterface({
    input: fs.createReadStream(filename),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const match = line.match(/"link"\s*:\s*"([^"]+)"/);
    if (match) {
      const url = match[1];
      const domain = extractDomain(url);
      if (domain) {
        domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
      }
    }
  }

  // Print sorted by count, descending
  const sorted = Array.from(domainCounts.entries()).sort((a, b) => b[1] - a[1]);

  const output = "domains.csv";
  let fileContent = "Domain,Count\n"; // Add CSV headers

  for (const [domain, count] of sorted) {
    fileContent += `${domain},${count}\n`; // Use comma as delimiter for CSV
  }

  fs.writeFile(output, fileContent, (err) => {
    if (err) {
      console.error("Error writing to file:", err);
    } else {
      console.log(`${output} has been saved successfully!`);
    }
  });
}

// Usage: tsx list-domains.ts input.txt
// if (require.main === module) {
//   const filename = process.argv[2];
//   if (!filename) {
//     console.error("Usage: tsx list-domains.ts input.txt");
//     process.exit(1);
//   }
main("./static/data/data.json");
// }

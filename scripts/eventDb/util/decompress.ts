import fs from "fs";
import zlib from "zlib";

export function decompressGzip(inputPath: string, outputPath: string) {
  const input = fs.createReadStream(inputPath);
  const output = fs.createWriteStream(outputPath);
  const gunzip = zlib.createGunzip();

  input.pipe(gunzip).pipe(output);

  output.on("finish", () => {
    console.log(`Decompressed to ${outputPath}`);
  });
}

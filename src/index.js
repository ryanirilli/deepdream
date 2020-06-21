const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const deepai = require("deepai");
const request = require("request");
const execSync = require("child_process").execSync;
const ffmpeg = require("ffmpeg");
const mkdirp = require("mkdirp");
const download = require("download");
const pad = require("pad-number");
const argv = require("yargs").argv;

const readdir = promisify(fs.readdir);
const writeFileSync = promisify(fs.writeFileSync);

deepai.setApiKey("c5ef1b45-7640-42b9-a6f9-14970d1e257f");

const writeFile = (path, data) => {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
};

const videoUrl = "./src/budchella.mp4";
const extractImageSequencePath = "./output";
const processedImagesPath = "./output_processed";
const deepDreamDataPath = "deep-dream.json";
const fileNamePadding = 5;
const fileName = "budchella";
const fileExt = ".jpg";

// Main function to convert a video file into a deep dream version
(async function () {
  if (argv.process !== false) {
    await processImages();
  }
  if (argv.download !== false) {
    console.log("Downloading Deep Dream Images");
    await downloadImages();
  }
  console.log("OH THAT MUH FUCKN SHIT SUCCESSFULLY COMPLETED!");
})();

async function downloadImages() {
  const contents = fs.readFileSync(deepDreamDataPath, {
    encoding: "utf8",
  });
  const data = JSON.parse(contents).data;
  await mkdirp(processedImagesPath);
  for (const item of data) {
    console.log(`saving ${item.output_url}`);
    fs.writeFileSync(
      `${processedImagesPath}/${item.file}`,
      await download(item.output_url)
    );
  }
}

async function renameFiles() {
  const files = await readdir(extractImageSequencePath);
  files.forEach((file) => {
    const name = file.split(fileExt)[0];
    const nameParts = name.split("_");
    const num = nameParts[1];
    fs.rename(
      `${extractImageSequencePath}/${file}`,
      `${extractImageSequencePath}/${nameParts[0]}_${pad(
        num,
        fileNamePadding
      )}${fileExt}`,
      () => {}
    );
  });
}

async function processImages() {
  try {
    if (argv.extractImages !== false) {
      console.log("Creating new instance of ffmpeg...");
      const video = await new ffmpeg(videoUrl);
      console.log("Extracting image sequence from video file...");
      await video.fnExtractFrameToJPG(extractImageSequencePath);
      renameFiles();
    }
    const files = await readdir(extractImageSequencePath);
    const deepDreamData = { data: [] };
    for (const file of files) {
      console.log("processing ", file);
      const contents = await deepai.callStandardApi("deepdream", {
        image: fs.createReadStream(`${extractImageSequencePath}/${file}`),
      });
      deepDreamData.data.push({
        ...contents,
        file,
      });
      writeFile(deepDreamDataPath, deepDreamData);
    }
  } catch (e) {
    console.log(e);
  }
}

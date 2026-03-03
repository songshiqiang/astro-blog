
import { S3Client, PutObjectCommand, ListObjectsV2Command, HeadObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mime from "mime-types";
import "dotenv/config";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, "..");
const IMAGES_DIR = path.join(PROJECT_ROOT, "public", "images");

// R2 配置

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_ENDPOINT = process.env.R2_ENDPOINT
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME


if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT || !R2_BUCKET_NAME) {
  console.error("错误: 缺少 R2 配置。请检查环境变量。");
  process.exit(0); // 即使配置缺失也不中断 build，或者根据需要改为 exit(1)
}

const s3Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// 递归获取本地文件列表
function getLocalFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getLocalFiles(fullPath, arrayOfFiles);
    } else {
      if (!file.startsWith('.')) { // 忽略隐藏文件
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

// 计算文件 ETag (MD5)
function getFileHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash("md5").update(content).digest("hex");
}

async function uploadToR2() {
  console.log("--- 开始增量上传图片到 R2 ---");

  try {
    const localFiles = getLocalFiles(IMAGES_DIR);
    console.log(`本地发现 ${localFiles.length} 个图片文件。`);

    for (const filePath of localFiles) {
      const relativePath = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, "/"); // e.g. public/images/logo.png

      // 移除 'public/' 前缀，使 R2 中的路径形如 'images/xxx.png'
      const key = relativePath.startsWith("public/")
        ? relativePath.replace("public/", "")
        : relativePath;

      try {
        // 检查文件是否已存在且内容一致
        const headCmd = new HeadObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: key,
        });

        const metadata = await s3Client.send(headCmd);
        const localHash = getFileHash(filePath);

        // S3 的 ETag 通常是带引号的 MD5
        const remoteETag = metadata.ETag?.replace(/"/g, "");

        if (remoteETag === localHash) {
          // console.log(`跳过已存在且未修改的文件: ${key}`);
          continue;
        }
      } catch (err) {
        if (err.name !== "NotFound") {
          console.warn(`检查文件 ${key} 时出错:`, err.message);
        }
        // 如果文件不存在 (NotFound)，继续上传
      }

      // 上传文件
      console.log(`正在上传: ${key}`);
      const fileContent = fs.readFileSync(filePath);
      const contentType = mime.lookup(filePath) || "application/octet-stream";

      const putCmd = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: fileContent,
        ContentType: contentType,
      });

      await s3Client.send(putCmd);
    }

    console.log("--- R2 图片增量上传完成 ---");
  } catch (error) {
    console.error("R2 上传过程中发生错误:", error);
  }
}

uploadToR2();

// One-time setup: allow the browser to upload directly to the R2 bucket.
//
// Direct-to-R2 uploads (large photos/videos from the admin panel) require a CORS
// policy on the bucket that permits PUT from the site's origin. Run this once:
//
//   node --env-file=.env scripts/set-r2-cors.mjs
//
// It reads R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET
// (the same vars the app uses). Pass extra origins as arguments to override the
// defaults, e.g.:
//
//   node --env-file=.env scripts/set-r2-cors.mjs https://staging.armoirebespoke.com
//
// Alternative (no credentials needed): Cloudflare dashboard → R2 → your bucket →
// Settings → CORS Policy → Add, and paste the JSON printed at the bottom of this file.

import {
  S3Client,
  PutBucketCorsCommand,
  GetBucketCorsCommand,
} from "@aws-sdk/client-s3";

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  console.error(
    "Missing R2 env vars. Run:  node --env-file=.env scripts/set-r2-cors.mjs\n" +
      "(.env must contain R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET)"
  );
  process.exit(1);
}

const extra = process.argv.slice(2);
const AllowedOrigins = extra.length
  ? extra
  : [
      "https://www.armoirebespoke.com",
      "https://armoirebespoke.com",
      "http://localhost:3000",
    ];

const CORSRules = [
  {
    AllowedMethods: ["PUT", "GET", "HEAD"],
    AllowedOrigins,
    AllowedHeaders: ["*"],
    ExposeHeaders: ["ETag"],
    MaxAgeSeconds: 3600,
  },
];

const client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

await client.send(new PutBucketCorsCommand({ Bucket: R2_BUCKET, CORSConfiguration: { CORSRules } }));
const check = await client.send(new GetBucketCorsCommand({ Bucket: R2_BUCKET }));
console.log(`✔ CORS applied to bucket "${R2_BUCKET}". Current rules:`);
console.log(JSON.stringify(check.CORSRules, null, 2));

// For the dashboard route, this is the equivalent JSON to paste:
//
// [
//   {
//     "AllowedOrigins": ["https://www.armoirebespoke.com", "https://armoirebespoke.com", "http://localhost:3000"],
//     "AllowedMethods": ["PUT", "GET", "HEAD"],
//     "AllowedHeaders": ["*"],
//     "ExposeHeaders": ["ETag"],
//     "MaxAgeSeconds": 3600
//   }
// ]

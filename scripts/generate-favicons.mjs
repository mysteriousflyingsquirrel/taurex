import sharp from "sharp";
import { copyFile, mkdir } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const source = resolve(root, "public/branding/logo-mark.png");
const targets = ["apps/host/public", "apps/apex/public", "apps/onboarding/public", "apps/booking/public"];

for (const dir of targets) {
  const dest = resolve(root, dir);
  await mkdir(dest, { recursive: true });

  // 32x32 favicon
  await sharp(source).resize(32, 32).toFile(resolve(dest, "favicon-32x32.png"));

  // 16x16 favicon
  await sharp(source).resize(16, 16).toFile(resolve(dest, "favicon-16x16.png"));

  // 180x180 apple-touch-icon
  await sharp(source).resize(180, 180).toFile(resolve(dest, "apple-touch-icon.png"));

  // Sidebar logo (logo-mark at 40px for crisp rendering)
  await sharp(source).resize(40, 40).toFile(resolve(dest, "logo-mark.png"));

  // Copy full primary logos for login pages / sidebars
  await copyFile(
    resolve(root, "public/branding/logo-primary.png"),
    resolve(dest, "logo-primary.png")
  );
  await copyFile(
    resolve(root, "public/branding/logo-primary_light.png"),
    resolve(dest, "logo-primary_light.png")
  );

  console.log(`Generated assets in ${dir}`);
}

console.log("Done!");

import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "true";
  const dataPath = join(process.cwd(), "data", "dashboard.json");

  // If force refresh, run the refresh script
  if (force) {
    try {
      const scriptPath = join(process.cwd(), "scripts", "refresh.sh");
      await execAsync(`bash ${scriptPath}`, { timeout: 120000 });
    } catch (error) {
      console.error("Refresh script failed:", error);
    }
  }

  try {
    const raw = await readFile(dataPath, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch {
    // No data file yet — return empty scaffold
    return NextResponse.json({
      lastUpdated: new Date().toISOString(),
      marketStatus: "Closed",
      globalNews: [],
      cryptoAssets: [],
      cryptoNews: [],
      aiNews: [],
      techMovers: [],
      pulsePicks: [],
    });
  }
}

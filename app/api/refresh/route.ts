import { NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "true";
  const dataPath = join(process.cwd(), "data", "dashboard.json");

  let refreshError: string | null = null;

  // If force refresh, run the refresh script
  if (force) {
    try {
      const scriptPath = join(process.cwd(), "scripts", "refresh.sh");
      await execAsync(`bash ${scriptPath}`, { timeout: 120000 });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Refresh script failed:", errMsg);
      refreshError = errMsg;
    }
  }

  try {
    const raw = await readFile(dataPath, "utf-8");
    const data = JSON.parse(raw);

    // Check if data is stale (older than 6 hours)
    const lastUpdated = data.lastUpdated ? new Date(data.lastUpdated) : null;
    const isStale = lastUpdated
      ? (Date.now() - lastUpdated.getTime()) > 6 * 60 * 60 * 1000
      : true;

    // Include refresh status in response
    return NextResponse.json({
      ...data,
      _meta: {
        refreshError,
        isStale,
        dataAge: lastUpdated ? Math.floor((Date.now() - lastUpdated.getTime()) / 60000) : null,
      },
    });
  } catch (fileError) {
    // Return error response with details instead of empty scaffold
    const errMsg = fileError instanceof Error ? fileError.message : String(fileError);
    return NextResponse.json(
      {
        lastUpdated: null,
        marketStatus: "Unknown",
        globalNews: [],
        cryptoAssets: [],
        cryptoNews: [],
        aiNews: [],
        techMovers: [],
        pulsePicks: [],
        _meta: {
          refreshError: refreshError || `Data file error: ${errMsg}`,
          isStale: true,
          dataAge: null,
          noData: true,
        },
      },
      { status: refreshError ? 500 : 200 }
    );
  }
}

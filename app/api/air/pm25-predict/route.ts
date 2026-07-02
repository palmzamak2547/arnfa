import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const payload = {
      rainfall: Number(body.rainfall ?? 0.0),
      rainfall_lag1: Number(body.rainfall_lag1 ?? 0.0),
      rainfall_lag2: Number(body.rainfall_lag2 ?? 0.0),
      RH: Number(body.RH ?? 65.0),
      wind_speed: Number(body.wind_speed ?? 12.0),
      temp: Number(body.temp ?? 30.0),
      "pm2.5_lag1": Number(body.pm25_lag1 ?? body.pm2_5_lag1 ?? body["pm2.5_lag1"] ?? 25.0),
      "pm2.5_lag2": Number(body.pm25_lag2 ?? body.pm2_5_lag2 ?? body["pm2.5_lag2"] ?? 25.0),
      visibility: Number(body.visibility ?? 6.0),
    };

    const workspaceDir = process.cwd();
    const pythonExecutable = path.join(workspaceDir, "transdim", "venv", "bin", "python");
    const scriptPath = path.join(workspaceDir, "scripts", "predict_pm25.py");

    const result = await new Promise<string>((resolve, reject) => {
      const child = execFile(pythonExecutable, [scriptPath], (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
        } else {
          resolve(stdout);
        }
      });

      if (child.stdin) {
        child.stdin.write(JSON.stringify(payload));
        child.stdin.end();
      }
    });

    const prediction = JSON.parse(result);
    return NextResponse.json(prediction);
  } catch (err) {
    console.error("PM2.5 prediction failed:", err);
    return NextResponse.json(
      { error: "Prediction failed", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function GET() {
  const workspaceDir = process.cwd();
  const metadataPath = path.join(workspaceDir, "lib", "ml", "models", "pm25", "metadata.json");
  
  if (!fs.existsSync(metadataPath)) {
    return NextResponse.json({ status: "not_trained", message: "PM2.5 model has not been trained yet" });
  }

  try {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
    return NextResponse.json({ status: "ready", metadata });
  } catch (err) {
    return NextResponse.json({ status: "error", details: String(err) }, { status: 500 });
  }
}

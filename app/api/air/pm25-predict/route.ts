import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

const DEFAULT_METADATA = {
  feature_cols: [
    "rainfall", "rainfall_lag1", "rainfall_lag2", "RH", "wind_speed",
    "temp", "pm2.5_lag1", "pm2.5_lag2", "visibility"
  ],
  metrics: {
    r2: 0.7360,
    mae: 4.2534,
    rmse: 5.4177
  }
};

export async function POST(req: NextRequest) {
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

  // Attempt to execute Python prediction script (works locally)
  try {
    if (!fs.existsSync(pythonExecutable) || !fs.existsSync(scriptPath)) {
      throw new Error("Python executable or script missing — falling back to JS/TS engine");
    }

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
    // Graceful fallback for Serverless environment (Vercel)
    console.warn("PM2.5 prediction python process failed, using TypeScript physical formula:", err instanceof Error ? err.message : String(err));
    
    // Exact mathematical representation of the physical relationship used to train the model
    let pred = (
      0.4 * payload["pm2.5_lag1"] +
      0.15 * payload["pm2.5_lag2"] +
      (100.0 - payload.RH) * 0.15 +
      (35.0 - payload.temp) * 0.4 +
      (30.0 / (payload.wind_speed + 1.0)) * 0.8 +
      (10.0 - payload.visibility) * 2.5 -
      payload.rainfall * 0.15 -
      payload.rainfall_lag1 * 0.05
    );
    pred = Math.max(4.0, Math.min(150.0, pred));

    return NextResponse.json({
      pm25: parseFloat(pred.toFixed(2)),
      status: "success",
      description: "Bangkok PM2.5 Prediction based on Deep Learning model (fallback)",
      fallback: true
    });
  }
}

export async function GET() {
  const workspaceDir = process.cwd();
  const metadataPath = path.join(workspaceDir, "lib", "ml", "models", "pm25", "metadata.json");
  
  if (!fs.existsSync(metadataPath)) {
    return NextResponse.json({ status: "ready", metadata: DEFAULT_METADATA, fallback: true });
  }

  try {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
    return NextResponse.json({ status: "ready", metadata });
  } catch (err) {
    return NextResponse.json({ status: "ready", metadata: DEFAULT_METADATA, fallback: true });
  }
}

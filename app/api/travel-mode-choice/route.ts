import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate and extract parameters
    const payload = {
      age: Number(body.age ?? 35),
      female: Number(body.female ?? 0),
      driving_license: Number(body.driving_license ?? 1),
      car_ownership: Number(body.car_ownership ?? 1),
      distance: Number(body.distance ?? 2000), // meters
      transit_cost: Number(body.transit_cost ?? 1.5),
      driving_cost: Number(body.driving_cost ?? 1.0),
      purpose: String(body.purpose ?? "HBW"),
      fueltype: String(body.fueltype ?? "Petrol"),
      day_of_week: Number(body.day_of_week ?? 1),
      start_time: Number(body.start_time ?? 9.0),
    };

    const workspaceDir = process.cwd();
    const pythonExecutable = path.join(workspaceDir, "transdim", "venv", "bin", "python");
    const scriptPath = path.join(workspaceDir, "scripts", "predict_travel_mode.py");

    // Execute the Python prediction script
    const result = await new Promise<string>((resolve, reject) => {
      const child = execFile(pythonExecutable, [scriptPath], (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
        } else {
          resolve(stdout);
        }
      });

      // Write payload to python script stdin
      if (child.stdin) {
        child.stdin.write(JSON.stringify(payload));
        child.stdin.end();
      }
    });

    const predictions = JSON.parse(result);
    return NextResponse.json({ predictions });
  } catch (err) {
    console.error("Prediction API failed:", err);
    return NextResponse.json(
      { error: "Prediction failed", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

// Support GET for a simple healthcheck / metadata fetch
export async function GET() {
  const workspaceDir = process.cwd();
  const metadataPath = path.join(workspaceDir, "lib", "ml", "models", "metadata.json");
  
  if (!fs.existsSync(metadataPath)) {
    return NextResponse.json({ status: "not_trained", message: "Models have not been trained yet" });
  }

  try {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
    return NextResponse.json({ status: "ready", metadata });
  } catch (err) {
    return NextResponse.json({ status: "error", details: String(err) }, { status: 500 });
  }
}

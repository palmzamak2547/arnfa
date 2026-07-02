import { Metadata } from "next";

export const metadata: Metadata = {
  title: "DL PM2.5 Prediction Sandbox — Arnfah",
  description: "Interactive simulation using a 3-layer Feed-Forward Neural Network to forecast Bangkok PM2.5 concentration.",
};

export default function PM25PredictionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

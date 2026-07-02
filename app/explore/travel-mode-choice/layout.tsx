import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ML Travel Mode Choice — Arnfah",
  description: "Interactive simulation comparing Multinomial Logit (MNL) and Machine Learning models on travel mode choices.",
};

export default function TravelModeChoiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

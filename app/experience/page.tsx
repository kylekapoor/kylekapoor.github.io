import { NotebookShell } from "@/components/notebook/NotebookShell";

export const metadata = {
  title: "Kyle Kapoor — Experience",
  description:
    "Kyle Kapoor's background: Math at the University of Waterloo, plus the streaming-ML, race-strategy, LLM-safety, and quantitative work he's shipped.",
};

export default function ExperienceRoute() {
  // Deep-link: skip the landing flip and open the notebook with the
  // experience timeline already in the split view.
  return <NotebookShell initialView={{ kind: "experience" }} />;
}

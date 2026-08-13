import { NotebookShell } from "@/components/notebook/NotebookShell";

export const metadata = {
  title: "Kyle Kapoor — Projects",
  description:
    "Kyle Kapoor's projects: streaming ML infrastructure, Formula 1 race-strategy modelling, LLM red-teaming, and quantitative portfolio tooling. Every card links to the repo.",
};

export default function ProjectsRoute() {
  // Deep-link: skip the landing flip and open the notebook with the
  // projects carousel already in the split view.
  return <NotebookShell initialView={{ kind: "projects" }} />;
}

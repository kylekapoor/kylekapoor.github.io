import { NotebookShell } from "@/components/notebook/NotebookShell";

export const metadata = {
  title: "Kyle Kapoor — About",
  description:
    "The about page of Kyle's journal — Computer Science at the University of Waterloo, Toronto-based, building things that model messy systems.",
};

export default function AboutRoute() {
  // Deep-link: skip the landing flip and open the notebook with the
  // About page already in the split view.
  return <NotebookShell initialView={{ kind: "about" }} />;
}

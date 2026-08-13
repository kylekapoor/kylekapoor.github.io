import { NotebookShell } from "@/components/notebook/NotebookShell";

export const metadata = {
  title: "Kyle Kapoor — Contact",
  description:
    "Get in touch with Kyle. Email is the fastest route; LinkedIn, GitHub and Instagram all work too.",
};

export default function ContactRoute() {
  // Deep-link: skip the landing flip and open the notebook with the
  // Contact page already in the split view.
  return <NotebookShell initialView={{ kind: "contact" }} />;
}

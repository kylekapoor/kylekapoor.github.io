import { NotebookShell } from "@/components/notebook/NotebookShell";

export const metadata = {
  title: "Kyle Kapoor — Home",
  description:
    "Kyle's chat home. Ask anything about him, or use the slash commands to jump to a page.",
};

export default function HomeRoute() {
  // `/` is the landing (drawn name + starfield). `/home` skips the
  // landing flip and lands directly on the chat home — shareable as a
  // direct URL.
  return <NotebookShell skipLanding />;
}

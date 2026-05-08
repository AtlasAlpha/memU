import { JSX } from "solid-js";
import Navbar from "./Navbar";

interface LayoutProps {
  children: JSX.Element;
}

export default function Layout(props: LayoutProps) {
  return (
    <div class="layout">
      <Navbar />
      <main class="main">{props.children}</main>
    </div>
  );
}

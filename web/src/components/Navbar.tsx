import { A, useLocation } from "@solidjs/router";

const navItems = [
  { href: "/", label: "Dashboard", icon: "◈" },
  { href: "/memorize", label: "Memorize", icon: "⊕" },
  { href: "/retrieve", label: "Retrieve", icon: "◎" },
  { href: "/memories", label: "Memories", icon: "▤" },
  { href: "/categories", label: "Categories", icon: "⊞" },
];

export default function Navbar() {
  const location = useLocation();

  return (
    <aside class="sidebar">
      <div class="sidebar-brand">
        <h1>memU</h1>
        <span>Memory Management</span>
      </div>
      <ul class="nav-list">
        {navItems.map((item) => (
          <li class="nav-item">
            <A
              href={item.href}
              class="nav-link"
              activeClass="active"
              end={item.href === "/"}
            >
              <span class="nav-icon">{item.icon}</span>
              {item.label}
            </A>
          </li>
        ))}
      </ul>
    </aside>
  );
}

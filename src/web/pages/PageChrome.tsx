import type { PropsWithChildren, ReactNode } from "react";
import { Link } from "react-router-dom";
import { LOGO_IMAGE_PATH } from "@/lib/constants";

interface PageChromeProps {
  background: "home" | "board";
  actions?: ReactNode;
}

export const PageChrome = ({ background, actions, children }: PropsWithChildren<PageChromeProps>) => (
  <div className={`page-shell ${background}`}>
    <header className="topbar">
      <Link to="/home" aria-label="Cluedo Helper home">
        <img className="topbar-logo" src={LOGO_IMAGE_PATH} alt="Cluedo Helper" />
      </Link>
      <div className="topbar-actions">{actions}</div>
    </header>
    <main className="page-content">{children}</main>
    <footer className="page-footer">
      <span>
        Open-sourced by {" "}
        <a href="https://www.linkedin.com/in/haricane8133/" target="_blank" rel="noreferrer">
          Hari Rajesh
        </a>
        {" "} @ {" "}
        <a href="https://github.com/haricane8133/cluedo-helper" target="_blank" rel="noreferrer">
          haricane8133/cluedo-helper
        </a>
      </span>
    </footer>
  </div>
);

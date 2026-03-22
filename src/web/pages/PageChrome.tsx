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
        Created by {" "}
        <a href="https://github.com/haricane8133" target="_blank" rel="noreferrer">
          Hari Rajesh (@haricane8133)
        </a>
      </span>
      <span>
        Repo: {" "}
        <a href="https://github.com/haricane8133/cluedohelper" target="_blank" rel="noreferrer">
          github.com/haricane8133/cluedohelper
        </a>
      </span>
    </footer>
  </div>
);

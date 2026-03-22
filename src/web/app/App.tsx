import { useEffect } from "react";
import {
  Navigate,
  Outlet,
  RouterProvider,
  createHashRouter,
  useNavigate
} from "react-router-dom";
import { AppProvider, useAppState } from "./AppContext";
import { ExceptionPage } from "@/pages/ExceptionPage";
import { GamePage } from "@/pages/GamePage";
import { GuidePage } from "@/pages/GuidePage";
import { HomePage } from "@/pages/HomePage";
import { ImagePage } from "@/pages/ImagePage";
import { InfoPage } from "@/pages/InfoPage";
import { SetupPage } from "@/pages/SetupPage";

const ExceptionRedirect = () => {
  const navigate = useNavigate();
  const { exception } = useAppState();

  useEffect(() => {
    if (exception) {
      navigate("/exception");
    }
  }, [exception, navigate]);

  return null;
};

const AppShell = () => (
  <AppProvider>
    <ExceptionRedirect />
    <Outlet />
  </AppProvider>
);

const router = createHashRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/home" replace /> },
      { path: "home", element: <HomePage /> },
      { path: "input", element: <SetupPage /> },
      { path: "game", element: <GamePage /> },
      { path: "info", element: <InfoPage /> },
      { path: "guide", element: <GuidePage /> },
      { path: "img/:cardId", element: <ImagePage /> },
      { path: "exception", element: <ExceptionPage /> },
      { path: "*", element: <Navigate to="/home" replace /> }
    ]
  }
]);

export const App = () => <RouterProvider router={router} />;

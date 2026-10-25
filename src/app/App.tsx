import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AccountsPage } from "../pages/accounts/AccountsPage";
import { AssistantPage } from "../pages/assistant/AssistantPage";
import { LeaderboardPage } from "../pages/leaderboard/LeaderboardPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { NotificationsPage } from "../pages/notifications/NotificationsPage";
import { ProposalsPage } from "../pages/proposals/ProposalsPage";
import { NewTakePage } from "../pages/takes/NewTakePage";
import { TakeDetailPage } from "../pages/takes/TakeDetailPage";
import { TakesListPage } from "../pages/takes/TakesListPage";
import { AssistantProvider } from "./assistant/AssistantProvider";
import { NoticesProvider } from "./notices/NoticesProvider";
import { UnreadProvider } from "./notifications/UnreadProvider";
import { ApplicationShell } from "./shell/ApplicationShell";
import { StartupGate } from "./startup/StartupGate";
import { ThemeProvider } from "./theme/ThemeProvider";

export default function App() {
  return (
    <ThemeProvider>
      <NoticesProvider>
        <StartupGate>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <AssistantProvider>
              <UnreadProvider>
                <Routes>
                  <Route element={<ApplicationShell />}>
                    <Route element={<Navigate replace to="/takes" />} index />
                    <Route element={<TakesListPage />} path="/takes" />
                    <Route element={<NewTakePage />} path="/takes/new" />
                    <Route element={<TakeDetailPage />} path="/takes/:uid" />
                    <Route element={<LeaderboardPage />} path="/leaderboard" />
                    <Route element={<AccountsPage />} path="/accounts" />
                    <Route element={<ProposalsPage />} path="/proposals" />
                    <Route element={<NotificationsPage />} path="/notifications" />
                    <Route element={<AssistantPage />} path="/assistant" />
                    <Route element={<NotFoundPage />} path="*" />
                  </Route>
                </Routes>
              </UnreadProvider>
            </AssistantProvider>
          </BrowserRouter>
        </StartupGate>
      </NoticesProvider>
    </ThemeProvider>
  );
}

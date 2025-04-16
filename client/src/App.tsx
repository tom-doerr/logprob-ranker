import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Callback from "@/pages/callback";
import RankerPage from "@/pages/ranker";
import { ModelConfigProvider } from "./hooks/use-model-config";
import { AuthProvider } from "./hooks/use-auth";
import AppHeader from "@/components/ui/app-header";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/ranker" component={RankerPage} />
      <Route path="/callback" component={Callback} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ModelConfigProvider>
          <div className="flex flex-col min-h-screen bg-black text-[var(--eva-text)]">
            <main className="flex-grow">
              <Router />
            </main>
          </div>
          <Toaster 
            toastOptions={{
              className: 'bg-black border border-[var(--eva-orange)] text-[var(--eva-text)]',
              style: {
                background: 'black',
                border: '1px solid var(--eva-orange)',
                color: 'var(--eva-text)'
              }
            }}
          />
        </ModelConfigProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

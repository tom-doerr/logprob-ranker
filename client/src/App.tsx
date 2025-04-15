import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Callback from "@/pages/callback";
import { ModelConfigProvider } from "./hooks/use-model-config";
import { AuthProvider } from "./hooks/use-auth";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
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
          <Router />
          <Toaster />
        </ModelConfigProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

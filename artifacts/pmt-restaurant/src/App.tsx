import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from 'wouter';
import { Loader2 } from "lucide-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { CartProvider } from "@/context/CartContext";

import Home from "@/pages/Home";
import OrderOnline from "@/pages/OrderOnline";
import Checkout from "@/pages/Checkout";
import OrderStatus from "@/pages/OrderStatus";
import Reservations from "@/pages/Reservations";
import ReservationStatus from "@/pages/ReservationStatus";
import FeedbackPage from "@/pages/Feedback";
import NotFound from "@/pages/NotFound";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// The staff area is loaded on demand so customers don't download it
const AdminLogin = lazy(() => import("@/pages/AdminLogin"));
const AdminRouter = lazy(() => import("@/pages/Admin"));

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// Start each new page at the top (wouter keeps the previous scroll position)
function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0);
  }, [location]);
  return null;
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <CartProvider>
            <ScrollToTop />
            <Suspense
              fallback={
                <div className="h-screen flex items-center justify-center bg-background">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              }
            >
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/order" component={OrderOnline} />
              <Route path="/order/checkout" component={Checkout} />
              <Route path="/order/status/:token" component={OrderStatus} />
              <Route path="/reservations" component={Reservations} />
              <Route path="/reservations/status/:token" component={ReservationStatus} />
              <Route path="/feedback" component={FeedbackPage} />
              {/* Staff area: not linked anywhere on the public site */}
              <Route path="/admin/login" component={AdminLogin} />
              <Route path="/admin/*?" component={AdminRouter} />
              <Route component={NotFound} />
            </Switch>
            </Suspense>
          </CartProvider>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;

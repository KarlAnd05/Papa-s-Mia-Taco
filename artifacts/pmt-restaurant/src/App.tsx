import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter } from 'wouter';
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

import Home from "@/pages/Home";
import SignInPage from "@/pages/SignIn";
import SignUpPage from "@/pages/SignUp";
import AdminRouter from "@/pages/Admin";
import NotFound from "@/pages/NotFound";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(38 90% 52%)",
    colorBackground: "hsl(20 10% 4%)",
    colorForeground: "hsl(38 60% 90%)",
    colorInput: "hsl(20 12% 8%)",
    colorInputForeground: "hsl(38 60% 90%)",
    colorMutedForeground: "hsl(38 40% 70%)",
    colorNeutral: "hsl(20 12% 15%)",
    colorDanger: "hsl(0 84% 60%)",
    fontFamily: "'Inter', sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#0d0500] rounded-2xl w-[440px] max-w-full overflow-hidden border border-[#211612]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#f5e6c8] font-serif text-2xl",
    headerSubtitle: "text-[#bda485]",
    socialButtonsBlockButtonText: "text-[#f5e6c8]",
    formFieldLabel: "text-[#f5e6c8]",
    footerActionLink: "text-[#e8a020] hover:text-[#f5b842]",
    footerActionText: "text-[#bda485]",
    dividerText: "text-[#bda485]",
    identityPreviewEditButton: "text-[#e8a020]",
    formFieldSuccessText: "text-[#e8a020]",
    alertText: "text-[#f5e6c8]",
    
    logoBox: "flex justify-center mb-6",
    logoImage: "h-12 w-auto",
    socialButtonsBlockButton: "bg-[#160c08] border-[#211612] hover:bg-[#211612]",
    formButtonPrimary: "bg-[#e8a020] text-[#0d0500] hover:bg-[#f5b842] font-semibold",
    formFieldInput: "bg-[#160c08] border-[#211612] text-[#f5e6c8] placeholder:text-[#bda485] focus:ring-[#e8a020]",
    footerAction: "bg-transparent",
    dividerLine: "bg-[#211612]",
    alert: "bg-[#160c08] border-[#211612]",
    otpCodeFieldInput: "bg-[#160c08] border-[#211612] text-[#f5e6c8]",
    formFieldRow: "mb-4",
    main: "px-8 py-6",
  },
};

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClientInstance = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClientInstance.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClientInstance]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Staff Login",
            subtitle: "Sign in to access the PMT Dashboard",
          },
        },
        signUp: {
          start: {
            title: "Join the Team",
            subtitle: "Create your staff account",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ClerkQueryClientCacheInvalidator />
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/admin/*?" component={AdminRouter} />
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
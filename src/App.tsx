import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GuestRoute } from "@/components/GuestRoute";
import Wardrobe from "./pages/Wardrobe";
import StyleLab from "./pages/StyleLab";
import Favorites from "./pages/Favorites";
import CalendarPage from "./pages/CalendarPage";
import MePage from "./pages/MePage";
import Shopping from "./pages/Shopping";
import OutfitStudio from "./pages/OutfitStudio";
import Welcome from "./pages/Welcome";
import LoginPage from "./pages/LoginPage";
import VerifyOtpPage from "./pages/VerifyOtpPage";
import NotFound from "./pages/NotFound";
import CouplePage from "./pages/CouplePage";
import CompareSessionPage from "./pages/CompareSessionPage";
import OOTD from "./pages/OOTD";
import PackingAssistant from "./pages/PackingAssistant";
import Inspired from "./pages/Inspired";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Welcome - always the landing page */}
          <Route path="/" element={<Welcome />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />

          {/* App pages - require login */}
          <Route path="/wardrobe" element={<ProtectedRoute><Wardrobe /></ProtectedRoute>} />
          <Route path="/style" element={<ProtectedRoute><StyleLab /></ProtectedRoute>} />
          <Route path="/style-lab" element={<Navigate to="/style" replace />} />
          <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
          <Route path="/plan" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
          <Route path="/calendar" element={<Navigate to="/plan" replace />} />
          <Route path="/me" element={<ProtectedRoute><MePage /></ProtectedRoute>} />
          <Route path="/shopping" element={<ProtectedRoute><Shopping /></ProtectedRoute>} />
          <Route path="/outfit-studio" element={<ProtectedRoute><OutfitStudio /></ProtectedRoute>} />
          <Route path="/couple" element={<ProtectedRoute><CouplePage /></ProtectedRoute>} />
          <Route path="/couple/session/:id" element={<ProtectedRoute><CompareSessionPage /></ProtectedRoute>} />
          <Route path="/ootd" element={<ProtectedRoute><OOTD /></ProtectedRoute>} />
          <Route path="/packing" element={<ProtectedRoute><PackingAssistant /></ProtectedRoute>} />
          <Route path="/inspired" element={<ProtectedRoute><Inspired /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

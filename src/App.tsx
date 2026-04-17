import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { EmployeeProvider } from "@/context/EmployeeContext";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Employees from "./pages/Employees";
import LeaveManagement from "./pages/LeaveManagement";
import Attendance from "./pages/Attendance";
import Recruitment from "./pages/Recruitment";
import Documents from "./pages/Documents";
import Reports from "./pages/Reports";
import ComingSoon from "./pages/ComingSoon";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Unauthorized from "./pages/Unauthorized";
import Labour from "./pages/Labour";
import CalendarPage from "./pages/Calendar";
import Payroll from "./pages/Payroll";
import Performance from "./pages/Performance";
import Recognitions from "./pages/Recognitions";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import Tasks from "./pages/Tasks";
import Announcements from "./pages/Announcements";
import Training from "./pages/Training";
import Expenses from "./pages/Expenses";
import OrgChart from "./pages/OrgChart";
import Offboarding from "./pages/Offboarding";
import Holidays from "./pages/Holidays";
import Notifications from "./pages/Notifications";
import AuditLogs from "./pages/AuditLogs";
import Inventory from "./pages/Inventory";
import SiteDetails from "./pages/SiteDetails";
import WalletPage from "./pages/Wallet";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <EmployeeProvider>
              <Toaster />
              <Sonner />
              <ErrorBoundary>
                <Routes>
                  {/* Public routes */}
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/unauthorized" element={<Unauthorized />} />

                  {/* Protected routes - All authenticated users */}
                  <Route path="/" element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  } />
                  
                  {/* Employee personal dashboard */}
                  <Route path="/my-dashboard" element={
                    <ProtectedRoute>
                      <EmployeeDashboard />
                    </ProtectedRoute>
                  } />
                  
                  {/* Admin & HR only */}
                  <Route path="/employees" element={
                    <ProtectedRoute allowedRoles={["admin", "hr"]}>
                      <Employees />
                    </ProtectedRoute>
                  } />
                  
                  {/* Admin, HR & Staff */}
                  <Route path="/leave" element={
                    <ProtectedRoute allowedRoles={["admin", "hr", "staff"]}>
                      <LeaveManagement />
                    </ProtectedRoute>
                  } />
                  
                  {/* All authenticated users */}
                  <Route path="/attendance" element={
                    <ProtectedRoute>
                      <Attendance />
                    </ProtectedRoute>
                  } />
                  
                  {/* Admin & HR only */}
                  <Route path="/recruitment" element={
                    <ProtectedRoute allowedRoles={["admin", "hr"]}>
                      <Recruitment />
                    </ProtectedRoute>
                  } />
                  
                  {/* All authenticated users */}
                  <Route path="/documents" element={
                    <ProtectedRoute>
                      <Documents />
                    </ProtectedRoute>
                  } />
                  
                  {/* Admin & HR only */}
                  <Route path="/reports" element={
                    <ProtectedRoute allowedRoles={["admin", "hr"]}>
                      <Reports />
                    </ProtectedRoute>
                  } />

                  {/* Tasks - Admin & HR full control, employees can view/update their own */}
                  <Route path="/tasks" element={
                    <ProtectedRoute>
                      <Tasks />
                    </ProtectedRoute>
                  } />

                  {/* Admin & Contractor - open access, page controls visibility */}
                  <Route path="/labour" element={
                    <ProtectedRoute>
                      <Labour />
                    </ProtectedRoute>
                  } />
                  <Route path="/labour/site/:id" element={
                    <ProtectedRoute>
                      <SiteDetails />
                    </ProtectedRoute>
                  } />

                  <Route path="/notifications" element={
                    <ProtectedRoute>
                      <Notifications />
                    </ProtectedRoute>
                  } />
                  <Route path="/audit-logs" element={
                    <ProtectedRoute allowedRoles={["admin", "hr"]}>
                      <AuditLogs />
                    </ProtectedRoute>
                  } />
                  <Route path="/settings" element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <ComingSoon title="Settings" />
                    </ProtectedRoute>
                  } />
                  <Route path="/calendar" element={
                    <ProtectedRoute>
                      <CalendarPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/payroll" element={
                    <ProtectedRoute allowedRoles={["admin", "hr"]}>
                      <Payroll />
                    </ProtectedRoute>
                  } />
                  <Route path="/performance" element={
                    <ProtectedRoute allowedRoles={["admin", "hr"]}>
                      <Performance />
                    </ProtectedRoute>
                  } />
                  <Route path="/recognitions" element={
                    <ProtectedRoute>
                      <Recognitions />
                    </ProtectedRoute>
                  } />
                  
                  {/* New HRMS Features */}
                  <Route path="/announcements" element={
                    <ProtectedRoute>
                      <Announcements />
                    </ProtectedRoute>
                  } />
                  <Route path="/training" element={
                    <ProtectedRoute allowedRoles={["admin", "hr"]}>
                      <Training />
                    </ProtectedRoute>
                  } />
                  <Route path="/expenses" element={
                    <ProtectedRoute>
                      <Expenses />
                    </ProtectedRoute>
                  } />
                  <Route path="/org-chart" element={
                    <ProtectedRoute>
                      <OrgChart />
                    </ProtectedRoute>
                  } />
                  <Route path="/offboarding" element={
                    <ProtectedRoute allowedRoles={["admin", "hr"]}>
                      <Offboarding />
                    </ProtectedRoute>
                  } />
                  <Route path="/holidays" element={
                    <ProtectedRoute>
                      <Holidays />
                    </ProtectedRoute>
                  } />
                  <Route path="/inventory" element={
                    <ProtectedRoute allowedRoles={["admin", "hr"]}>
                      <Inventory />
                    </ProtectedRoute>
                  } />
                  <Route path="/wallet" element={
                    <ProtectedRoute>
                      <WalletPage />
                    </ProtectedRoute>
                  } />

                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </ErrorBoundary>
            </EmployeeProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

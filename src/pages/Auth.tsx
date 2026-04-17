import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, User, HardHat, Briefcase } from "lucide-react";
import { z } from "zod";

import logo from "@/assets/logo.png";

const emailSchema = z.string()
  .email("Invalid email address")
  .refine((email) => email.endsWith("@shreespaacesolution.com"), {
    message: "Only @shreespaacesolution.com emails are allowed"
  });
const passwordSchema = z.string().min(1, "Password is required");
const usernameSchema = z.string().min(1, "Username is required");

type LoginTab = "employee" | "contractor";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<LoginTab>("employee");
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Employee fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; username?: string }>({});
  
  // Contractor fields
  const [username, setUsername] = useState("");
  const [contractorPassword, setContractorPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  const validateEmployeeForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }

    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateContractorForm = () => {
    const newErrors: { username?: string; password?: string } = {};
    
    try {
      usernameSchema.parse(username);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.username = e.errors[0].message;
      }
    }

    try {
      passwordSchema.parse(contractorPassword);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }

    if (isSignUp && contractorPassword !== confirmPassword) {
      newErrors.password = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmployeeSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-sanitize the email in case user pasted quotes or spaces
    const cleanEmail = email.replace(/^["']|["']$/g, '').trim().toLowerCase();
    
    if (!validateEmployeeForm()) return;

    setIsLoading(true);
    const { error } = isSignUp 
      ? await signUp(cleanEmail, password, cleanEmail.split('@')[0])
      : await signIn(cleanEmail, password);
    setIsLoading(false);

    if (error) {
      toast({
        title: isSignUp ? "Sign Up Failed" : "Login Failed",
        description: error.message.includes("signup") ? "Signups are restricted. Please contact admin or enable in Supabase." : error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: isSignUp ? "Account Created!" : "Welcome back!",
        description: isSignUp ? "Your account has been created. You can sign in now." : "You have successfully logged in.",
      });
      if (isSignUp) {
        setIsSignUp(false);
        setPassword("");
      } else navigate("/");
    }
  };

  const handleContractorSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateContractorForm()) return;

    setIsLoading(true);
    // Contractor login uses username@shreespaacesolution.com format (lowercase for Supabase)
    const contractorEmail = (username.includes("@") ? username : `${username}@shreespaacesolution.com`).toLowerCase().trim();
    
    const { error } = isSignUp 
      ? await signUp(contractorEmail, contractorPassword, username)
      : await signIn(contractorEmail, contractorPassword);
      
    setIsLoading(false);

    if (error) {
      toast({
        title: isSignUp ? "Sign Up Failed" : "Login Failed",
        description: error.message.includes("signup") ? "Signups are restricted. Please check Supabase settings." : error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: isSignUp ? "Contractor Created!" : "Welcome back!",
        description: isSignUp ? "Account created for " + username + ". You can sign in now." : "You have successfully logged in as Contractor.",
      });
      if (isSignUp) {
        setIsSignUp(false);
        setContractorPassword("");
        setConfirmPassword("");
      } else navigate("/labour");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/50 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src={logo} alt="SSS Core App" className="h-14 w-14 object-contain" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">SSS Core App</h1>
            <p className="text-sm text-muted-foreground">Employee Management System</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex mb-0 rounded-t-xl overflow-hidden border border-b-0 border-border/50">
          <button
            type="button"
            onClick={() => { setActiveTab("employee"); setErrors({}); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-all duration-200 ${
              activeTab === "employee"
                ? "bg-card text-foreground border-b-2 border-primary"
                : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted/80"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Employee
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("contractor"); setErrors({}); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-all duration-200 border-l border-border/50 ${
              activeTab === "contractor"
                ? "bg-card text-foreground border-b-2 border-primary"
                : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted/80"
            }`}
          >
            <HardHat className="w-4 h-4" />
            Contractor
          </button>
        </div>

        {/* Employee Login Card */}
        {activeTab === "employee" && (
          <Card className="border-border/50 shadow-xl rounded-t-none border-t-0">
            <form onSubmit={handleEmployeeSignIn}>
              <CardHeader>
                <CardTitle>{isSignUp ? "Create Account" : "Welcome Back"}</CardTitle>
                <CardDescription>
                  {isSignUp 
                    ? "Enter your @shreespaacesolution.com email to register" 
                    : "Enter your credentials to access your account"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="yourname@shreespaacesolution.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>

                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isSignUp ? "Creating Account..." : "Signing in..."}
                    </>
                  ) : (
                    isSignUp ? "Sign Up" : "Sign In"
                  )}
                </Button>

                <div className="text-center mt-2">
                  <button 
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-sm text-primary hover:underline"
                  >
                    {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                  </button>
                </div>

              </CardFooter>
            </form>
          </Card>
        )}

        {/* Contractor Login Card */}
        {activeTab === "contractor" && (
          <Card className="border-border/50 shadow-xl rounded-t-none border-t-0">
            <form onSubmit={handleContractorSignIn}>
              <CardHeader>
                <CardTitle>{isSignUp ? "Join as Contractor" : "Welcome Back"}</CardTitle>
                <CardDescription>
                  {isSignUp 
                    ? "Register a new contractor account" 
                    : "Enter your credentials to access your account"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contractor-username">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="contractor-username"
                      type="text"
                      placeholder="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contractor-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="contractor-password"
                      type="password"
                      placeholder="••••••••"
                      value={contractorPassword}
                      onChange={(e) => setContractorPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="contractor-confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="contractor-confirm-password"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                )}
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isSignUp ? "Creating Account..." : "Signing in..."}
                    </>
                  ) : (
                    isSignUp ? "Create Contractor Account" : "Sign In"
                  )}
                </Button>

                <div className="text-center mt-2">
                  <button 
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-sm text-primary hover:underline"
                  >
                    {isSignUp ? "Already have a contractor account? Sign In" : "New Contractor? Sign Up"}
                  </button>
                </div>
              </CardFooter>
            </form>
          </Card>
        )}

        <div className="text-center mt-12 space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.3em] font-black opacity-40">
            Developed by
          </p>
          <p className="text-sm font-black text-amber-600 tracking-wider drop-shadow-sm">
            Shree Space Solution
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;

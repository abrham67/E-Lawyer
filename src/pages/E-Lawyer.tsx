import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/apiError";
import Navbar from "@/components/Navbar";

const Auth = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "client" as "lawyer" | "client" | "court",
    barNumber: "",
    specialization: "",
    courtName: "",
    jurisdiction: "",
    courtType: ""
  });
  // Handle authentication errors from backend
  const handleAuthError = (error: any) => {
    let errorMessage = error?.message || "Authentication Error";
    toast({
      title: "Authentication Error",
      description: errorMessage,
      variant: "destructive",
      duration: 5000
    });
  };
  const validateForm = () => {
    if (!formData.email || !formData.password) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in both email and password fields.",
        variant: "destructive"
      });
      return false;
    }
    if (!isLogin) {
      if (!formData.fullName) {
        toast({
          title: "Missing Full Name",
          description: "Please enter your full name to create an account.",
          variant: "destructive"
        });
        return false;
      }
      if (formData.role === "lawyer") {
        if (!formData.barNumber) {
          toast({
            title: "Missing Bar Number",
            description: "Lawyers must provide their bar number.",
            variant: "destructive"
          });
          return false;
        }
        if (!formData.specialization) {
          toast({
            title: "Missing Specialization",
            description: "Please specify your area of legal specialization.",
            variant: "destructive"
          });
          return false;
        }
      }
      if (formData.role === "court") {
        if (!formData.courtName) {
          toast({
            title: "Missing Court Name",
            description: "Please enter the court name.",
            variant: "destructive"
          });
          return false;
        }
        if (!formData.jurisdiction) {
          toast({
            title: "Missing Jurisdiction",
            description: "Please specify the court jurisdiction.",
            variant: "destructive"
          });
          return false;
        }
        if (!formData.courtType) {
          toast({
            title: "Missing Court Type",
            description: "Please specify the type of court.",
            variant: "destructive"
          });
          return false;
        }
      }
    }
    return true;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      if (isLogin) {
        // Login using new backend API
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, password: formData.password })
        });
        let data;
        try {
          data = await response.json();
        } catch {
          data = {};
        }
        if (!response.ok) {
          // Show backend error message if available
          const errorMsg = getApiErrorMessage(data, 'Invalid login credentials');
          toast({
            title: "Login Failed",
            description: errorMsg,
            variant: "destructive",
            duration: 5000
          });
          setLoading(false);
          return;
        }
        if (data.token) {
          localStorage.setItem('token', data.token);
          toast({
            title: "Welcome Back!",
            description: "You've successfully logged in.",
            duration: 3000
          });
          setLoading(false);
          navigate("/dashboard"); // Redirect to dashboard after login
        } else {
          toast({
            title: "Login Failed",
            description: data?.error || data?.message || "No token received from server.",
            variant: "destructive",
            duration: 5000
          });
          setLoading(false);
        }
      } else {
        // Signup using new backend API
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            full_name: formData.fullName,
            role: formData.role,
            bar_number: formData.role === "lawyer" ? formData.barNumber : null,
            specialization: formData.role === "lawyer" ? formData.specialization : null,
            court_name: formData.role === "court" ? formData.courtName : null,
            jurisdiction: formData.role === "court" ? formData.jurisdiction : null,
            court_type: formData.role === "court" ? formData.courtType : null
          })
        });
        if (!response.ok) {
          let errMsg = "Registration failed";
          try {
            const errData = await response.json();
            errMsg = getApiErrorMessage(errData, errMsg);
          } catch {}
          toast({
            title: "Registration Failed",
            description: errMsg,
            variant: "destructive",
            duration: 5000
          });
          setLoading(false);
          return;
        }
        toast({
          title: "Account Created Successfully",
          description: "You can now log in with your credentials.",
          duration: 5000
        });
        setLoading(false);
        setIsLogin(true);
        // Pre-fill login form and reset other fields
        setFormData({
          email: formData.email,
          password: formData.password,
          fullName: "",
          role: "client",
          barNumber: "",
          specialization: "",
          courtName: "",
          jurisdiction: "",
          courtType: ""
        });
        // Redirect to login page immediately
        navigate('/auth');
      }
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex items-center justify-center">
        <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg">
        <div className="text-center">
          <p className="text-muted-foreground">
            {isLogin ? "Sign in to your account" : "Create a new account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              value={formData.email} 
              onChange={(e) => setFormData({
                ...formData,
                email: e.target.value
              })} 
              required 
              placeholder="Enter your email address" 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={formData.password} onChange={e => setFormData({
            ...formData,
            password: e.target.value
          })} required placeholder="Enter your password" minLength={6} />
          </div>

          {!isLogin && <>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" type="text" value={formData.fullName} onChange={e => setFormData({
              ...formData,
              fullName: e.target.value
            })} required placeholder="Enter your full name" />
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <RadioGroup value={formData.role} onValueChange={(value: "lawyer" | "client" | "court") => setFormData({
              ...formData,
              role: value
            })} className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="client" id="client" />
                    <Label htmlFor="client">Client</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="lawyer" id="lawyer" />
                    <Label htmlFor="lawyer">Lawyer</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="court" id="court" />
                    <Label htmlFor="court">Court</Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.role === "lawyer" && <>
                  <div className="space-y-2">
                    <Label htmlFor="barNumber">Bar Number</Label>
                    <Input id="barNumber" type="text" value={formData.barNumber} onChange={e => setFormData({
                ...formData,
                barNumber: e.target.value
              })} required placeholder="Enter your bar number" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialization">Specialization</Label>
                    <Input id="specialization" type="text" value={formData.specialization} onChange={e => setFormData({
                ...formData,
                specialization: e.target.value
              })} required placeholder="Enter your specialization" />
                  </div>
                </>}

              {formData.role === "court" && <>
                  <div className="space-y-2">
                    <Label htmlFor="courtName">Court Name</Label>
                    <Input id="courtName" type="text" value={formData.courtName} onChange={e => setFormData({
                ...formData,
                courtName: e.target.value
              })} required placeholder="Enter court name" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jurisdiction">Jurisdiction</Label>
                    <Input id="jurisdiction" type="text" value={formData.jurisdiction} onChange={e => setFormData({
                ...formData,
                jurisdiction: e.target.value
              })} required placeholder="Enter jurisdiction" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="courtType">Court Type</Label>
                    <Input id="courtType" type="text" value={formData.courtType} onChange={e => setFormData({
                ...formData,
                courtType: e.target.value
              })} required placeholder="Enter court type" />
                  </div>
                </>}
            </>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Loading..." : isLogin ? "Sign In" : "Create Account"}
          </Button>
        </form>

        <div className="text-center mt-4">
          <button
            type="button"
            className="text-sm text-primary hover:underline"
            onClick={async () => {
              if (isLogin) {
                // Password reset flow using backend API
                if (!formData.email) {
                  toast({
                    title: "Email Required",
                    description: "Please enter your email address to reset your password.",
                    variant: "destructive"
                  });
                  return;
                }
                setLoading(true);
                const response = await fetch('/api/auth/reset-password', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: formData.email })
                });
                setLoading(false);
                if (!response.ok) {
                  toast({
                    title: "Password Reset Failed",
                    description: "Could not send password reset email.",
                    variant: "destructive"
                  });
                } else {
                  toast({
                    title: "Password Reset Email Sent",
                    description: "Check your inbox for a password reset link.",
                    duration: 6000
                  });
                }
              } else {
                setIsLogin(true);
              }
            }}
          >
            {isLogin ? "Forgot password?" : "Already have an account? Sign in"}
          </button>
        </div>

        <div className="text-center">
          <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-primary hover:underline">
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
        </div>
      </div>
    </div>;
};
export default Auth;
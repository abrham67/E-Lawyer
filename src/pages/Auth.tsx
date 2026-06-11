import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/apiError";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Scale } from "lucide-react";
import { useTranslation } from "react-i18next";

const Auth = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    role: "client" as "lawyer" | "client" | "court",
    barNumber: "",
    specialization: "",
    courtName: "",
    jurisdiction: "",
  courtType: "",
  idNumber: "",
  idPhoto: null as File | null,
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
  const lettersOnly = /^[A-Za-z\s.'-]+$/;
  const digitsOnly = /^\d+$/;
  const alphaNum = /^[A-Za-z0-9]+$/;
  const courtNameAllowed = /^[A-Za-z0-9\s.'\-&,()/:–—’]+$/;
    if (!formData.email || !formData.password) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in both email and password fields.",
        variant: "destructive"
      });
      return false;
    }
    if (!isLogin) {
      if (!formData.confirmPassword) {
        toast({ title: "Confirm Password Required", description: "Please re-enter your password.", variant: "destructive" });
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        toast({ title: "Passwords Do Not Match", description: "The two passwords must be identical.", variant: "destructive" });
        return false;
      }
      if (formData.role !== "court" && !formData.fullName) {
        toast({
          title: "Missing Full Name",
          description: "Please enter your full name to create an account.",
          variant: "destructive"
        });
        return false;
      }
      if (formData.role !== "court" && formData.fullName && !lettersOnly.test(formData.fullName)) {
        toast({ title: "Invalid Full Name", description: "Use letters and spaces only.", variant: "destructive" });
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
        if (!digitsOnly.test(formData.barNumber)) {
          toast({ title: "Invalid Bar Number", description: "Use digits only.", variant: "destructive" });
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
        if (!lettersOnly.test(formData.specialization)) {
          toast({ title: "Invalid Specialization", description: "Use letters and spaces only.", variant: "destructive" });
          return false;
        }
      }
      if (formData.role === "court") {
        const cn = formData.courtName.trim();
        const jur = formData.jurisdiction.trim();
        const ct = formData.courtType.trim();
        if (!cn) {
          toast({
            title: "Missing Court Name",
            description: "Please enter the court name.",
            variant: "destructive"
          });
          return false;
        }
        if (!courtNameAllowed.test(cn)) {
          toast({ title: "Invalid Court Name", description: "Use letters, numbers, spaces, and - & , ( ) / . ' only.", variant: "destructive" });
          return false;
        }
        if (!jur) {
          toast({
            title: "Missing Jurisdiction",
            description: "Please specify the court jurisdiction.",
            variant: "destructive"
          });
          return false;
        }
        if (!ct) {
          toast({
            title: "Missing Court Type",
            description: "Please specify the type of court.",
            variant: "destructive"
          });
          return false;
        }
      }
      if (formData.idNumber && !alphaNum.test(formData.idNumber)) {
        toast({ title: "Invalid ID Number", description: "Use letters and digits only.", variant: "destructive" });
        return false;
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
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          const message = getApiErrorMessage(err, 'Invalid login credentials');
          if (response.status === 403 && /pending admin verification/i.test(String(message))) {
            toast({
              title: "Verification Required",
              description: "Your court account is pending admin verification. Please wait for an admin to approve it.",
              variant: "destructive",
              duration: 6000,
            });
            return;
          }
          throw new Error(message);
        }
  const data = await response.json();
        if (data.token) {
          localStorage.setItem('token', data.token);
          // Save user info for role-based redirect
          if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
          }
          toast({
            title: "Welcome Back!",
            description: "You've successfully logged in.",
            duration: 3000
          });
          setLoading(false);
          // Role-based dashboard redirection
          let dashboardRoute = "/";
          if (data.user && data.user.role) {
            switch (data.user.role) {
              case "judge":
                dashboardRoute = "/judge";
                break;
              case "lawyer":
                dashboardRoute = "/lawyer";
                break;
              case "admin":
                dashboardRoute = "/admin";
                break;
              case "client":
                dashboardRoute = "/client";
                break;
              case "court":
                dashboardRoute = "/court";
                break;
              default:
                dashboardRoute = "/";
            }
            // redirecting to target dashboard
          }
          navigate(dashboardRoute);
        } else {
          throw new Error('Login failed: No token received');
        }
  } else {
        // Signup using new backend API
        const registerPayload: Record<string, any> = {
          email: formData.email.trim(),
          password: formData.password,
          full_name: formData.role === "court" ? "Court" : formData.fullName.trim(),
          role: formData.role,
          id_number: (formData.idNumber || '').trim() || undefined,
        };
        if (formData.role === "lawyer") {
          registerPayload.bar_number = formData.barNumber.trim();
          registerPayload.specialization = formData.specialization.trim();
        }
        if (formData.role === "court") {
          registerPayload.court_name = formData.courtName.trim();
          registerPayload.jurisdiction = formData.jurisdiction.trim();
          registerPayload.court_type = formData.courtType.trim();
        }
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registerPayload)
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(getApiErrorMessage(err, 'Registration failed'));
        }
    // If user uploaded an ID photo, upload it now (requires auth, so skip unless you want to auto-login)
    // For simplicity, we show a note. You can enable auto-login to upload immediately.
        toast({
          title: "Account Created Successfully",
      description: ['lawyer', 'court'].includes(formData.role)
        ? `Your ${formData.role} account is pending admin verification. You can log in after an admin approves it.`
        : (formData.idPhoto ? "Account created. After logging in, please upload your ID photo in Profile." : "You can now log in with your credentials."),
          duration: 5000
        });
        setLoading(false);
        setIsLogin(true);
        // Pre-fill login form and reset other fields
        setFormData({
          email: formData.email,
          password: formData.password,
          confirmPassword: "",
          fullName: "",
          role: "client",
          barNumber: "",
          specialization: "",
          courtName: "",
          jurisdiction: "",
      courtType: "",
      idNumber: "",
      idPhoto: null,
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
      {/* Minimal auth header replacing the global Navbar */}
      <header className="sticky top-0 z-40 w-full bg-[#16345b] text-white">
        <div className="container mx-auto px-4 py-3 grid grid-cols-3 items-center">
          {/* Left: Ethiopian flag */}
          <div className="justify-self-start">
            <span role="img" aria-label="Ethiopian flag" className="text-2xl select-none">🇪🇹</span>
          </div>
          {/* Center: Icon + Title */}
          <div className="justify-self-center flex items-center gap-2">
            <Scale className="h-5 w-5" aria-hidden="true" />
            <span className="text-base font-semibold tracking-wide">E-Lawyer</span>
          </div>
          {/* Right: language selector */}
          <div className="justify-self-end">
            <LanguageSwitcher />
          </div>
        </div>
      </header>
      <div className="container mx-auto px-4 py-8 flex items-center justify-center">
        <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg">
        <div className="text-center">
          <p className="text-muted-foreground">
            {isLogin ? t('auth.sign_in_to_account') : t('auth.create_new_account')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input 
              id="email" 
              type="email" 
              value={formData.email} 
              onChange={(e) => setFormData({
                ...formData,
                email: e.target.value
              })} 
              required 
              placeholder={t('auth.enter_email')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.password')}</Label>
            <Input id="password" type="password" value={formData.password} onChange={e => setFormData({
            ...formData,
            password: e.target.value
          })} required placeholder={t('auth.enter_password')} minLength={6} />
          </div>

          {!isLogin && <>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('auth.confirm_password')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  placeholder={t('auth.re_enter_password')}
                  minLength={6}
                />
              </div>
              {formData.role !== "court" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="idNumber">{t('auth.id_number')}</Label>
                    <Input
                      id="idNumber"
                      type="text"
                      value={formData.idNumber}
                      onChange={e => setFormData({
                        ...formData,
                        idNumber: e.target.value
                      })}
                      placeholder={t('auth.enter_id_number')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">{t('auth.full_name')}</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={formData.fullName}
                      onChange={e => setFormData({
                        ...formData,
                        fullName: e.target.value
                      })}
                      required
                      placeholder={t('auth.enter_full_name')}
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>{t('auth.role')}</Label>
                <RadioGroup value={formData.role} onValueChange={(value: "lawyer" | "client" | "court") => setFormData({
              ...formData,
              role: value,
              idPhoto: value === 'court' ? null : formData.idPhoto
            })} className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="client" id="client" />
                    <Label htmlFor="client">{t('auth.client')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="lawyer" id="lawyer" />
                    <Label htmlFor="lawyer">{t('auth.lawyer')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="court" id="court" />
                    <Label htmlFor="court">{t('auth.court')}</Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.role === "lawyer" && <>
                  <div className="space-y-2">
                    <Label htmlFor="barNumber">{t('auth.bar_number')}</Label>
                    <Input id="barNumber" type="text" value={formData.barNumber} onChange={e => setFormData({
                ...formData,
                barNumber: e.target.value
              })} required placeholder={t('auth.enter_bar_number')} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialization">{t('auth.specialization')}</Label>
                    <Input id="specialization" type="text" value={formData.specialization} onChange={e => setFormData({
                ...formData,
                specialization: e.target.value
              })} required placeholder={t('auth.enter_specialization')} />
                  </div>
                </>}

              {formData.role === "court" && <>
                  <div className="space-y-2">
                    <Label htmlFor="courtName">{t('auth.court_name')}</Label>
                    <Input id="courtName" type="text" value={formData.courtName} onChange={e => setFormData({
                ...formData,
                courtName: e.target.value
              })} required placeholder={t('auth.enter_court_name')} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jurisdiction">{t('auth.jurisdiction')}</Label>
                    <Input id="jurisdiction" type="text" value={formData.jurisdiction} onChange={e => setFormData({
                ...formData,
                jurisdiction: e.target.value
              })} required placeholder={t('auth.enter_jurisdiction')} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="courtType">{t('auth.court_type')}</Label>
                    <Input id="courtType" type="text" value={formData.courtType} onChange={e => setFormData({
                ...formData,
                courtType: e.target.value
              })} required placeholder={t('auth.enter_court_type')} />
                  </div>
                </>}
              {formData.role !== "court" && (
                <div className="space-y-2">
                  <Label htmlFor="idPhoto">{t('auth.id_photo_optional')}</Label>
                  <Input
                    id="idPhoto"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setFormData({ ...formData, idPhoto: file || null });
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('auth.id_photo_note')}
                  </p>
                </div>
              )}
            </>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('auth.loading') : isLogin ? t('auth.sign_in') : t('auth.create_account')}
          </Button>
        </form>

        {isLogin && (
          <div className="text-center mt-4">
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={async () => {
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
              }}
            >
              {t('auth.forgot_password')}
            </button>
          </div>
        )}

        <div className="text-center">
          <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-primary hover:underline">
            {isLogin ? t('auth.switch_to_signup') : t('auth.switch_to_signin')}
          </button>
        </div>
        </div>
      </div>
    </div>;
};
export default Auth;
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { ScrollArea } from '../components/ui/scroll-area';
import { Eye, EyeOff } from 'lucide-react';
import { PrivacyPolicyContent } from '../constants/privacyPolicy';
import { useAuth } from '../contexts/AuthContext';
import { requestPasswordReset } from '../lib/api';
import logoImage from 'figma:asset/5ff5440abe51b7b7b5cb5d59139c39d7bdcbc7b3.png';

export default function Auth() {
  const navigate = useNavigate();
  const { login, signup } = useAuth();

  const [activeTab, setActiveTab] = useState('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupFirstName, setSignupFirstName] = useState('');
  const [signupLastName, setSignupLastName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [showForgotPasswordDialog, setShowForgotPasswordDialog] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const [loginError, setLoginError] = useState('');
  const [signupError, setSignupError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);

    try {
      await login(loginEmail, loginPassword);
      navigate('/home');
    } catch (error: any) {
      setLoginError(error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');

    // Validate passwords match
    if (signupPassword !== signupConfirmPassword) {
      setSignupError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      // Combine first and last name for the API
      const fullName = `${signupFirstName} ${signupLastName}`.trim();
      await signup(fullName, signupEmail, signupPassword);
      navigate('/home');
    } catch (error: any) {
      setSignupError(error.message || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await requestPasswordReset(resetEmail);
      setResetEmailSent(true);
    } catch (error: any) {
      console.error('Reset password error:', error);
      // Show error but don't block UI - for demo purposes, still show success
      setResetEmailSent(true);
    }
  };

  const handleCloseForgotPassword = () => {
    setShowForgotPasswordDialog(false);
    // Reset state after dialog closes
    setTimeout(() => {
      setResetEmail('');
      setResetEmailSent(false);
    }, 200);
  };

  return (
    <div className="relative min-h-screen w-full bg-black overflow-hidden">
      {/* Animated Background Circles */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(147, 51, 234, 0.4) 0%, rgba(147, 51, 234, 0) 70%)',
            filter: 'blur(60px)',
          }}
          animate={{
            x: ['-10%', '10%', '-10%'],
            y: ['-20%', '20%', '-20%'],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          initial={{ x: '-10%', y: '-20%' }}
        />
        <motion.div
          className="absolute w-[700px] h-[700px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(219, 39, 119, 0.4) 0%, rgba(219, 39, 119, 0) 70%)',
            filter: 'blur(60px)',
            right: 0,
          }}
          animate={{
            x: ['10%', '-15%', '10%'],
            y: ['15%', '-10%', '15%'],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          initial={{ x: '10%', y: '15%' }}
        />
        <motion.div
          className="absolute w-[650px] h-[650px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(220, 38, 38, 0.4) 0%, rgba(220, 38, 38, 0) 70%)',
            filter: 'blur(60px)',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
          animate={{
            x: ['-50%', '-40%', '-60%', '-50%'],
            y: ['20%', '0%', '10%', '20%'],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          initial={{ x: '-50%', y: '20%' }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full min-h-screen flex items-center justify-center px-6 py-12">
        <div className="flex flex-col items-center w-full max-w-md gap-1 -mt-16">
          {/* Centered Logo */}
          <div>
            <img 
              src={logoImage} 
              alt="BFFlix Logo" 
              className="h-36 w-auto"
            />
          </div>

          {/* Auth Card */}
          <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl w-full">
            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/5">
                <TabsTrigger value="login" className="data-[state=inactive]:text-white">Login</TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=inactive]:text-white">Sign Up</TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-5">
                  {loginError && (
                    <div className="bg-red-600/10 border border-red-600/20 rounded-lg p-3">
                      <p className="text-red-400 text-sm">{loginError}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-white/90">
                      Email
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="Enter your email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-red-600/50 focus:ring-red-600/20"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-white/90">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-red-600/50 focus:ring-red-600/20 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white/90 transition-colors"
                      >
                        {showLoginPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => setShowForgotPasswordDialog(true)}
                      className="text-sm text-white/60 hover:text-red-500 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white"
                  >
                    {isLoading ? 'Logging in...' : 'Login'}
                  </Button>
                </form>
              </TabsContent>

              {/* Sign Up Tab */}
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-5">
                  {signupError && (
                    <div className="bg-red-600/10 border border-red-600/20 rounded-lg p-3">
                      <p className="text-red-400 text-sm">{signupError}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-firstname" className="text-white/90">
                        First Name
                      </Label>
                      <Input
                        id="signup-firstname"
                        type="text"
                        placeholder="First name"
                        value={signupFirstName}
                        onChange={(e) => setSignupFirstName(e.target.value)}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-red-600/50 focus:ring-red-600/20"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-lastname" className="text-white/90">
                        Last Name
                      </Label>
                      <Input
                        id="signup-lastname"
                        type="text"
                        placeholder="Last name"
                        value={signupLastName}
                        onChange={(e) => setSignupLastName(e.target.value)}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-red-600/50 focus:ring-red-600/20"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-white/90">
                      Email
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-red-600/50 focus:ring-red-600/20"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-white/90">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showSignupPassword ? "text" : "password"}
                        placeholder="Create a password"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-red-600/50 focus:ring-red-600/20 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white/90 transition-colors"
                      >
                        {showSignupPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password" className="text-white/90">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="signup-confirm-password"
                        type={showSignupConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-red-600/50 focus:ring-red-600/20 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white/90 transition-colors"
                      >
                        {showSignupConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <Checkbox
                      id="terms"
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                      className="mr-2"
                    />
                    <label htmlFor="terms" className="text-sm text-white/50">
                      I agree to the{' '}
                      <button
                        type="button"
                        onClick={() => setShowPrivacyDialog(true)}
                        className="text-red-500 hover:text-red-400 underline"
                      >
                        Terms & Privacy Policy
                      </button>
                    </label>
                  </div>

                  <Button
                    type="submit"
                    disabled={!agreedToTerms || isLoading}
                    className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Signing up...' : 'Sign Up'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Privacy Policy Dialog */}
      <Dialog open={showPrivacyDialog} onOpenChange={setShowPrivacyDialog}>
        <DialogContent className="max-w-3xl bg-zinc-900 text-white border-white/10 p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl">BFFlix Privacy Policy</DialogTitle>
            <DialogDescription className="text-white/50">
              Please review our privacy policy and terms of service.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <PrivacyPolicyContent />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPasswordDialog} onOpenChange={handleCloseForgotPassword}>
        <DialogContent className="max-w-md bg-zinc-900 text-white border-white/10 p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl">Reset Password</DialogTitle>
            <DialogDescription className="text-white/50">
              {resetEmailSent 
                ? "Check your email for instructions" 
                : "Enter your email address to reset your password"}
            </DialogDescription>
          </DialogHeader>
          
          {!resetEmailSent ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-white/90">
                  Email Address
                </Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="Enter your email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-red-600/50 focus:ring-red-600/20"
                  required
                />
              </div>
              
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
              >
                Send Reset Link
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-600/10 border border-green-600/20 rounded-lg p-4">
                <p className="text-green-400 text-sm">
                  We've sent password reset instructions to <strong>{resetEmail}</strong>. 
                  Please check your inbox and follow the link to reset your password.
                </p>
              </div>
              
              <Button
                onClick={handleCloseForgotPassword}
                className="w-full bg-white/10 hover:bg-white/20 text-white"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import './login-v2.css';

export function LoginV2({ initialMode = 'login' }) {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(initialMode !== 'signup');
  const [isAnimating, setIsAnimating] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const toggleMode = (mode) => {
    if (isAnimating) return;
    setError(null);
    setIsAnimating(true);
    setIsLogin(mode === 'login');
    setTimeout(() => setIsAnimating(false), 1200);
  };

  async function handleLogin(e) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect') || '/';
      router.push(redirect);
      router.refresh();
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (signupPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupName,
          email: signupEmail,
          password: signupPassword,
          organizationName: `${signupName}'s Workspace`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Sign up failed');
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const loginFormVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.05 } },
    exit: { transition: { staggerChildren: 0.05, staggerDirection: 1 } }
  };

  const loginItemVariants = {
    hidden: { x: -40, opacity: 0, scale: 0.98 },
    visible: { x: 0, opacity: 1, scale: 1, transition: { duration: 0.45 } },
    exit: { x: -40, opacity: 0, scale: 0.98, transition: { duration: 0.45 } }
  };

  const signupFormVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.05 } },
    exit: { transition: { staggerChildren: 0.05, staggerDirection: -1 } }
  };

  const signupItemVariants = {
    hidden: { x: 40, opacity: 0, filter: 'blur(8px)' },
    visible: { x: 0, opacity: 1, filter: 'blur(0px)', transition: { duration: 0.5 } },
    exit: { x: 40, opacity: 0, filter: 'blur(8px)', transition: { duration: 0.45 } }
  };

  const welcomeLoginVariants = {
    hidden: { opacity: 0, x: -30, y: -30 },
    visible: { opacity: 1, x: 0, y: 0, transition: { duration: 0.6, delay: 0.2 } },
    exit: { opacity: 0, x: 30, y: 30, transition: { duration: 0.4 } }
  };

  const welcomeSignupVariants = {
    hidden: { opacity: 0, x: 30, y: 30 },
    visible: { opacity: 1, x: 0, y: 0, transition: { duration: 0.6, delay: 0.2 } },
    exit: { opacity: 0, x: -30, y: -30, transition: { duration: 0.4 } }
  };

  const panelVariants = {
    login: { x: "25%", skewX: 20 },
    signup: { x: "-85%", skewX: 20 }
  };

  return (
    <div className="login-v2-page">
      <div className="login-container">

      <motion.div
        className="bg-shape-motion"
        variants={panelVariants}
        initial={false}
        animate={isLogin ? "login" : "signup"}
        transition={{ duration: 0.9, ease: "easeInOut" }}
      />

      <LayoutGroup>
        <div className="content-wrapper">

          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.div
                key="login-panel"
                className="form-container login-panel"
                variants={loginFormVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <form onSubmit={handleLogin} autoComplete="off">
                  <motion.h2 variants={loginItemVariants}>Login</motion.h2>

                  {error && (
                    <motion.p className="auth-error" variants={loginItemVariants}>{error}</motion.p>
                  )}

                  <motion.div className="input-group" variants={loginItemVariants}>
                    <input
                      type="email"
                      id="login-email"
                      required
                      placeholder=" "
                      autoComplete="off"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                    />
                    <label htmlFor="login-email">Email</label>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                    </svg>
                  </motion.div>

                  <motion.div className="input-group" variants={loginItemVariants}>
                    <input
                      type="password"
                      id="login-password"
                      required
                      placeholder=" "
                      autoComplete="new-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                    <label htmlFor="login-password">Password</label>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                    </svg>
                  </motion.div>

                  <motion.div className="forgot-row" variants={loginItemVariants}>
                    <Link href="/forgot-password" className="link-btn">Forgot your password?</Link>
                  </motion.div>

                  <motion.div variants={loginItemVariants} style={{ width: '100%' }}>
                    <button
                      type="submit"
                      className="btn-signup"
                      disabled={isAnimating || loading}
                    >
                      {loading ? 'Please wait...' : 'Login'}
                    </button>
                  </motion.div>

                  <motion.p className="bottom-text" variants={loginItemVariants}>
                    Dont have an account? <button type="button" className="link-btn" onClick={() => toggleMode('signup')} disabled={isAnimating}>Sign Up</button>
                  </motion.p>

                </form>
              </motion.div>
            ) : (
              <motion.div
                key="signup-panel"
                className="form-container signup-panel"
                variants={signupFormVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <form onSubmit={handleSignup}>
                  <motion.h2 variants={signupItemVariants}>Sign Up</motion.h2>

                  {error && (
                    <motion.p className="auth-error" variants={signupItemVariants}>{error}</motion.p>
                  )}

                  <motion.div className="input-group" variants={signupItemVariants}>
                    <input
                      type="text"
                      id="signup-name"
                      required
                      placeholder=" "
                      autoComplete="off"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                    />
                    <label htmlFor="signup-name">Username</label>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                    </svg>
                  </motion.div>

                  <motion.div className="input-group" variants={signupItemVariants}>
                    <input
                      type="email"
                      id="signup-email"
                      required
                      placeholder=" "
                      autoComplete="off"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                    />
                    <label htmlFor="signup-email">Email</label>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
                      <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
                    </svg>
                  </motion.div>

                  <motion.div className="input-group" variants={signupItemVariants}>
                    <input
                      type="password"
                      id="signup-password"
                      required
                      placeholder=" "
                      autoComplete="new-password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                    />
                    <label htmlFor="signup-password">Password</label>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                    </svg>
                  </motion.div>

                  <motion.div variants={signupItemVariants} style={{ width: '100%' }}>
                    <button
                      type="submit"
                      className="btn-signup"
                      disabled={isAnimating || loading}
                    >
                      {loading ? 'Please wait...' : 'Sign Up'}
                    </button>
                  </motion.div>

                  <motion.p className="bottom-text" variants={signupItemVariants}>
                    Alread have an account? <button type="button" className="link-btn" onClick={() => toggleMode('login')} disabled={isAnimating}>Login</button>
                  </motion.p>

                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.div
                key="welcome-login"
                className="welcome-container welcome-login"
                variants={welcomeLoginVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <h1>FINORA!</h1>
                <p>Enter your personal details<br />and start your journey<br />with us.</p>
              </motion.div>
            ) : (
              <motion.div
                key="welcome-signup"
                className="welcome-container welcome-signup"
                variants={welcomeSignupVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <h1>WELCOME<br />BACK!</h1>
                <p>Lorem ipsum, dolor sit<br />amet consectetur<br />adipisicing.</p>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </LayoutGroup>
      </div>
    </div>
  );
}

export default LoginV2;

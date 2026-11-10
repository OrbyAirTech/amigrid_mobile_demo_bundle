/**
 * The two short-lived tokens that carry a sign-up from one screen to the next. Kept in memory on purpose:
 * they expire in minutes, so there is nothing to restore after the app is closed.
 */
let verifyToken: string | null = null; // from verify_email, used to submit the code
let signupToken: string | null = null; // from verify_email_otp, used to create the account

export const signupFlow = {
  setVerifyToken(t: string | null) {
    verifyToken = t;
  },
  getVerifyToken: () => verifyToken,
  setSignupToken(t: string | null) {
    signupToken = t;
  },
  getSignupToken: () => signupToken,
  reset() {
    verifyToken = null;
    signupToken = null;
  },
};

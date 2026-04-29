// import {
//   createContext,
//   useContext,
//   useReducer,
//   useEffect,
//   ReactNode,
// } from 'react';
// import toast from 'react-hot-toast';
// import { authAPI } from '../lib/api';

// /* ======================================================
//    Types
// ====================================================== */

// export interface User {
//   _id: string;
//   name: string;
//   email: string;
//   role: 'USER' | 'ADMIN';
//   preferences?: {
//     twoFactorAuth?: boolean;
//   };
// }

// interface AuthState {
//   user: User | null;
//   isAuthenticated: boolean;
//   isLoading: boolean;
//   requiresTwoFactor: boolean;
//   tempUserId: string | null;
// }

// type AuthAction =
//   | { type: 'SET_LOADING'; payload: boolean }
//   | { type: 'LOGIN_SUCCESS'; payload: { user: User } }
//   | { type: 'LOGIN_REQUIRES_2FA'; payload: { userId: string } }
//   | { type: 'UPDATE_USER'; payload: Partial<User> }
//   | { type: 'CLEAR_2FA' }
//   | { type: 'LOGOUT' };

// interface AuthContextType extends AuthState {
//   register: (data: any) => Promise<{ success: boolean }>;
//   verifyEmail: (otp: string) => Promise<{ success: boolean }>;
//   resendVerificationOTP: (email: string) => Promise<{ success: boolean }>;
//   login: (
//     email: string,
//     password: string
//   ) => Promise<{ success?: boolean; requiresTwoFactor?: boolean }>;
//   verifyTwoFactor: (otp: string) => Promise<{ success: boolean }>;
//   requestPasswordReset: (email: string) => Promise<any>;
//   resetPassword: (email: string, otp: string, password: string) => Promise<any>;
//   updateProfile: (data: Partial<User>) => Promise<{ success: boolean }>;
//   changePassword: (
//     currentPassword: string,
//     newPassword: string
//   ) => Promise<{ success: boolean }>;
//   toggleTwoFactor: (enabled: boolean) => Promise<void>;
//   logout: () => Promise<void>;
//   clear2FA: () => void;
// }

// /* ======================================================
//    Initial State
// ====================================================== */

// const initialState: AuthState = {
//   user: null,
//   isAuthenticated: false,
//   isLoading: true,
//   requiresTwoFactor: false,
//   tempUserId: null,
// };

// /* ======================================================
//    Reducer
// ====================================================== */

// const authReducer = (state: AuthState, action: AuthAction): AuthState => {
//   switch (action.type) {
//     case 'SET_LOADING':
//       return { ...state, isLoading: action.payload };

//     case 'LOGIN_SUCCESS':
//       return {
//         ...state,
//         user: action.payload.user,
//         isAuthenticated: true,
//         isLoading: false,
//         requiresTwoFactor: false,
//         tempUserId: null,
//       };

//     case 'LOGIN_REQUIRES_2FA':
//       return {
//         ...state,
//         requiresTwoFactor: true,
//         tempUserId: action.payload.userId,
//         isLoading: false,
//       };

//     case 'UPDATE_USER':
//       return {
//         ...state,
//         user: state.user ? { ...state.user, ...action.payload } : null,
//       };

//     case 'CLEAR_2FA':
//       return { ...state, requiresTwoFactor: false, tempUserId: null };

//     case 'LOGOUT':
//       return { ...initialState, isLoading: false };

//     default:
//       return state;
//   }
// };

// /* ======================================================
//    Context
// ====================================================== */

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// /* ======================================================
//    Provider
// ====================================================== */

// export const AuthProvider = ({ children }: { children: ReactNode }) => {
//   const [state, dispatch] = useReducer(authReducer, initialState);

//   useEffect(() => {
//     const token = localStorage.getItem('accessToken');
//     const userData = localStorage.getItem('user');

//     if (!token || !userData) {
//       dispatch({ type: 'SET_LOADING', payload: false });
//       return;
//     }

//     try {
//       const user: User = JSON.parse(userData);
//       dispatch({ type: 'LOGIN_SUCCESS', payload: { user } });
//     } catch {
//       localStorage.clear();
//       dispatch({ type: 'SET_LOADING', payload: false });
//     }
//   }, []);

//   /* ===================== ACTIONS ===================== */

//   const register = async (data: any) => {
//     await authAPI.register(data);
//     toast.success('Registration successful');
//     return { success: true };
//   };

//   // ✅ FIXED: OTP ONLY
//   const verifyEmail = async (otp: string) => {
//     const res = await authAPI.verifyEmail({ otp });

//     const { accessToken, refreshToken, user } = res.data.data;
//     localStorage.setItem('accessToken', accessToken);
//     localStorage.setItem('refreshToken', refreshToken);
//     localStorage.setItem('user', JSON.stringify(user));

//     dispatch({ type: 'LOGIN_SUCCESS', payload: { user } });
//     toast.success('Email verified successfully');
//     return { success: true };
//   };

//   const resendVerificationOTP = async (email: string) => {
//     await authAPI.resendVerification({ email });
//     toast.success('OTP resent');
//     return { success: true };
//   };

//   const login = async (email: string, password: string) => {
//     const res = await authAPI.login({ email, password });

//     if (res.data.data.requiresTwoFactor) {
//       dispatch({
//         type: 'LOGIN_REQUIRES_2FA',
//         payload: { userId: res.data.data.userId },
//       });
//       return { requiresTwoFactor: true };
//     }

//     const { accessToken, refreshToken, user } = res.data.data;
//     localStorage.setItem('accessToken', accessToken);
//     localStorage.setItem('refreshToken', refreshToken);
//     localStorage.setItem('user', JSON.stringify(user));

//     dispatch({ type: 'LOGIN_SUCCESS', payload: { user } });
//     toast.success('Login successful');
//     return { success: true };
//   };

//   const verifyTwoFactor = async (otp: string) => {
//     const res = await authAPI.verifyTwoFactor({
//       userId: state.tempUserId,
//       otp,
//     });

//     const { accessToken, refreshToken, user } = res.data.data;
//     localStorage.setItem('accessToken', accessToken);
//     localStorage.setItem('refreshToken', refreshToken);
//     localStorage.setItem('user', JSON.stringify(user));

//     dispatch({ type: 'LOGIN_SUCCESS', payload: { user } });
//     toast.success('2FA verified');
//     return { success: true };
//   };

//   const updateProfile = async (data: Partial<User>) => {
//     const res = await authAPI.updateProfile(data);
//     localStorage.setItem('user', JSON.stringify(res.data.data));
//     dispatch({ type: 'UPDATE_USER', payload: res.data.data });
//     toast.success('Profile updated');
//     return { success: true };
//   };

//   const changePassword = async (currentPassword: string, newPassword: string) => {
//     await authAPI.changePassword({ currentPassword, newPassword });
//     toast.success('Password changed');
//     return { success: true };
//   };

//   const toggleTwoFactor = async (enabled: boolean) => {
//     await authAPI.toggleTwoFactor({ enabled });

//     if (!state.user) return;

//     const updatedUser: User = {
//       ...state.user,
//       preferences: {
//         ...state.user.preferences,
//         twoFactorAuth: enabled,
//       },
//     };

//     localStorage.setItem('user', JSON.stringify(updatedUser));
//     dispatch({ type: 'UPDATE_USER', payload: updatedUser });
//     toast.success('2FA updated');
//   };

//   const logout = async () => {
//     try {
//       await authAPI.logout();
//     } finally {
//       localStorage.clear();
//       dispatch({ type: 'LOGOUT' });
//       toast.success('Logged out');
//     }
//   };

//   const clear2FA = () => dispatch({ type: 'CLEAR_2FA' });

//   return (
//     <AuthContext.Provider
//       value={{
//         ...state,
//         register,
//         verifyEmail,
//         resendVerificationOTP,
//         login,
//         verifyTwoFactor,
//         requestPasswordReset: authAPI.requestPasswordReset,
//         resetPassword: authAPI.resetPassword,
//         updateProfile,
//         changePassword,
//         toggleTwoFactor,
//         logout,
//         clear2FA,
//       }}
//     >
//       {children}
//     </AuthContext.Provider>
//   );
// };

// /* ======================================================
//    Hook
// ====================================================== */

// export const useAuth = (): AuthContextType => {
//   const ctx = useContext(AuthContext);
//   if (!ctx) throw new Error('useAuth must be used within AuthProvider');
//   return ctx;
// };

// export default AuthContext;

// import React, { createContext, useContext, useReducer, useEffect } from 'react';
// import { authAPI } from '../lib/api';
// import toast from 'react-hot-toast';

// // Initial state
// const initialState = {
//   user: null,
//   isAuthenticated: false, // ✅ FIXED
//   isLoading: true,
//   requiresTwoFactor: false,
//   tempUserId: null,
// };


// // Action types
// const AUTH_ACTIONS = {
//   SET_LOADING: 'SET_LOADING',
//   LOGIN_SUCCESS: 'LOGIN_SUCCESS',
//   LOGIN_REQUIRES_2FA: 'LOGIN_REQUIRES_2FA',
//   LOGOUT: 'LOGOUT',
//   UPDATE_USER: 'UPDATE_USER',
//   CLEAR_2FA: 'CLEAR_2FA',
// };

// // Reducer
// const authReducer = (state, action) => {
//   switch (action.type) {
//     case AUTH_ACTIONS.SET_LOADING:
//       return {
//         ...state,
//         isLoading: action.payload,
//       };
//     case AUTH_ACTIONS.LOGIN_SUCCESS:
//       return {
//         ...state,
//         user: action.payload.user,
//         isAuthenticated: true,
//         isLoading: false,
//         requiresTwoFactor: false,
//         tempUserId: null,
//       };
//     case AUTH_ACTIONS.LOGIN_REQUIRES_2FA:
//       return {
//         ...state,
//         requiresTwoFactor: true,
//         tempUserId: action.payload.userId,
//         isLoading: false,
//       };
//     case AUTH_ACTIONS.LOGOUT:
//       return {
//         ...state,
//         user: null,
//         isAuthenticated: false,
//         isLoading: false,
//         requiresTwoFactor: false,
//         tempUserId: null,
//       };
//     case AUTH_ACTIONS.UPDATE_USER:
//       return {
//         ...state,
//         user: { ...state.user, ...action.payload },
//       };
//     case AUTH_ACTIONS.CLEAR_2FA:
//       return {
//         ...state,
//         requiresTwoFactor: false,
//         tempUserId: null,
//       };
//     default:
//       return state;
//   }
// };

// // Create context
// const AuthContext = createContext();

// // Auth provider component
// export const AuthProvider = ({ children }) => {
//   const [state, dispatch] = useReducer(authReducer, initialState);

//   // Check if user is logged in on app start
//   useEffect(() => {
//   const checkAuth = async () => {
//     try {
//       const token = localStorage.getItem('accessToken');
//       const userData = localStorage.getItem('user');

//       if (!token || !userData) {
//         dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
//         return;
//       }

//       // OPTIONAL: call backend /me endpoint if you have it
//       const user = JSON.parse(userData);
//       dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: { user } });
//     } catch (err) {
//       logout();
//     }
//   };

//   checkAuth();
// }, []);

//   // Register function
//   const register = async (userData) => {
//     try {
//       dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
//       const response = await authAPI.register(userData);
      
//       toast.success(response.data.message);
//       return { success: true, data: response.data };
//     } catch (error) {
//       const message = error.response?.data?.message || 'Registration failed';
//       toast.error(message);
//       return { success: false, error: message };
//     } finally {
//       dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
//     }
//   };

//   // Verify email function
//   const verifyEmail = async (email, otp) => {
//     try {
//       dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
//       const response = await authAPI.verifyEmail({ email, otp });
      
//       const { accessToken, refreshToken, user } = response.data.data;
      
//       // Store tokens and user data
//       localStorage.setItem('accessToken', accessToken);
//       localStorage.setItem('refreshToken', refreshToken);
//       localStorage.setItem('user', JSON.stringify(user));
      
//       dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: { user } });
//       toast.success('Email verified successfully!');
      
//       return { success: true };
//     } catch (error) {
//       const message = error.response?.data?.message || 'Email verification failed';
//       toast.error(message);
//       return { success: false, error: message };
//     } finally {
//       dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
//     }
//   };

//   // Resend verification OTP
//   const resendVerificationOTP = async (email) => {
//     try {
//       const response = await authAPI.resendVerification({ email });
//       toast.success(response.data.message);
//       return { success: true };
//     } catch (error) {
//       const message = error.response?.data?.message || 'Failed to resend OTP';
//       toast.error(message);
//       return { success: false, error: message };
//     }
//   };

//   // Login function
//   const login = async (email, password) => {
//     try {
//       dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
//       const response = await authAPI.login({ email, password });
      
//       if (response.data.data.requiresTwoFactor) {
//         dispatch({ 
//           type: AUTH_ACTIONS.LOGIN_REQUIRES_2FA, 
//           payload: { userId: response.data.data.userId } 
//         });
//         toast.success(response.data.message);
//         return { success: true, requiresTwoFactor: true };
//       } else {
//         const { accessToken, refreshToken, user } = response.data.data;
        
//         // Store tokens and user data
//         localStorage.setItem('accessToken', accessToken);
//         localStorage.setItem('refreshToken', refreshToken);
//         localStorage.setItem('user', JSON.stringify(user));
        
//         dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: { user } });
//         toast.success('Login successful!');
        
//         return { success: true, requiresTwoFactor: false };
//       }
//     } catch (error) {
//       const message = error.response?.data?.message || 'Login failed';
//       toast.error(message);
//       return { success: false, error: message };
//     } finally {
//       dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
//     }
//   };

//   // Verify two-factor authentication
//   const verifyTwoFactor = async (otp) => {
//     try {
//       dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
//       const response = await authAPI.verifyTwoFactor({ 
//         userId: state.tempUserId, 
//         otp 
//       });
      
//       const { accessToken, refreshToken, user } = response.data.data;
      
//       // Store tokens and user data
//       localStorage.setItem('accessToken', accessToken);
//       localStorage.setItem('refreshToken', refreshToken);
//       localStorage.setItem('user', JSON.stringify(user));
      
//       dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: { user } });
//       toast.success('Two-factor authentication successful!');
      
//       return { success: true };
//     } catch (error) {
//       const message = error.response?.data?.message || '2FA verification failed';
//       toast.error(message);
//       return { success: false, error: message };
//     } finally {
//       dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
//     }
//   };

//   // Request password reset
//   const requestPasswordReset = async (email) => {
//     try {
//       const response = await authAPI.requestPasswordReset({ email });
//       toast.success(response.data.message);
//       return { success: true };
//     } catch (error) {
//       const message = error.response?.data?.message || 'Failed to send reset email';
//       toast.error(message);
//       return { success: false, error: message };
//     }
//   };

//   // Reset password
//   const resetPassword = async (email, otp, password) => {
//     try {
//       const response = await authAPI.resetPassword({ email, otp, password });
//       toast.success(response.data.message);
//       return { success: true };
//     } catch (error) {
//       const message = error.response?.data?.message || 'Password reset failed';
//       toast.error(message);
//       return { success: false, error: message };
//     }
//   };

//   // Update profile
//   const updateProfile = async (profileData) => {
//     try {
//       const response = await authAPI.updateProfile(profileData);
//       const updatedUser = response.data.data;
      
//       // Update local storage
//       localStorage.setItem('user', JSON.stringify(updatedUser));
      
//       dispatch({ type: AUTH_ACTIONS.UPDATE_USER, payload: updatedUser });
//       toast.success('Profile updated successfully!');
      
//       return { success: true, data: updatedUser };
//     } catch (error) {
//       const message = error.response?.data?.message || 'Profile update failed';
//       toast.error(message);
//       return { success: false, error: message };
//     }
//   };

//   // Change password
//   const changePassword = async (currentPassword, newPassword) => {
//     try {
//       const response = await authAPI.changePassword({ currentPassword, newPassword });
//       toast.success(response.data.message);
//       return { success: true };
//     } catch (error) {
//       const message = error.response?.data?.message || 'Password change failed';
//       toast.error(message);
//       return { success: false, error: message };
//     }
//   };

//   // Toggle two-factor authentication
//   const toggleTwoFactor = async (enabled) => {
//     try {
//       const response = await authAPI.toggleTwoFactor({ enabled });
      
//       // Update user preferences
//       const updatedUser = {
//         ...state.user,
//         preferences: {
//           ...state.user.preferences,
//           twoFactorAuth: enabled,
//         },
//       };
      
//       localStorage.setItem('user', JSON.stringify(updatedUser));
//       dispatch({ type: AUTH_ACTIONS.UPDATE_USER, payload: updatedUser });
      
//       toast.success(response.data.message);
//       return { success: true };
//     } catch (error) {
//       const message = error.response?.data?.message || '2FA toggle failed';
//       toast.error(message);
//       return { success: false, error: message };
//     }
//   };

//   // Logout function
//   const logout = async () => {
//     try {
//       await authAPI.logout();
//     } catch (error) {
//       console.error('Logout error:', error);
//     } finally {
//       // Clear local storage
//       localStorage.removeItem('accessToken');
//       localStorage.removeItem('refreshToken');
//       localStorage.removeItem('user');
      
//       dispatch({ type: AUTH_ACTIONS.LOGOUT });
//       toast.success('Logged out successfully');
//     }
//   };

//   // Clear 2FA state
//   const clear2FA = () => {
//     dispatch({ type: AUTH_ACTIONS.CLEAR_2FA });
//   };

//   const value = {
//     ...state,
//     register,
//     verifyEmail,
//     resendVerificationOTP,
//     login,
//     verifyTwoFactor,
//     requestPasswordReset,
//     resetPassword,
//     updateProfile,
//     changePassword,
//     toggleTwoFactor,
//     logout,
//     clear2FA,
//   };

//   return (
//     <AuthContext.Provider value={value}>
//       {children}
//     </AuthContext.Provider>
//   );
// };

// // Custom hook to use auth context
// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (!context) {
//     throw new Error('useAuth must be used within an AuthProvider');
//   }
//   return context;
// };

// export default AuthContext;


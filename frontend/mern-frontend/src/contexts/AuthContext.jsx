import React, { createContext, useContext, useEffect, useReducer } from 'react';
import toast from 'react-hot-toast';
import { authAPI } from '../lib/api';

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  requiresTwoFactor: false,
  tempUserId: null,
};

const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_REQUIRES_2FA: 'LOGIN_REQUIRES_2FA',
  LOGOUT: 'LOGOUT',
  UPDATE_USER: 'UPDATE_USER',
  CLEAR_2FA: 'CLEAR_2FA',
};

const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        requiresTwoFactor: false,
        tempUserId: null,
      };
    case AUTH_ACTIONS.LOGIN_REQUIRES_2FA:
      return {
        ...state,
        requiresTwoFactor: true,
        tempUserId: action.payload.userId,
        isLoading: false,
      };
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        requiresTwoFactor: false,
        tempUserId: null,
      };
    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
    case AUTH_ACTIONS.CLEAR_2FA:
      return {
        ...state,
        requiresTwoFactor: false,
        tempUserId: null,
      };
    default:
      return state;
  }
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
  const checkAuth = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      return;
    }

    try {
      const response = await authAPI.getProfile();
      const user = response.data.data.user;

      dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: { user } });
    } catch (error) {
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  };

  checkAuth();
}, []);

  const register = async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      const response = await authAPI.register(userData);

      toast.success(response.data.message);
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  };

  const verifyEmail = async (email, otp) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      const response = await authAPI.verifyEmail({ email, otp });
      const { accessToken, user } = response.data.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('user', JSON.stringify(user));

      dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: { user } });
      toast.success('Email verified successfully!');

      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Email verification failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  };

  const resendVerificationOTP = async (email) => {
    try {
      const response = await authAPI.resendVerification({ email });
      toast.success(response.data.message);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to resend OTP';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const login = async (email, password) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

      const response = await authAPI.login({ email, password });
      const { accessToken, user, requiresTwoFactor, userId } = response.data.data;

      if (requiresTwoFactor) {
        dispatch({
          type: AUTH_ACTIONS.LOGIN_REQUIRES_2FA,
          payload: { userId: userId || user.id || user._id },
        });

        toast.success('Verification code sent to your email');
        return { success: true, requiresTwoFactor: true };
      }

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('user', JSON.stringify(user));

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user },
      });

      toast.success(`Welcome back, ${user.firstName}!`);
      return { success: true, requiresTwoFactor: false };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      return { success: false, error: message };
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  };

  const verifyTwoFactor = async (otp) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      const response = await authAPI.verifyTwoFactor({
        userId: state.tempUserId,
        otp,
      });

      const { accessToken, user } = response.data.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('user', JSON.stringify(user));

      dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: { user } });
      toast.success('Two-factor authentication successful!');

      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || '2FA verification failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  };

  const requestPasswordReset = async (email) => {
    try {
      const response = await authAPI.requestPasswordReset({ email });
      toast.success(response.data.message);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send reset email';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const resetPassword = async (email, otp, password) => {
    try {
      const response = await authAPI.resetPassword({ email, otp, password });
      toast.success(response.data.message);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Password reset failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      const updatedUser = response.data.data?.user || response.data.data;

      localStorage.setItem('user', JSON.stringify(updatedUser));

      dispatch({ type: AUTH_ACTIONS.UPDATE_USER, payload: updatedUser });
      toast.success('Profile updated successfully!');

      return { success: true, data: updatedUser };
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await authAPI.changePassword({ currentPassword, newPassword });
      toast.success(response.data.message);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Password change failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const toggleTwoFactor = async (enabled) => {
    try {
      const response = await authAPI.toggleTwoFactor({ enabled });

      const updatedUser = {
        ...state.user,
        preferences: {
          ...state.user.preferences,
          twoFactorAuth: enabled,
        },
      };

      localStorage.setItem('user', JSON.stringify(updatedUser));
      dispatch({ type: AUTH_ACTIONS.UPDATE_USER, payload: updatedUser });

      toast.success(response.data.message);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || '2FA toggle failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');

      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      toast.success('Logged out successfully');
    }
  };

  const clear2FA = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_2FA });
  };

  const value = {
    ...state,
    register,
    verifyEmail,
    resendVerificationOTP,
    login,
    verifyTwoFactor,
    requestPasswordReset,
    resetPassword,
    updateProfile,
    changePassword,
    toggleTwoFactor,
    logout,
    clear2FA,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

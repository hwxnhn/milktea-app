import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    EMAIL: '',
    MAT_KHAU: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // TỰ ĐỘNG TẢI FACEBOOK SDK KHI VÀO TRANG
  useEffect(() => {
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: '27612180421814128',
        cookie: true,
        xfbml: true,
        version: 'v18.0',
      });
    };

    if (!document.getElementById('facebook-jssdk')) {
      const js = document.createElement('script');
      js.id = 'facebook-jssdk';
      js.src = 'https://connect.facebook.net/en_US/sdk.js';
      document.body.appendChild(js);
    }
  }, []);

  // 1. XỬ LÝ NHẬP FORM
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 2. XỬ LÝ ĐĂNG NHẬP EMAIL/SĐT & MẬT KHẨU
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await axiosClient.post('/auth/login', formData);
      if (res.data.success) {
        login(res.data.user, res.data.token);
        if (res.data.user?.VAITRO === 'ADMIN' || res.data.user?.VAITRO === 'NHAN_VIEN') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  // 3. XỬ LÝ GOOGLE LOGIN
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await axiosClient.post('/google', {
          accessToken: tokenResponse.access_token,
        });

        if (res.data.success) {
          login(res.data.user, res.data.token);
          if (res.data.user?.VAITRO === 'ADMIN' || res.data.user?.VAITRO === 'NHAN_VIEN') {
            navigate('/admin');
          } else {
            navigate('/');
          }
        }
      } catch (error) {
        console.error('Lỗi Google Auth:', error.response?.data?.message || error.message);
        setErrorMessage(error.response?.data?.message || 'Đăng nhập Google thất bại!');
      }
    },
    onError: () => setErrorMessage('Đăng nhập Google thất bại!'),
  });

  // 4. XỬ LÝ FACEBOOK LOGIN
  const handleFacebookLogin = () => {
    if (!window.FB) {
      setErrorMessage('Facebook SDK chưa tải xong hoặc bị chặn bởi AdBlocker. Vui lòng thử lại!');
      return;
    }

    window.FB.login(
      (response) => {
        if (response.authResponse?.accessToken) {
          axiosClient
            .post('/facebook', {
              accessToken: response.authResponse.accessToken,
            })
            .then((res) => {
              if (res.data.success) {
                login(res.data.user, res.data.token);
                if (res.data.user?.VAITRO === 'ADMIN' || res.data.user?.VAITRO === 'NHAN_VIEN') {
                  navigate('/admin');
                } else {
                  navigate('/');
                }
              }
            })
            .catch((error) => {
              console.error('Lỗi Facebook Auth:', error.response?.data?.message || error.message);
              setErrorMessage(error.response?.data?.message || 'Đăng nhập Facebook thất bại!');
            });
        }
      },
      { scope: 'email,public_profile' }
    );
  };

  return (
    <div className="bg-[#f9f9f9] text-[#1a1c1c] min-h-screen max-w-[390px] mx-auto relative overflow-hidden flex flex-col shadow-2xl border border-gray-200">
      {/* Top App Bar - Đã xóa nút arrow_back */}
      <header className="flex items-center justify-center px-4 h-14 w-full absolute top-0 z-50 bg-[#873e23]">
        <h1 className="text-lg text-white font-bold tracking-wide">Milk Tea Express</h1>
      </header>

      {/* Main Container */}
      <form onSubmit={handleEmailLogin} className="flex-grow pt-20 px-4 pb-36 flex flex-col overflow-y-auto">
        {/* Brand Aesthetic Area */}
        <div className="mb-6 text-center">
          <div className="w-20 h-20 bg-[#873e23]/20 rounded-full mx-auto mb-4 flex items-center justify-center overflow-hidden">
            <img
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDiRLXU5yxzIfmXjHKApNdF145vIcicx4HjYEnIiAefuQIhG6pO1zOeSAMcSBOFZTPq-YWGKlqgyvm8kdgnp4dcV8mKyyCUJ9TIXBam3cW7P1Fbd9IXLfcbylMzr_ltGmBTT-oius25CFCn9QK_jF3AXaA94U7XcWLLlIeQBWRGUS7a13DPeJxf-bBBoac-1rGJEFNeZrPJwasAIRXiUv5DzPGe_-vz3WFu8PtplZyM8w1BhGgBQq9P6w"
              alt="Milk Tea Express"
            />
          </div>
          <h2 className="text-2xl font-bold text-[#1a1c1c] mb-1">Welcome Back</h2>
          <p className="text-sm text-[#51443a]">Log in to start your tea journey</p>
        </div>

        {/* Thông báo lỗi nếu có */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs text-center font-medium">
            {errorMessage}
          </div>
        )}

        {/* Login Form Section */}
        <div className="space-y-4">
          {/* Email or Phone Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#51443a] ml-1" htmlFor="login-id">
              Email or Phone Number
            </label>
            <div className="relative">
              <input
                id="login-id"
                type="text"
                name="EMAIL"
                required
                value={formData.EMAIL}
                onChange={handleInputChange}
                autoComplete="username"
                placeholder="Enter your contact info"
                className="w-full h-14 px-4 bg-[#f3f3f3] border border-[#d5c3b6] rounded-xl text-base focus:border-[#873e23] transition-all duration-200 outline-none pr-12"
              />
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[#837469]">
                contact_mail
              </span>
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center px-1">
              <label className="text-xs font-medium text-[#51443a]" htmlFor="password">
                Password
              </label>
              <button type="button" className="text-xs font-medium text-[#873e23] hover:underline">
                Forgot?
              </button>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="MAT_KHAU"
                required
                value={formData.MAT_KHAU}
                onChange={handleInputChange}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full h-14 px-4 bg-[#f3f3f3] border border-[#d5c3b6] rounded-xl text-base focus:border-[#873e23] transition-all duration-200 outline-none pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#837469]"
              >
                <span className="material-symbols-outlined">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Social Quick Login Section */}
          <div className="pt-2 flex flex-col items-center space-y-3">
            <div className="flex items-center w-full space-x-4 opacity-50 my-1">
              <div className="h-px bg-[#d5c3b6] flex-grow"></div>
              <span className="text-xs uppercase tracking-widest text-[#837469]">or continue with</span>
              <div className="h-px bg-[#d5c3b6] flex-grow"></div>
            </div>

            {/* 1. NÚT GOOGLE */}
            <button
              type="button"
              onClick={() => handleGoogleLogin()}
              className="w-full h-12 flex items-center justify-center border border-[#d5c3b6] rounded-xl bg-white hover:bg-[#f3f3f3] transition-colors active:scale-[0.98]"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span className="text-sm font-medium">Google Account</span>
            </button>

            {/* 2. NÚT FACEBOOK */}
            <button
              type="button"
              onClick={handleFacebookLogin}
              className="w-full h-12 flex items-center justify-center border border-[#d5c3b6] rounded-xl bg-white hover:bg-[#f3f3f3] transition-colors active:scale-[0.98]"
            >
              <svg className="w-5 h-5 mr-3" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span className="text-sm font-medium">Facebook Account</span>
            </button>
          </div>
        </div>

        {/* Fixed Bottom CTA */}
        <footer className="fixed bottom-0 left-0 right-0 p-4 bg-[#f9f9f9] shadow-[0_-8px_24px_rgba(0,0,0,0.05)] max-w-[390px] mx-auto z-40 border-t border-gray-100">
          <div className="space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-[#FF8C00] text-white rounded-xl text-base font-bold shadow-lg shadow-[#FF8C00]/30 active:scale-[0.97] transition-all flex items-center justify-center hover:bg-[#e07b00] disabled:bg-gray-400"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
            <p className="text-center text-sm text-[#51443a]">
              Don't have an account?{' '}
              <Link to="/register" className="text-[#FF8C00] font-bold hover:underline">
                Create Account
              </Link>
            </p>
          </div>
        </footer>
      </form>
    </div>
  );
}
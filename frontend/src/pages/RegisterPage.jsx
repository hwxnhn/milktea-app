import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

export default function RegisterPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    TEN: '',
    EMAIL: '',
    SDT: '',
    MAT_KHAU: '',
  });

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', msg: '' });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // XỬ LÝ ĐĂNG KÝ EMAIL / SĐT
  const handleRegister = async (e) => {
    e.preventDefault();

    if (!agreeTerms) {
      setStatusMsg({ type: 'error', msg: 'Vui lòng đồng ý với Điều khoản & Chính sách.' });
      return;
    }

    setIsLoading(true);
    setStatusMsg({ type: '', msg: '' });

    try {
      const response = await axiosClient.post('/register', formData);
      if (response.data.success) {
        setStatusMsg({ type: 'success', msg: 'Đăng ký thành công! Đang chuyển hướng đến Đăng nhập...' });
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setStatusMsg({ type: 'error', msg: response.data.message || 'Đăng ký thất bại.' });
      }
    } catch (error) {
      console.error('Lỗi đăng ký:', error.message);
      setStatusMsg({
        type: 'error',
        msg: error.response?.data?.message || 'Có lỗi xảy ra khi đăng ký!',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#e5e5e5] text-[#1a1c1c] font-sans antialiased flex flex-col items-center justify-start w-full overflow-x-hidden min-h-screen">
      {/* Mobile Frame Constraint */}
      <div className="w-full max-w-[390px] mx-auto bg-[#f9f9f9] relative flex flex-col shadow-2xl overflow-hidden min-h-screen border border-gray-200">
        
        {/* Header */}
        <header className="w-full top-0 sticky z-50 bg-[#f9f9f9] flex items-center justify-between px-4 h-14 border-b border-gray-100">
          <button
            type="button"
            onClick={() => navigate('/login')}
            aria-label="Go back"
            className="h-10 w-10 flex items-center justify-start text-[#873e23] active:scale-95 transition-transform hover:opacity-80"
          >
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold text-[#873e23] truncate flex-1 text-center">Milk Tea Express</h1>
          <div className="h-10 w-10"></div>
        </header>

        {/* Main Content Canvas */}
        <main className="flex-1 overflow-y-auto px-4 pb-12">
          {/* Brand Illustration / Header */}
          <div className="flex flex-col items-center justify-center pt-6 pb-4">
            <div className="w-20 h-20 rounded-full bg-[#873e23]/20 flex items-center justify-center mb-4 overflow-hidden shadow-sm">
              <img
                alt="Milk Tea Illustration"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDLBYZhdpzm8YG70g7Yjd2OFWYn2peMx6Ztmg_jm8nYYlmkW3mAGJeTF6Ci3v9x97zyJsn7FEDPfI2Cv3iIwJ3lrHLzVqAPbxTBmiQDYmU3CntrLIyXHoV0cHVj51gQZQ7RSDY8xhPfHXHCDHrFRACkBwU9DvxyPYe0QJHQQ2uCJ4JF3Zv2-axMDubYfrv-WkFzCbdm3KHa04p19I1BnubxgbS2W-wBnpcJYJHAISSh4KzRLEQAiIPh1w"
              />
            </div>
            <h2 className="text-2xl font-bold text-[#1a1c1c] text-center mb-1">Join Our Tea Journey</h2>
            <p className="text-sm text-[#51443a] text-center max-w-[280px]">Create an account to start earning rewards</p>
          </div>

          {/* Alert Status Message */}
          {statusMsg.msg && (
            <div
              className={`p-3 mb-4 rounded-xl text-center text-xs font-medium border ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-[#873e23]'
                  : 'bg-red-50 border-red-200 text-red-600'
              }`}
            >
              {statusMsg.msg}
            </div>
          )}

          {/* Form Fields */}
          <form onSubmit={handleRegister} className="flex flex-col gap-3.5 mt-1">
            {/* Full Name */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-[#837469] text-xl">person</span>
              </div>
              <input
                name="TEN"
                value={formData.TEN}
                onChange={handleInputChange}
                className="w-full h-12 pl-12 pr-4 bg-white border border-[#d5c3b6] rounded-xl text-sm text-[#1a1c1c] focus:border-[#873e23] outline-none transition-colors"
                placeholder="Full Name"
                required
                type="text"
                disabled={isLoading}
              />
            </div>

            {/* Email */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-[#837469] text-xl">mail</span>
              </div>
              <input
                name="EMAIL"
                value={formData.EMAIL}
                onChange={handleInputChange}
                className="w-full h-12 pl-12 pr-4 bg-white border border-[#d5c3b6] rounded-xl text-sm text-[#1a1c1c] focus:border-[#873e23] outline-none transition-colors"
                placeholder="Email Address"
                required
                type="email"
                disabled={isLoading}
              />
            </div>

            {/* Phone Number */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-[#837469] text-xl">phone</span>
              </div>
              <input
                name="SDT"
                value={formData.SDT}
                onChange={handleInputChange}
                className="w-full h-12 pl-12 pr-4 bg-white border border-[#d5c3b6] rounded-xl text-sm text-[#1a1c1c] focus:border-[#873e23] outline-none transition-colors"
                placeholder="Phone Number"
                required
                type="tel"
                disabled={isLoading}
              />
            </div>

            {/* Password */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-[#837469] text-xl">lock</span>
              </div>
              <input
                name="MAT_KHAU"
                value={formData.MAT_KHAU}
                onChange={handleInputChange}
                className="w-full h-12 pl-12 pr-12 bg-white border border-[#d5c3b6] rounded-xl text-sm text-[#1a1c1c] focus:border-[#873e23] outline-none transition-colors"
                placeholder="Password"
                required
                type={showPassword ? 'text' : 'password'}
                disabled={isLoading}
              />
              <button
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#837469] hover:text-[#873e23] transition-colors"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
              >
                <span className="material-symbols-outlined text-xl">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start mt-1">
              <div className="flex items-center h-5">
                <input
                  id="terms"
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 border-[#d5c3b6] rounded focus:ring-[#873e23] text-[#873e23] accent-[#873e23] cursor-pointer"
                />
              </div>
              <label className="ml-2.5 text-xs text-[#51443a] leading-tight" htmlFor="terms">
                I agree to the{' '}
                <span className="text-[#873e23] font-semibold underline cursor-pointer">Terms & Conditions</span> and{' '}
                <span className="text-[#873e23] font-semibold underline cursor-pointer">Privacy Policy</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-4 w-full h-12 bg-[#FF8C00] text-white font-bold text-sm rounded-xl flex items-center justify-center active:scale-95 transition-transform shadow-md hover:bg-[#e07b00] disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : 'Sign Up'}
            </button>
          </form>

          {/* Footer Link */}
          <div className="text-center pt-8 pb-4">
            <span className="text-xs text-[#51443a]">You have an account? </span>
            <Link to="/login" className="text-xs font-bold text-[#873e23] hover:underline">
              Sign in
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
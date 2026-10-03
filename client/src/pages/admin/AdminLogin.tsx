import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api } from '../../lib/api';
import { User } from '../../lib/types';
import { useAuth } from '../../context/AuthContext';

export default function AdminLogin() {
  const { user, isLoading, login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="container-sadra py-20 text-center text-sm text-stone-500">در حال بررسی...</div>
    );
  }

  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('نام کاربری و رمز عبور را وارد کنید.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{ token: string; user: User }>('/admin/auth/login', {
        username: username.trim(),
        password,
      });
      if (res.data) {
        login(res.data.token, res.data.user);
        navigate('/admin', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ورود ناموفق بود.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-16">
      <Helmet>
        <title>ورود مدیر | چولفیش کت</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="w-full max-w-md px-4">
        <div className="border border-stone-100 bg-white p-8 ">
          <div className="text-center">
            <img src="/logo-mark.png" alt="چولفیش کت" className="mx-auto h-14 w-14 object-cover" />
            <h1 className="mt-4 text-xl font-black">ورود به پنل مدیریت</h1>
            <p className="mt-1.5 text-sm text-stone-500">با نام کاربری و رمز عبور وارد شوید</p>
          </div>

          {error && <p className="mt-4 bg-red-50 p-3 text-sm text-red-600">{error}</p>}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label">نام کاربری</label>
              <input
                type="text"
                dir="ltr"
                autoComplete="username"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input text-left"
              />
            </div>
            <div>
              <label className="label">رمز عبور</label>
              <input
                type="password"
                dir="ltr"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input text-left"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full !py-3.5">
              {loading ? 'در حال ورود...' : 'ورود به پنل'}
            </button>
          </form>

          <div className="mt-6 border-t border-stone-100 pt-5 text-center">
            <Link to="/" className="text-sm text-stone-500 hover:text-black">
              ← بازگشت به فروشگاه
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

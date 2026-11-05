import { Link } from 'react-router-dom';
import Seo from '../components/Seo';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center py-16">
      <Seo
        title="صفحه یافت نشد (۴۰۴) | CAVERO"
        description="صفحه‌ای که به دنبال آن هستید وجود ندارد یا جابه‌جا شده است. از فروشگاه کت و شلوار مردانه CAVERO دیدن کنید."
        path="/404"
        noindex
      />
      <div className="text-center">
        <p className="text-6xl font-black text-stone-200">۴۰۴</p>
        <h1 className="mt-3 text-2xl font-black">صفحه مورد نظر یافت نشد</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-stone-600">
          صفحه‌ای که دنبال آن هستید وجود ندارد یا جابجا شده است.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link to="/" className="btn-primary">
            بازگشت به خانه
          </Link>
          <Link to="/shop" className="btn-outline">
            کت و شلوار مردانه
          </Link>
        </div>
      </div>
    </div>
  );
}

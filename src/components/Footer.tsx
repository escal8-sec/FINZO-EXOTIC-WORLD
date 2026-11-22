import { Instagram, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../context/CatalogContext';
import { useRouter } from '../context/RouterContext';
import { buildWhatsAppDirectUrl } from '../lib/whatsapp';
import { FinzoLogoMark } from './Navbar';
import { Reveal } from './Reveal';

export function Footer() {
  const { navigate } = useRouter();
  const { isAdmin } = useAuth();
  const { isUsingDemoFallback, storeSettings } = useCatalog();

  const igHandleClean = storeSettings.instagramHandle.replace(/^@/, '');

  return (
    <footer className="border-t border-white/10 bg-[#030811]">
      <div className="gold-hairline h-px w-full opacity-60" aria-hidden="true" />
      <Reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          {/* Brand Column */}
          <div className="space-y-4 lg:col-span-1">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2.5 text-left cursor-pointer group"
            >
              <span className="transition-transform duration-300 group-hover:rotate-6">
                <FinzoLogoMark logoUrl={storeSettings.logoUrl} />
              </span>
              <span className="font-display text-xl font-semibold tracking-[0.12em] text-white group-hover:text-cyan-200 transition-colors">
                {storeSettings.storeName}
              </span>
            </button>
            <p className="text-sm text-amber-200/85 italic font-display text-lg">
              “{storeSettings.tagline}”
            </p>
            <p className="text-sm text-slate-400 leading-relaxed">
              Curated exotic ornamental fish, architectural rimless aquariums, and precision biological ecosystems crafted for discerning collectors.
            </p>
          </div>

          {/* Collections */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white tracking-wide font-sans">
              Collections
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/fish')}
                  className="hover:text-cyan-300 hover:translate-x-0.5 transition-all cursor-pointer"
                >
                  Exotic Fish Collection
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/aquariums')}
                  className="hover:text-cyan-300 hover:translate-x-0.5 transition-all cursor-pointer"
                >
                  Rimless Aquariums &amp; Hardware
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/custom-aquarium')}
                  className="text-cyan-300 hover:text-cyan-200 hover:translate-x-0.5 transition-all cursor-pointer"
                >
                  Build Your Custom Aquarium
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/care')}
                  className="hover:text-cyan-300 hover:translate-x-0.5 transition-all cursor-pointer"
                >
                  Fish Care &amp; Water Mastery
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/cart')}
                  className="hover:text-cyan-300 hover:translate-x-0.5 transition-all cursor-pointer"
                >
                  Shopping Cart &amp; Checkout
                </button>
              </li>
            </ul>
          </div>

          {/* Atelier & Support */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white tracking-wide font-sans">
              Atelier &amp; Support
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/about')}
                  className="hover:text-cyan-300 hover:translate-x-0.5 transition-all cursor-pointer"
                >
                  About {storeSettings.storeName}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/contact')}
                  className="hover:text-cyan-300 hover:translate-x-0.5 transition-all cursor-pointer"
                >
                  Contact &amp; Private Consultations
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/account')}
                  className="hover:text-cyan-300 hover:translate-x-0.5 transition-all cursor-pointer"
                >
                  Collector Account &amp; Orders
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate(isAdmin ? '/admin/dashboard' : '/admin/login')}
                  className="text-amber-300/90 hover:text-amber-200 hover:translate-x-0.5 transition-all cursor-pointer"
                >
                  {isAdmin ? 'Admin Studio Dashboard' : 'Administrator Login'}
                </button>
              </li>
            </ul>
          </div>

          {/* Direct Channels */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white tracking-wide font-sans">
              Connect With Us
            </h3>
            <div className="space-y-2.5">
              <a
                href={`https://instagram.com/${igHandleClean}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 text-sm text-slate-300 hover:text-cyan-300 transition-colors"
              >
                <Instagram className="w-4 h-4 text-amber-300/80" />
                <span>{storeSettings.instagramHandle}</span>
              </a>
              <a
                href={buildWhatsAppDirectUrl(
                  storeSettings.whatsappNumber,
                  `Hello ${storeSettings.storeName}, I would like to connect with an aquatic specialist.`
                )}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 text-sm text-slate-300 hover:text-cyan-300 transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-cyan-300" />
                <span>WhatsApp · {storeSettings.whatsappNumber}</span>
              </a>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed pt-1">
              {storeSettings.businessAddress}
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              {isUsingDemoFallback
                ? 'Demo Showcase Active: Sign in as administrator to publish live catalog data.'
                : 'Live Cloud Storefront: Products, pricing, delivery rules & custom aquariums sync live.'}
            </p>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} {storeSettings.storeName}. All rights reserved.</p>
          <p className="text-slate-400">
            Exotic Ornamental Fish · Custom Aquariums · {storeSettings.instagramHandle}
          </p>
        </div>
      </Reveal>
    </footer>
  );
}

'use client';

import { useEffect, useState } from 'react';
import BookingModal from './components/BookingModal';
import LoginModal from './components/LoginModal';
import { checkTokenValidity } from '@/lib/tokenUtils';

// Hero slideshow component — five distinct shots, not repeats of the same two
const heroImages = [
  {
    src: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    alt: "Professional cleaning team at work"
  },
  {
    src: "https://images.unsplash.com/photo-1556911220-bff31c812dba?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    alt: "Sparkling clean modern kitchen"
  },
  {
    src: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    alt: "Bright, freshly cleaned living room"
  },
  {
    src: "https://images.unsplash.com/photo-1563453392212-326f5e854473?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    alt: "Cleaning supplies and professional equipment"
  },
  {
    src: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    alt: "Spotless bathroom after a deep clean"
  }
];

function HeroSlideshow() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % heroImages.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-gradient-to-tr from-amber-300/40 via-white/0 to-white/0 rounded-3xl blur-2xl" aria-hidden="true" />
      <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/20">
        {heroImages.map((image, idx) => (
          <img
            key={image.src}
            src={image.src}
            alt={image.alt}
            className={`w-full h-72 md:h-96 lg:h-[420px] object-cover transition-opacity duration-1000 ${
              idx === current ? 'opacity-100' : 'opacity-0 absolute inset-0'
            }`}
          />
        ))}
      </div>
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
        {heroImages.map((_, idx) => (
          <span
            key={idx}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === current ? 'w-6 bg-white' : 'w-1.5 bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Already signed in with a valid session — skip straight to the dashboard
  // instead of asking for credentials again.
  const handleAdminLoginClick = () => {
    if (checkTokenValidity()) {
      window.location.href = '/admin';
    } else {
      setIsLoginModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-slate-700/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="SkyView Logo"
                className="w-11 h-11"
              />
              <div className="leading-tight">
                <p className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">SkyView</p>
                <p className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-widest -mt-0.5">Cleaning Services</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#services" className="relative text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:bg-indigo-600 after:transition-all hover:after:w-full">Services</a>
              <a href="#contact" className="relative text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:bg-indigo-600 after:transition-all hover:after:w-full">Contact</a>
              <button
                onClick={handleAdminLoginClick}
                className="text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-slate-600 px-5 py-2 rounded-full hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                Admin Login
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="text-sm font-semibold bg-indigo-600 dark:bg-indigo-500 text-white px-6 py-2.5 rounded-full shadow-sm shadow-indigo-600/30 hover:bg-indigo-700 dark:hover:bg-indigo-600 hover:shadow-md hover:shadow-indigo-600/40 hover:-translate-y-0.5 transition-all"
              >
                Book Now
              </button>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="md:hidden text-sm font-semibold bg-indigo-600 text-white px-4 py-2 rounded-full"
            >
              Book Now
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 dark:from-indigo-800 dark:via-indigo-900 dark:to-violet-900 text-white">
        {/* Decorative glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-400/20 rounded-full blur-3xl" aria-hidden="true" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-indigo-400/20 rounded-full blur-3xl" aria-hidden="true" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
                <span className="flex h-2 w-2 rounded-full bg-amber-400" />
                <span className="text-xs font-semibold tracking-wide uppercase text-indigo-50">Trusted by 5,000+ Pune homes</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                A spotless home,<br className="hidden sm:block" /> without lifting a finger
              </h1>
              <p className="text-lg lg:text-xl mb-9 text-indigo-100 dark:text-indigo-200 max-w-xl">
                From deep cleans to regular upkeep, our trained team brings hotel-grade results to every room — booked in minutes, done on your schedule.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-white text-indigo-700 px-8 py-3.5 rounded-full font-semibold hover:bg-amber-50 shadow-lg shadow-black/10 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                  Book Your Cleaning
                </button>
                <a
                  href="#services"
                  className="border border-white/40 text-white px-8 py-3.5 rounded-full font-semibold hover:bg-white/10 hover:border-white transition-colors text-center"
                >
                  Explore Services
                </a>
              </div>
              <div className="flex items-center gap-6 mt-10 text-sm text-indigo-100">
                <div className="flex items-center gap-1.5">
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="font-semibold text-white">4.8/5</span>
                  <span>(2,847 reviews)</span>
                </div>
                <div className="h-4 w-px bg-white/20" />
                <span>Insured &amp; bonded team</span>
              </div>
            </div>
            <div className="relative">
              <HeroSlideshow />
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 lg:py-24 bg-gray-50 dark:bg-slate-800 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">What we offer</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mt-3 mb-4">
              Our Cleaning Services
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Comprehensive cleaning solutions tailored to your space and schedule
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Deep Cleaning */}
            <div className="group bg-white dark:bg-slate-700 rounded-2xl shadow-sm hover:shadow-xl overflow-hidden transition-all duration-300 hover:-translate-y-1">
              <div className="relative overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1556911220-bff31c812dba?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                  alt="Professional deep cleaning service"
                  className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4 w-11 h-11 bg-white dark:bg-slate-800 rounded-full shadow-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Deep Cleaning</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm leading-relaxed">
                  Comprehensive cleaning that reaches every corner, perfect for move-in/move-out or seasonal deep cleans.
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                  {['Kitchen deep cleaning', 'Bathroom sanitization', 'Floor and carpet cleaning', 'Window and glass cleaning'].map(item => (
                    <li key={item} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Regular Cleaning */}
            <div className="group bg-white dark:bg-slate-700 rounded-2xl shadow-sm hover:shadow-xl overflow-hidden transition-all duration-300 hover:-translate-y-1">
              <div className="relative overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                  alt="Professional regular cleaning service"
                  className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4 w-11 h-11 bg-white dark:bg-slate-800 rounded-full shadow-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">General Cleaning</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm leading-relaxed">
                  Maintain a clean and healthy environment with our general cleaning services.
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                  {['Weekly/bi-weekly cleaning', 'Surface dusting and wiping', 'Vacuuming and mopping', 'Bathroom maintenance'].map(item => (
                    <li key={item} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Specialized Cleaning */}
            <div className="group bg-white dark:bg-slate-700 rounded-2xl shadow-sm hover:shadow-xl overflow-hidden transition-all duration-300 hover:-translate-y-1">
              <div className="relative overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                  alt="Professional specialized cleaning service"
                  className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4 w-11 h-11 bg-white dark:bg-slate-800 rounded-full shadow-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Specialized Services</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm leading-relaxed">
                  Specialized cleaning for unique needs and occasions.
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                  {['Post-construction cleaning', 'Carpet and upholstery', 'Window and glass cleaning', 'Oven and appliance cleaning'].map(item => (
                    <li key={item} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 lg:py-24 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Why SkyView</span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mt-3 mb-8">
                Cleaning you can trust, every single time
              </h2>
              <div className="space-y-7">
                {[
                  {
                    title: 'Professional Team',
                    desc: 'Trained and experienced cleaning professionals',
                    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8zm6 0a4 4 0 10-8 0" />
                  },
                  {
                    title: 'Eco-Friendly Products',
                    desc: 'Safe and environmentally friendly cleaning solutions',
                    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3c-4 4-7 8-7 11a7 7 0 0014 0c0-3-3-7-7-11z" />
                  },
                  {
                    title: 'Satisfaction Guaranteed',
                    desc: '100% satisfaction guarantee on all our services',
                    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  },
                ].map(item => (
                  <div key={item.title} className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-11 h-11 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {item.icon}
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                      <p className="text-gray-600 dark:text-gray-300">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
                alt="Professional cleaning team working efficiently"
                className="rounded-2xl shadow-2xl w-full"
              />
              <div className="absolute -bottom-6 -left-6 bg-white dark:bg-slate-800 rounded-xl shadow-xl px-5 py-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">4.8/5</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">2,847 reviews</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-24 bg-gradient-to-br from-indigo-600 to-violet-700 dark:from-indigo-700 dark:to-violet-900 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-5">
            Ready to Transform Your Space?
          </h2>

          <p className="text-xl mb-10 text-indigo-100 dark:text-indigo-200 max-w-3xl mx-auto">
            Book your cleaning service today and experience the difference professional cleaning makes. We&apos;ve proudly served over 5,000 customers, most of whom rate us 4.5 stars or higher.
          </p>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center items-center gap-4 mb-12">
            <div className="flex items-center space-x-2 bg-white/10 rounded-full px-4 py-2">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">100% Satisfaction</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/10 rounded-full px-4 py-2">
              <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Insured & Bonded</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/10 rounded-full px-4 py-2">
              <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Eco-Friendly</span>
            </div>
          </div>

          {/* Customer Testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12 max-w-4xl mx-auto">
            <div className="bg-white/10 dark:bg-white/5 rounded-2xl p-6 backdrop-blur-sm border border-white/10 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 hover:bg-white/20 dark:hover:bg-white/10">
              <div className="flex items-center mb-3">
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
              <p className="text-sm text-indigo-100 dark:text-indigo-200 mb-3">"Amazing service! My apartment looks brand new. The team was professional and thorough."</p>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-indigo-400 rounded-full flex items-center justify-center mr-3">
                  <span className="text-xs font-bold">P</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">Priya Sharma</p>
                  <p className="text-xs text-indigo-200">Pune, Maharashtra</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 dark:bg-white/5 rounded-2xl p-6 backdrop-blur-sm border border-white/10 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 hover:bg-white/20 dark:hover:bg-white/10">
              <div className="flex items-center mb-3">
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
              <p className="text-sm text-indigo-100 dark:text-indigo-200 mb-3">"Best cleaning service in Pune! They cleaned my entire house in just 3 hours. Highly recommended!"</p>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-indigo-400 rounded-full flex items-center justify-center mr-3">
                  <span className="text-xs font-bold">R</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">Rajni Shivpuje</p>
                  <p className="text-xs text-indigo-200">Pune, Maharashtra</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 dark:bg-white/5 rounded-2xl p-6 backdrop-blur-sm border border-white/10 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 hover:bg-white/20 dark:hover:bg-white/10">
              <div className="flex items-center mb-3">
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
              <p className="text-sm text-indigo-100 dark:text-indigo-200 mb-3">"Professional, punctual, and perfect results. My office has never looked cleaner!"</p>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-indigo-400 rounded-full flex items-center justify-center mr-3">
                  <span className="text-xs font-bold">A</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">Anjali Patel</p>
                  <p className="text-xs text-indigo-200">Pune, Maharashtra</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-400 mb-1">5,000+</div>
              <div className="text-sm text-indigo-200">Happy Customers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-400 mb-1">10,000+</div>
              <div className="text-sm text-indigo-200">Cleanings Done</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-400 mb-1">4.8★</div>
              <div className="text-sm text-indigo-200">Average Rating</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-400 mb-1">24/7</div>
              <div className="text-sm text-indigo-200">Support</div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="space-y-4">
          <button
            onClick={() => setIsModalOpen(true)}
              className="bg-white text-indigo-700 px-9 py-4 rounded-full font-semibold hover:bg-amber-50 transition-all duration-300 text-lg shadow-xl shadow-black/10 hover:shadow-2xl transform hover:-translate-y-1"
          >
            Book Your Cleaning Now
          </button>
            <p className="text-sm text-indigo-200 dark:text-indigo-300">
              ⚡ Instant booking &nbsp;·&nbsp; 🎯 Same day service available &nbsp;·&nbsp; 💰 No hidden fees
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 lg:py-24 bg-gray-50 dark:bg-slate-800 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Get in touch</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mt-3 mb-4">
              We&apos;d love to hear from you
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Reach out for a free quote or to schedule your cleaning service
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center bg-white dark:bg-slate-700 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-indigo-600 dark:bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Phone</h3>
              <p className="text-gray-600 dark:text-gray-300">+91 9623029057</p>
            </div>
            <div className="text-center bg-white dark:bg-slate-700 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-indigo-600 dark:bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Email</h3>
              <p className="text-gray-600 dark:text-gray-300 break-all">skyviewcleaningservices@gmail.com</p>
            </div>
            <div className="text-center bg-white dark:bg-slate-700 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-indigo-600 dark:bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Service Area</h3>
              <p className="text-gray-600 dark:text-gray-300">All Pune City</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src="/logo.png" alt="SkyView Logo" className="w-10 h-10" />
                <span className="text-xl font-bold">SkyView</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                Professional cleaning solutions for your home and office, trusted across Pune since day one.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-widest text-slate-300 mb-4">Quick Links</h4>
              <div className="flex flex-col gap-2.5 text-sm">
                <a href="#services" className="text-slate-400 hover:text-white transition-colors w-fit">Services</a>
                <a href="#contact" className="text-slate-400 hover:text-white transition-colors w-fit">Contact</a>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-widest text-slate-300 mb-4">Legal</h4>
              <div className="flex flex-col gap-2.5 text-sm">
                <a href="#" className="text-slate-400 hover:text-white transition-colors w-fit">Privacy Policy</a>
                <a href="#" className="text-slate-400 hover:text-white transition-colors w-fit">Terms of Service</a>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-slate-500 text-sm">
              © {new Date().getFullYear()} SkyView Cleaning Services. All rights reserved.
            </p>
            <p className="text-slate-500 text-sm">Made with care in Pune, Maharashtra</p>
          </div>
        </div>
      </footer>

      {/* Booking Modal */}
      <BookingModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      
      {/* Login Modal */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={(token, user) => {
          // Redirect to admin dashboard
          window.location.href = '/admin';
        }}
      />
    </div>
  );
}

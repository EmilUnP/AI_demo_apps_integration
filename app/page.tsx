import ChatButton from './components/ChatButton';
import Hyperspeed from './components/Hyperspeed';

export default function Home() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Decorative animated blobs */}
      <div className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full blur-3xl opacity-40 bg-animated-gradient" />
      <div className="pointer-events-none absolute top-1/3 -right-24 h-80 w-80 rounded-full blur-3xl opacity-40 bg-animated-gradient" />
      {/* Başlıq */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/50 shadow-lg">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <a href="/" className="text-2xl font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
              Demo Səhifə
            </a>
            <div className="flex gap-6 items-center">
              <a href="#features" className="text-slate-300 hover:text-indigo-300 transition-colors relative group">
                Xüsusiyyətlər
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-indigo-400 group-hover:w-full transition-all duration-300"></span>
              </a>
              <a href="/assistants" className="text-slate-300 hover:text-indigo-300 transition-colors relative group">
                Köməkçilər
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-indigo-400 group-hover:w-full transition-all duration-300"></span>
              </a>
              <a href="/eduspace-integration" className="text-slate-300 hover:text-indigo-300 transition-colors relative group">
                EduSpace Integration
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-indigo-400 group-hover:w-full transition-all duration-300"></span>
              </a>
              <a href="#how" className="text-slate-300 hover:text-indigo-300 transition-colors relative group">
                Haqqında
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-indigo-400 group-hover:w-full transition-all duration-300"></span>
              </a>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Bölməsi */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="relative">
          <div className="absolute -inset-6 bg-gradient-to-br from-indigo-200/40 via-purple-200/40 to-blue-200/40 rounded-3xl blur-3xl opacity-70 animate-float-slow" />
          <div className="relative bg-slate-900 rounded-3xl shadow-xl border border-slate-800 overflow-hidden ring-gradient noise-overlay grid-overlay">
            <div className="w-full h-[420px] md:h-[520px] lg:h-[600px]">
              <Hyperspeed />
            </div>

            {/* Overlay content on top of animation */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full px-6 sm:px-10 lg:px-14 text-center">
                <div className="spotlight">
                  <h1 className="relative text-4xl sm:text-5xl lg:text-6xl font-extrabold mt-4 mb-4 leading-tight text-animated-gradient">
                  Bu sizin saytınız ola bilər!
          </h1>
                </div>
                <p className="mx-auto max-w-3xl text-base sm:text-lg lg:text-xl text-slate-200 mb-6">
                  Bu səhifə chat vidjetinizi necə görünüb işlədiyini nümayiş etdirmək üçün hazırlanıb. Sağ altda olan
                  düyməyə klikləyin və canlı söhbəti sınaqdan keçirin.
                </p>
                <div className="pointer-events-auto flex flex-wrap gap-4 justify-center">
                  <a href="#how" className="group bg-indigo-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-indigo-700 transition-all duration-300 btn-glow btn-hover-motion shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/40 flex items-center gap-2">
                    <span>Necə İşləyir?</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </a>
                  <a href="#features" className="bg-slate-900/80 backdrop-blur text-indigo-300 px-8 py-4 rounded-xl font-semibold border-2 border-slate-700 hover:bg-slate-800 hover:border-indigo-500/50 transition-all duration-300 btn-glow btn-hover-motion flex items-center gap-2">
                    <span>Xüsusiyyətlər</span>
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Xüsusiyyətlər Bölməsi */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-100 mb-4">
            Niyə Bu Dəmo Faydalıdır?
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Güclü xüsusiyyətlər və asan istifadə ilə chat vidjetinizi dərhal inteqrasiya edin
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="group bg-slate-900/80 backdrop-blur p-8 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 animate-fade-in-up border border-slate-800 hover:border-indigo-500/50 card-hover-lift">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 bg-indigo-500/15 ring-1 ring-indigo-500/30 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-transform duration-300">
              <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-3 group-hover:text-indigo-300 transition-colors">Sürətli inteqrasiya</h3>
            <p className="text-slate-300 leading-relaxed">
              Hazır vidjetlə bir neçə dəqiqəyə saytınıza söhbət əlavə edin. Minimum konfiqurasiya, maksimum nəticə.
            </p>
          </div>

          <div className="group bg-slate-900/80 backdrop-blur p-8 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 animate-fade-in-up border border-slate-800 hover:border-emerald-500/50 card-hover-lift" style={{ animationDelay: '80ms' }}>
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 bg-emerald-500/15 ring-1 ring-emerald-500/30 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-transform duration-300">
              <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-3 group-hover:text-emerald-300 transition-colors">Təhlükəsiz və etibarlı</h3>
            <p className="text-slate-300 leading-relaxed">
              Mövcud sistemlərinizlə təhlükəsiz şəkildə işləyir, məlumatlarınız qorunur və şifrələnir.
            </p>
          </div>

          <div className="group bg-slate-900/80 backdrop-blur p-8 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 animate-fade-in-up border border-slate-800 hover:border-cyan-500/50 card-hover-lift" style={{ animationDelay: '160ms' }}>
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 bg-cyan-500/15 ring-1 ring-cyan-500/30 group-hover:scale-110 group-hover:bg-cyan-500/20 transition-transform duration-300">
              <svg className="w-7 h-7 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-3 group-hover:text-cyan-300 transition-colors">24/7 dəstək</h3>
            <p className="text-slate-300 leading-relaxed">
              Komandamız suallarınızı cavablandırmağa və inteqrasiya zamanı kömək etməyə hazırdır.
            </p>
          </div>
        </div>
      </section>

      {/* Necə işləyir */}
      <section id="how" className="bg-slate-900/60 border-y border-slate-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl font-extrabold text-slate-100 mb-6">Necə işləyir?</h2>
              <p className="text-lg text-slate-300 leading-relaxed">
                Səhifənin sağ aşağı hissəsindəki üzən söhbət düyməsinə klikləyin. Vidjet dərhal açılacaq və əsas tətbiqinizdəki söhbət interfeysini göstərəcək.
              </p>
              <ul className="space-y-4 text-slate-300">
                <li className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                    <span className="text-indigo-400 font-bold">1</span>
                  </div>
                  <span className="text-lg">Düyməyə klikləyin</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                    <span className="text-indigo-400 font-bold">2</span>
                  </div>
                  <span className="text-lg">Vidjet açılır</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                    <span className="text-indigo-400 font-bold">3</span>
                  </div>
                  <span className="text-lg">Canlı söhbəti sınaqdan keçirin</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-indigo-800 via-purple-700 to-indigo-900 rounded-2xl p-10 text-white shadow-2xl border border-indigo-500/20">
              <h3 className="text-3xl font-bold mb-8">İnteqrasiya üstünlükləri</h3>
              <ul className="space-y-5">
                <li className="flex items-start group">
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center mr-4 group-hover:bg-white/30 transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-lg leading-relaxed">Tez quraşdırma, minimum dəyişiklik</span>
                </li>
                <li className="flex items-start group">
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center mr-4 group-hover:bg-white/30 transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-lg leading-relaxed">Mövcud UI-dan istifadə</span>
                </li>
                <li className="flex items-start group">
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center mr-4 group-hover:bg-white/30 transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-lg leading-relaxed">Mobil və masaüstü uyğunluğu</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      

      {/* Aşağılıq */}
      <footer className="bg-slate-950 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Demo Səhifə</h3>
              <p className="text-slate-400">
                Chat vidjetinin canlı nümayişi üçün sadə sayt.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Məhsul</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#features" className="hover:text-white transition">Xüsusiyyətlər</a></li>
                <li><a href="#how" className="hover:text-white transition">Necə işləyir</a></li>
                <li><a href="/eduspace-integration" className="hover:text-white transition">EduSpace Integration</a></li>
                <li><a href="#contact" className="hover:text-white transition">Əlaqə</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Şirkət</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#about" className="hover:text-white transition">Haqqında</a></li>
                <li><a href="#" className="hover:text-white transition">Bloq</a></li>
                <li><a href="#" className="hover:text-white transition">Karyera</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Dəstək</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition">Kömək Mərkəzi</a></li>
                <li><a href="#contact" className="hover:text-white transition">Əlaqə</a></li>
                <li><a href="#" className="hover:text-white transition">Status</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-slate-400">
            <p>&copy; 2025 Demo Səhifə. Bütün hüquqlar qorunur.</p>
          </div>
        </div>
      </footer>

      {/* Üzən Söhbət Düyməsi */}
      <ChatButton />
    </div>
  )
}


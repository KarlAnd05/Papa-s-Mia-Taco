import { menuData } from "@/data/menu";
import { Link } from "wouter";
import { Show } from "@clerk/react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="font-serif text-3xl font-bold tracking-tighter text-primary">
            PMT
          </div>
          <div className="flex items-center gap-6 text-sm font-medium tracking-wide">
            <a href="#menu" className="hover:text-primary transition-colors uppercase">Menu</a>
            <a href="#about" className="hover:text-primary transition-colors uppercase">About</a>
            <Show when="signed-out">
              <Link href="/sign-in" className="text-muted-foreground hover:text-foreground transition-colors uppercase text-xs">
                Staff Login
              </Link>
            </Show>
            <Show when="signed-in">
              <Link href="/admin" className="text-primary hover:text-primary/80 transition-colors uppercase text-xs flex items-center gap-2 border border-primary/30 px-3 py-1.5 rounded-full">
                Dashboard
              </Link>
            </Show>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-20 overflow-hidden">
        {/* We use a realistic generated image for the hero background via CSS */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40 scale-105"
          style={{ backgroundImage: "url('/attached_assets/generated_images/hero-bg.jpg')" }}
        />
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-background via-transparent to-transparent" />
        
        <div className="relative z-20 max-w-6xl mx-auto px-6 w-full flex flex-col items-start text-left mt-20">
          <div className="inline-block px-3 py-1 mb-6 rounded-full border border-primary/30 text-primary text-xs font-semibold tracking-widest uppercase bg-primary/10 backdrop-blur-sm">
            Est. 2024 • Montreal
          </div>
          <h1 className="font-serif text-6xl md:text-8xl lg:text-[10rem] leading-[0.9] font-bold tracking-tight text-white mb-6">
            REAL <span className="text-primary italic">STREET</span><br />
            TACOS
          </h1>
          <p className="text-xl md:text-2xl text-foreground/80 max-w-2xl font-light leading-relaxed mb-10 border-l-2 border-primary pl-6">
            Street-food energy meets refined hospitality. Dark vibes, warm lights, and a menu that makes you hungry just reading it.
          </p>
          <a 
            href="#menu" 
            className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-background bg-primary overflow-hidden rounded-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="relative z-10 tracking-widest uppercase text-sm">Explore Menu</span>
            <div className="absolute inset-0 h-full w-full scale-0 rounded-sm transition-all duration-300 ease-out group-hover:scale-100 group-hover:bg-white/20"></div>
          </a>
        </div>
      </section>

      {/* Menu Section */}
      <section id="menu" className="relative z-20 py-32 bg-background bg-[url('/attached_assets/generated_images/pattern.png')] bg-repeat">
        <div className="absolute inset-0 bg-background/90" />
        <div className="relative max-w-5xl mx-auto px-6">
          <div className="text-center mb-24">
            <h2 className="font-serif text-5xl md:text-7xl font-bold text-white mb-4">The Menu</h2>
            <div className="w-24 h-1 bg-primary mx-auto"></div>
          </div>

          <div className="space-y-32">
            {menuData.map((section) => (
              <div key={section.category} className="scroll-mt-32" id={section.category.toLowerCase().replace(/\s+/g, '-')}>
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4 border-b border-white/10 pb-4">
                  <h3 className="font-serif text-4xl text-primary font-bold tracking-wide">
                    {section.category}
                  </h3>
                  
                  {(section.callout || section.boost) && (
                    <div className="text-right flex-1 max-w-xl">
                      {section.callout && (
                        <p className="text-white font-medium text-sm tracking-wide uppercase bg-primary/20 px-3 py-1.5 rounded inline-block mb-2">
                          {section.callout}
                        </p>
                      )}
                      {section.boost && (
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          <strong className="text-foreground">Boost:</strong> {section.boost.replace(/Boost:/i, '')}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                  {section.items.map((item) => (
                    <div key={item.name} className="group relative flex flex-col">
                      <div className="flex justify-between items-baseline gap-4 mb-2">
                        <h4 className="text-xl font-bold text-white group-hover:text-primary transition-colors flex items-center gap-3">
                          {item.name}
                          {item.isNew && (
                            <span className="px-2 py-0.5 text-[10px] uppercase tracking-widest font-bold bg-primary text-background rounded-sm">
                              New
                            </span>
                          )}
                        </h4>
                        <div className="flex-1 border-b border-dotted border-white/20 mx-4 opacity-50 relative top-[-6px]"></div>
                        <span className="text-xl font-serif text-primary font-bold">
                          ${item.price.toFixed(2).replace(/\.00$/, '')}
                        </span>
                      </div>
                      
                      {item.desc && (
                        <p className="text-muted-foreground text-sm leading-relaxed mb-2 font-light">
                          {item.desc}
                        </p>
                      )}
                      
                      {item.note && (
                        <p className="text-xs font-medium text-primary/80 uppercase tracking-wide mt-1">
                          {item.note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-[#0a0604] border-t border-white/5 pt-20 pb-10 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 relative z-10 flex flex-col md:flex-row justify-between items-start gap-12">
          <div className="max-w-xs">
            <div className="font-serif text-4xl font-bold tracking-tighter text-primary mb-6">
              PMT
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed mb-8">
              A sleek, modern taqueria in Montreal. Real street tacos, zero compromises. Come hungry.
            </p>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-primary hover:border-primary transition-colors cursor-pointer">
                Ig
              </div>
              <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-primary hover:border-primary transition-colors cursor-pointer">
                Fb
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-12 text-sm">
            <div>
              <h5 className="text-white font-bold tracking-widest uppercase mb-6 text-xs">Hours</h5>
              <ul className="space-y-3 text-muted-foreground">
                <li>Mon - Thu: 11am - 10pm</li>
                <li>Fri - Sat: 11am - 12am</li>
                <li>Sunday: 12pm - 9pm</li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-bold tracking-widest uppercase mb-6 text-xs">Visit</h5>
              <ul className="space-y-3 text-muted-foreground">
                <li>1234 Saint-Laurent Blvd</li>
                <li>Montreal, QC</li>
                <li>(514) 555-TACO</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto px-6 mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} PMT Mexican Restaurant. All rights reserved.</p>
          <Show when="signed-out">
            <Link href="/sign-in" className="hover:text-primary transition-colors">Staff Login</Link>
          </Show>
          <Show when="signed-in">
            <Link href="/admin" className="hover:text-primary transition-colors">Admin Dashboard</Link>
          </Show>
        </div>
        
        {/* Massive background text */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[15rem] font-serif font-bold text-white/[0.02] whitespace-nowrap pointer-events-none select-none z-0">
          PMT TACOS
        </div>
      </footer>
    </div>
  );
}
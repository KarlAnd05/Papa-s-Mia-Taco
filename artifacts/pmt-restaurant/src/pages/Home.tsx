import React from "react";
import { menuData, MenuSection } from "@/data/menu";
import { Link } from "wouter";
import { Show } from "@clerk/react";

function PapelPicadoBorder({ invert = false }: { invert?: boolean }) {
  const colors = invert 
    ? ['#F4AA1C', '#0F5D2F', '#A71F29', '#0F5D2F', '#F4AA1C', '#0F5D2F', '#A71F29', '#0F5D2F'] 
    : ['#0F5D2F', '#F4AA1C', '#A71F29', '#F4AA1C', '#0F5D2F', '#A71F29', '#F4AA1C', '#0F5D2F'];
  const triangleW = 50;
  const triangleH = 32;
  const count = 30; // enough to fill any width
  return (
    <div className="w-full overflow-hidden" style={{ height: triangleH + 8 }}>
      <svg width={triangleW * count} height={triangleH + 8} style={{ display: 'block' }}>
        {Array.from({ length: count }).map((_, i) => (
          <polygon
            key={i}
            points={`${i * triangleW},0 ${(i + 1) * triangleW},0 ${i * triangleW + triangleW / 2},${triangleH}`}
            fill={colors[i % colors.length]}
          />
        ))}
        {/* thin rope line */}
        <line x1="0" y1="4" x2={triangleW * count} y2="4" stroke="#222" strokeWidth="1.5" opacity="0.3" />
      </svg>
    </div>
  );
}

function WaveDivider({ color = '#0F5D2F', flip = false }: { color?: string, flip?: boolean }) {
  return (
    <div style={{ lineHeight: 0, transform: flip ? 'scaleY(-1)' : undefined }}>
      <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 60 }}>
        <path d="M0,30 C240,60 480,0 720,30 C960,60 1200,0 1440,30 L1440,60 L0,60 Z" fill={color} />
      </svg>
    </div>
  );
}

function ScallopedEdge({ fill = '#F8F5EF', bg = '#0F5D2F' }: { fill?: string, bg?: string }) {
  const n = 40;
  const r = 20;
  const w = n * r * 2;
  const h = r;
  const d = Array.from({ length: n }).map((_, i) =>
    `A ${r} ${r} 0 0 1 ${(i + 1) * r * 2} 0`
  ).join(' ');
  return (
    <div style={{ background: bg, lineHeight: 0 }}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 24 }}>
        <path d={`M0,0 ${d} L${w},0 L${w},${h} L0,${h} Z`} fill={fill} />
      </svg>
    </div>
  );
}

function BoostBox({ text }: { text: string }) {
  return (
    <div style={{
      background: '#0F5D2F',
      border: '3px dashed #F4AA1C',
      borderRadius: 16,
      padding: '16px 20px',
      margin: '12px 0',
    }}>
      <p style={{ color: '#F4AA1C', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
        Boost Your Meal
      </p>
      <p style={{ color: '#FFCA5F', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{text}</p>
    </div>
  );
}

const HEADING_COLORS = ['#0F5D2F', '#A71F29', '#F4AA1C'];

function SectionHeading({ text, index }: { text: string, index: number }) {
  const color = HEADING_COLORS[index % 3];
  return (
    <div className="text-center mb-8">
      <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 900, color, lineHeight: 1, letterSpacing: '-0.02em', fontStyle: 'italic' }}>
        {text}
      </h2>
      {/* Zigzag underline */}
      <svg viewBox="0 0 200 12" style={{ width: 200, height: 12, display: 'block', margin: '8px auto 0' }}>
        <polyline points="0,10 10,2 20,10 30,2 40,10 50,2 60,10 70,2 80,10 90,2 100,10 110,2 120,10 130,2 140,10 150,2 160,10 170,2 180,10 190,2 200,10" fill="none" stroke={color} strokeWidth="2.5" />
      </svg>
    </div>
  );
}

const SECTION_IMAGES: Record<string, { src: string, border: string }> = {
  "Appetizers": { src: "/images/appetizers.jpg", border: "6px solid #F8F5EF" },
  "Tacos": { src: "/images/tacos.jpg", border: "6px solid #0F5D2F" },
  "Burritos": { src: "/images/burritos.jpg", border: "6px solid #A71F29" },
  "Burrito Bowls": { src: "/images/burrito-bowl.jpg", border: "6px solid #F4AA1C" },
  "Salads & Shakers": { src: "/images/salads.jpg", border: "6px solid #0F5D2F" },
  "Quesadillas": { src: "/images/quesadillas.jpg", border: "6px solid #A71F29" },
  "The Taco Bar": { src: "/images/taco-bar.jpg", border: "6px solid #F4AA1C" },
  "Dessert": { src: "/images/churros.jpg", border: "6px solid #A71F29" },
};

function MenuItemCard({ item }: { item: any }) {
  return (
    <div className="relative flex flex-col mb-6">
      <div className="flex justify-between items-baseline gap-2 mb-1">
        <h4 className="text-[1rem] font-bold text-[#222222] flex items-center gap-2">
          {item.name}
          {item.isNew && (
            <span className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-bold bg-[#A71F29] text-white rounded-sm">
              New
            </span>
          )}
        </h4>
        <div className="flex-1 border-b-[2px] border-dotted border-[#222222]/20 mx-2 opacity-50 relative top-[-4px]"></div>
        <span className="text-[1rem] font-extrabold text-[#0F5D2F] whitespace-nowrap">
          ${item.price.toFixed(2).replace(/\.00$/, '')}
        </span>
      </div>
      
      {item.desc && (
        <p className="text-[#555555] text-[0.85rem] leading-relaxed font-normal mb-1">
          {item.desc}
        </p>
      )}
      
      {item.note && (
        <p className="text-[0.75rem] font-medium text-[#0F5D2F] italic tracking-wide">
          {item.note}
        </p>
      )}
    </div>
  );
}

export default function Home() {
  const sectionsWithImages = menuData.filter(s => s.category !== 'Dips & Sides' && s.category !== 'Drinks' && s.category !== 'The Taco Bar');
  const theTacoBar = menuData.find(s => s.category === 'The Taco Bar');
  const dipsAndSides = menuData.find(s => s.category === 'Dips & Sides');
  const drinks = menuData.find(s => s.category === 'Drinks');

  return (
    <div className="min-h-screen bg-[#F8F5EF] text-[#222222] font-sans selection:bg-[#0F5D2F] selection:text-white">
      {/* Top Border */}
      <div className="absolute top-0 left-0 right-0 z-50">
        <PapelPicadoBorder />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#F8F5EF]/95 backdrop-blur-md border-b-2 border-[#0F5D2F] mt-[40px] shadow-sm transition-all duration-300">
        <div className="max-w-6xl mx-auto px-6 h-[72px] flex items-center justify-between">
          <div className="font-serif text-3xl font-bold tracking-tighter text-[#0F5D2F]">
            PMT
          </div>
          <div className="flex items-center gap-6 text-sm font-semibold tracking-wide">
            <a href="#menu" className="hover:text-[#0F5D2F] transition-colors uppercase">Menu</a>
            <a href="#about" className="hover:text-[#0F5D2F] transition-colors uppercase">About</a>
            <Link href="/feedback" className="text-[#A71F29] hover:text-[#A71F29]/80 transition-colors uppercase text-xs font-bold border-2 border-[#A71F29] px-4 py-1.5 rounded-full">
              Leave Feedback
            </Link>
            <Show when="signed-out">
              <Link href="/sign-in" className="text-muted-foreground hover:text-[#0F5D2F] transition-colors uppercase text-xs font-bold">
                Staff Login
              </Link>
            </Show>
            <Show when="signed-in">
              <Link href="/admin" className="text-[#0F5D2F] hover:text-[#0F5D2F]/80 transition-colors uppercase text-xs flex items-center gap-2 border-2 border-[#0F5D2F] px-4 py-1.5 rounded-full font-bold">
                Dashboard
              </Link>
            </Show>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[95vh] flex items-center justify-center pt-28 pb-10 overflow-hidden bg-[#222]">
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-60 scale-105"
          style={{ backgroundImage: "url('/images/hero.jpg')" }}
        />
        {/* Dark green gradient overlay */}
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#0F5D2F]/80 via-[#0F5D2F]/40 to-transparent mix-blend-multiply" />
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#111]/60 via-transparent to-transparent" />
        
        <div className="relative z-20 max-w-6xl mx-auto px-6 w-full flex flex-col items-center text-center mt-10">
          <div className="inline-block mb-4 text-[#F4AA1C] text-sm font-bold tracking-[0.2em] uppercase">
            Est. 2024 · Montreal
          </div>
          <h1 className="font-serif text-5xl md:text-7xl lg:text-[7rem] leading-[1] font-black tracking-tight text-white mb-6 italic drop-shadow-lg">
            Authentic Mexican <br /> Street Food
          </h1>
          <p className="text-xl md:text-2xl text-[#F8F5EF] max-w-2xl font-light leading-relaxed mb-10 drop-shadow-md">
            Made with love, served with fire.
          </p>
          <a 
            href="#menu" 
            className="group relative inline-flex items-center justify-center px-10 py-5 font-bold text-white bg-[#0F5D2F] rounded-full transition-transform hover:scale-[1.05] active:scale-[0.98] shadow-xl"
          >
            <span className="relative z-10 tracking-widest uppercase text-[0.9rem]">See Our Menu</span>
          </a>
        </div>
      </section>

      {/* Inverted Papel Picado */}
      <div className="-mt-[40px] relative z-30">
        <PapelPicadoBorder invert />
      </div>

      {/* Menu Section */}
      <section id="menu" className="relative z-20 bg-[#F8F5EF] pt-20 pb-32">
        <div className="max-w-6xl mx-auto">
          
          {sectionsWithImages.map((section, idx) => {
            const isEven = idx % 2 === 0;
            const imgData = SECTION_IMAGES[section.category];
            
            return (
              <React.Fragment key={section.category}>
                <div className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-12 px-6 py-20`}>
                  
                  {/* Image Column */}
                  <div className="w-full md:w-1/2 flex justify-center">
                    {imgData && (
                      <div className="relative w-full max-w-md aspect-[4/5] rounded-[32px] overflow-hidden shadow-2xl" style={{ border: imgData.border }}>
                        <img src={imgData.src} alt={section.category} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  {/* Content Column */}
                  <div className="w-full md:w-1/2">
                    <SectionHeading text={section.category} index={idx} />
                    
                    {section.callout && (
                      <div className="bg-[#A71F29] text-white text-center text-sm font-bold tracking-wider uppercase px-4 py-2 rounded-lg mb-8 shadow-md">
                        {section.callout}
                      </div>
                    )}

                    {section.boost && (
                      <BoostBox text={section.boost.replace(/Boost:/i, '')} />
                    )}

                    <div className="mt-8 flex flex-col gap-2">
                      {section.items.map((item) => (
                        <MenuItemCard key={item.name} item={item} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Divider between sections (don't show after the last one before Taco Bar) */}
                {idx < sectionsWithImages.length - 1 && (
                  idx % 2 === 0 
                    ? <WaveDivider color="#0F5D2F" /> 
                    : <ScallopedEdge bg="#F8F5EF" fill="#A71F29" />
                )}
              </React.Fragment>
            );
          })}
          
        </div>
      </section>

      <WaveDivider color="#0F5D2F" flip />

      {/* The Taco Bar Section */}
      {theTacoBar && (
        <section className="bg-[#0F5D2F] py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="w-full md:w-1/2 text-white">
                <h2 className="font-serif text-5xl md:text-7xl font-black italic mb-6 text-[#F4AA1C]">
                  {theTacoBar.category}
                </h2>
                {theTacoBar.items.map(item => (
                  <div key={item.name} className="mb-8">
                    <h3 className="text-2xl font-bold mb-4">{item.name}</h3>
                    <p className="text-lg text-white/90 leading-relaxed mb-8">{item.desc}</p>
                    <div className="flex items-end gap-4">
                      <span className="text-6xl font-black text-[#F4AA1C]">${item.price.toFixed(2).replace(/\.00$/, '')}</span>
                      <span className="text-lg font-bold bg-[#A71F29] px-4 py-2 rounded-full mb-2 uppercase tracking-wide">Serves 15 Tacos</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="w-full md:w-1/2">
                <div className="w-full rounded-[32px] overflow-hidden shadow-2xl aspect-video" style={{ border: '6px solid #F4AA1C' }}>
                  <img src={SECTION_IMAGES['The Taco Bar']?.src} alt="The Taco Bar" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <ScallopedEdge bg="#0F5D2F" fill="#F8F5EF" />

      {/* Dips & Sides + Drinks */}
      <section className="py-24 bg-[#F8F5EF]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex flex-col md:flex-row gap-16 md:gap-24">
            
            {/* Dips & Sides */}
            {dipsAndSides && (
              <div className="flex-1">
                <div className="text-center mb-10">
                  <h2 className="font-serif text-4xl font-bold text-[#A71F29] italic mb-4">{dipsAndSides.category}</h2>
                  <svg viewBox="0 0 100 8" style={{ width: 100, height: 8, display: 'block', margin: '0 auto' }}>
                    <polyline points="0,6 10,2 20,6 30,2 40,6 50,2 60,6 70,2 80,6 90,2 100,6" fill="none" stroke="#A71F29" strokeWidth="2" />
                  </svg>
                </div>
                <div className="flex flex-col gap-4">
                  {dipsAndSides.items.map(item => (
                    <MenuItemCard key={item.name} item={item} />
                  ))}
                </div>
              </div>
            )}

            {/* Drinks */}
            {drinks && (
              <div className="flex-1">
                <div className="text-center mb-10">
                  <h2 className="font-serif text-4xl font-bold text-[#F4AA1C] italic mb-4">{drinks.category}</h2>
                  <svg viewBox="0 0 100 8" style={{ width: 100, height: 8, display: 'block', margin: '0 auto' }}>
                    <polyline points="0,6 10,2 20,6 30,2 40,6 50,2 60,6 70,2 80,6 90,2 100,6" fill="none" stroke="#F4AA1C" strokeWidth="2" />
                  </svg>
                </div>
                <div className="flex flex-col gap-4">
                  {drinks.items.map(item => (
                    <MenuItemCard key={item.name} item={item} />
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-32 bg-[#F8F5EF] relative border-t-[8px] border-[#0F5D2F] border-dashed">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-serif text-4xl md:text-6xl font-black text-[#0F5D2F] mb-8 italic">
            Family-Made. <br /> Street-Fresh.
          </h2>
          <p className="text-xl md:text-2xl text-[#222222] font-medium leading-relaxed max-w-2xl mx-auto mb-16">
            A vibrant, modern taqueria in Montreal. Real street tacos, zero compromises. We bring the heat, the flavor, and the energy. Come hungry.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-[24px] shadow-lg border-2 border-[#F4AA1C]">
              <div className="text-4xl mb-4">🌮</div>
              <h3 className="font-bold text-lg mb-2 uppercase tracking-wide">15 Tacos / Taco Bar</h3>
              <p className="text-sm text-[#555]">Perfect for sharing, built exactly your way.</p>
            </div>
            <div className="bg-white p-8 rounded-[24px] shadow-lg border-2 border-[#A71F29]">
              <div className="text-4xl mb-4">🥑</div>
              <h3 className="font-bold text-lg mb-2 uppercase tracking-wide">Fresh Daily</h3>
              <p className="text-sm text-[#555]">Guac mashed fresh, salsa made from scratch.</p>
            </div>
            <div className="bg-white p-8 rounded-[24px] shadow-lg border-2 border-[#0F5D2F]">
              <div className="text-4xl mb-4">🍁</div>
              <h3 className="font-bold text-lg mb-2 uppercase tracking-wide">Montreal-Made</h3>
              <p className="text-sm text-[#555]">Local love meets authentic Mexican street food.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-[#0F5D2F] pt-20 pb-10 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 z-10">
           <svg viewBox="0 0 1440 30" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 30, transform: 'scaleY(-1)' }}>
              <path d="M0,15 C240,30 480,0 720,15 C960,30 1200,0 1440,15 L1440,30 L0,30 Z" fill="#F8F5EF" />
           </svg>
        </div>

        <div className="max-w-6xl mx-auto px-6 relative z-10 flex flex-col md:flex-row justify-between items-start gap-12 pt-8">
          <div className="max-w-xs">
            <div className="font-serif text-5xl font-bold tracking-tighter text-[#F4AA1C] mb-6 italic">
              PMT
            </div>
            <p className="text-[#F8F5EF] text-sm leading-relaxed mb-8 font-medium">
              Made with love, served with fire.
            </p>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-[#F4AA1C] flex items-center justify-center text-[#F4AA1C] hover:bg-[#F4AA1C] hover:text-[#0F5D2F] transition-colors cursor-pointer font-bold text-sm">
                Ig
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-[#F4AA1C] flex items-center justify-center text-[#F4AA1C] hover:bg-[#F4AA1C] hover:text-[#0F5D2F] transition-colors cursor-pointer font-bold text-sm">
                Fb
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-12 text-sm">
            <div>
              <h5 className="text-[#F4AA1C] font-black tracking-widest uppercase mb-6 text-xs">Hours</h5>
              <ul className="space-y-3 text-[#F8F5EF] font-medium">
                <li>Mon - Thu: 11am - 10pm</li>
                <li>Fri - Sat: 11am - 12am</li>
                <li>Sunday: 12pm - 9pm</li>
              </ul>
            </div>
            <div>
              <h5 className="text-[#F4AA1C] font-black tracking-widest uppercase mb-6 text-xs">Visit</h5>
              <ul className="space-y-3 text-[#F8F5EF] font-medium">
                <li>1234 Saint-Laurent Blvd</li>
                <li>Montreal, QC</li>
                <li>(514) 555-TACO</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto px-6 mt-20 pt-8 border-t-2 border-[#F8F5EF]/20 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-[#F8F5EF]/60">
          <p>© {new Date().getFullYear()} PMT Mexican Restaurant. All rights reserved.</p>
          <Show when="signed-out">
            <Link href="/sign-in" className="hover:text-[#F4AA1C] transition-colors uppercase tracking-wider">Staff Login</Link>
          </Show>
          <Show when="signed-in">
            <Link href="/admin" className="hover:text-[#F4AA1C] transition-colors uppercase tracking-wider">Admin Dashboard</Link>
          </Show>
        </div>
      </footer>
    </div>
  );
}
